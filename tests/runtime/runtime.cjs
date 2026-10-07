// @ts-nocheck -- dynamic VM modules and native host mocks are exercised at runtime.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { create, act } = require('react-test-renderer')

function loadTS(file, mocks = {}, globals = {}) {
  const filename = path.resolve(file)
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      process,
      console,
      URL,
      setTimeout,
      clearTimeout,
      require: (name) => {
        if (name in mocks) return mocks[name]
        if (name.startsWith('.'))
          return loadTS(
            path.resolve(path.dirname(filename), name + '.ts'),
            mocks,
            globals,
          )
        return require(name)
      },
      ...globals,
    },
    { filename },
  )
  return module.exports
}

async function mobile({ scheme = 'dark', storageHangs = false } = {}) {
  const timers = new Map()
  let timerId = 0
  let appState
  const injections = []
  let reloads = 0
  const WebView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: (script) => injections.push(script),
      reload: () => reloads++,
      stopLoading() {},
      postMessage() {},
    }))
    return React.createElement('WebView', props)
  })
  const mocks = {
    'react-native': {
      View: 'View',
      Text: 'Text',
      TouchableOpacity: 'TouchableOpacity',
      ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: (s) => s, absoluteFillObject: {} },
      Platform: { OS: 'ios' },
      useColorScheme: () => scheme,
      AppState: {
        addEventListener: (_, callback) => {
          appState = callback
          return { remove() {} }
        },
      },
      BackHandler: { addEventListener: () => ({ remove() {} }) },
      Linking: { openURL: async () => {} },
    },
    'react-native-webview': { WebView },
    'expo-secure-store': {
      getItemAsync: () =>
        storageHangs ? new Promise(() => {}) : Promise.resolve(null),
    },
    'expo-local-authentication': {},
    'expo-navigation-bar': {},
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
  }
  const App = loadTS('apps/mobile/app/(app)/index.tsx', mocks, {
    setTimeout: (callback, delay) => {
      timers.set(++timerId, { callback, delay })
      return timerId
    },
    clearTimeout: (id) => timers.delete(id),
  }).default
  let renderer
  await act(async () => {
    renderer = create(React.createElement(App))
  })
  return {
    renderer,
    injections,
    props: () => renderer.root.findByType('WebView').props,
    spinning: () => renderer.root.findAllByType('ActivityIndicator').length > 0,
    reloads: () => reloads,
    resume: () => appState('active'),
    advance: async (delay) => {
      await act(async () => {
        for (const [id, timer] of [...timers])
          if (timer.delay <= delay) {
            timers.delete(id)
            timer.callback()
          }
      })
    },
    ready: async () =>
      act(async () => {
        await renderer.root
          .findByType('WebView')
          .props.onMessage({
            nativeEvent: {
              url: 'https://adaption.top/settings',
              data: JSON.stringify({ type: 'app_ready' }),
            },
          })
      }),
    close: () => act(() => renderer.unmount()),
  }
}

test('iOS SPA navigation stays visible even when load-end never arrives', async () => {
  const app = await mobile()
  assert.equal(app.spinning(), true)
  await app.ready()
  assert.equal(app.spinning(), false)
  await act(async () => {
    app.props().onLoadStart()
    app
      .props()
      .onNavigationStateChange({
        url: 'https://adaption.top/settings',
        canGoBack: true,
      })
  })
  await app.advance(60000)
  assert.equal(app.spinning(), false)
  assert.equal(app.renderer.root.findAllByType('TouchableOpacity').length, 0)
  assert.equal(app.renderer.root.findByType('StatusBar').props.style, 'light')
  await act(async () => app.resume())
  assert.ok(app.injections.at(-1).includes('"reset":true'))
  app.close()
})

test('stalled initial load offers retry and retry can finish', async () => {
  const app = await mobile()
  await act(async () => app.props().onLoadStart())
  await app.advance(20000)
  assert.equal(app.spinning(), false)
  const retry = app.renderer.root.findByType('TouchableOpacity')
  await act(async () => retry.props.onPress())
  assert.equal(app.reloads(), 1)
  assert.equal(app.spinning(), true)
  await app.ready()
  assert.equal(app.spinning(), false)
  assert.equal(app.renderer.root.findAllByType('TouchableOpacity').length, 0)
  app.close()
})

test('slow secure storage cannot block creation of the WebView forever', async () => {
  const app = await mobile({ storageHangs: true })
  assert.equal(app.renderer.root.findAllByType('WebView').length, 0)
  await app.advance(1500)
  assert.equal(app.renderer.root.findAllByType('WebView').length, 1)
  assert.ok(
    app
      .props()
      .injectedJavaScript.includes("localStorage.setItem('theme', 'system')"),
  )
  app.close()
})

test('crashed web process automatically restarts at most once', async () => {
  const app = await mobile()
  await app.ready()
  await act(async () => app.props().onContentProcessDidTerminate())
  assert.equal(app.reloads(), 1)
  await app.ready()
  await act(async () => app.props().onContentProcessDidTerminate())
  assert.equal(app.reloads(), 1)
  assert.equal(app.renderer.root.findAllByType('TouchableOpacity').length, 1)
  app.close()
})

test('parallel unauthorized requests settle after refresh fails, and a later refresh can succeed', async () => {
  const axios = require('axios')
  const { http } = loadTS('src/shared/http.ts')
  const originalAdapter = axios.defaults.adapter
  let failure = true
  let authenticated = false
  let refreshes = 0
  const response = (config, status) => ({
    config,
    status,
    statusText: '',
    headers: {},
    data: {},
  })
  const adapter = async (config) => {
    if (config.url === '/api/auth/refresh') {
      refreshes++
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (failure)
        throw new axios.AxiosError(
          'expired',
          'ERR_BAD_REQUEST',
          config,
          null,
          response(config, 401),
        )
      authenticated = true
    } else if (!authenticated)
      throw new axios.AxiosError(
        'expired',
        'ERR_BAD_REQUEST',
        config,
        null,
        response(config, 401),
      )
    return response(config, 200)
  }
  http.defaults.adapter = adapter
  axios.defaults.adapter = adapter
  try {
    const failed = await Promise.race([
      Promise.allSettled([
        http.get('/api/contingent'),
        http.get('/api/journal'),
      ]),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Requests hung after refresh failure')),
          500,
        ),
      ),
    ])
    assert.equal(refreshes, 1)
    assert.ok(
      failed.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason.message === 'UNAUTHORIZED',
      ),
    )
    failure = false
    const successful = await Promise.all([
      http.get('/api/contingent'),
      http.get('/api/journal'),
    ])
    assert.equal(refreshes, 2)
    assert.ok(successful.every((result) => result.status === 200))
    assert.equal(http.defaults.timeout, 20000)
  } finally {
    axios.defaults.adapter = originalAdapter
  }
})
