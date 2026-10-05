import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'

const pin = {
  pinHash: createHash('sha256').update('test-salt:1234').digest('hex'),
  pinSalt: 'test-salt',
  pinLength: 4,
  biometricEnabled: false,
}

async function fixtures(page: Page) {
  await page
    .context()
    .addCookies([
      { name: 'Access', value: 'test-session', url: 'http://localhost:3000' },
    ])
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const body =
      path === '/api/contingent'
        ? {
            success: true,
            firstName: 'Ученик',
            lastName: 'Тестовый',
            data: { Klass: '10F', School: { Name: { ru: 'НИШ Актау' } } },
          }
        : path === '/api/journal'
          ? [1, 2, 3, 4].map((number) => ({
              number,
              subjects: [
                { id: 'physics', name: { ru: 'Физика' }, currScore: 23.33 },
              ],
            }))
          : {
              sumChapterCriteria: [
                {
                  id: '1',
                  title: { ru: 'Физические величины и измерения' },
                  mark: '7',
                  maxMark: '15',
                },
              ],
              sumQuarterCriteria: [],
            }
    await route.fulfill({ json: body })
  })
}

async function palette(page: Page) {
  return page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundColor,
    root: getComputedStyle(document.documentElement).backgroundColor,
    inline: document.body.style.background,
    color: getComputedStyle(document.body).color,
  }))
}

test('drawer close and navigation preserve the selected page background', async ({
  page,
}) => {
  await fixtures(page)
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  await page.goto('/dash')
  await expect(page.getByText('Физика', { exact: true })).toBeVisible()
  const before = await palette(page)
  expect(before.body).toBe(before.root)
  expect(before.body).not.toBe('rgb(0, 0, 0)')
  for (let i = 0; i < 3; i++) {
    await page.getByText('Физика', { exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await palette(page)).toEqual(before)
    if (page.viewportSize()!.width < 768)
      await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
    else await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    expect(await palette(page)).toEqual(before)
  }
  await page.getByRole('link', { name: 'Настройки' }).click()
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  if (page.viewportSize()!.width < 768)
    await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  else await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(await palette(page)).toEqual(before)
  await page.context().clearCookies()
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Вход', exact: true }),
  ).toBeVisible()
  expect(await palette(page)).toEqual(before)
})

test('native shell receives light, dark and system palette from the website', async ({
  page,
}) => {
  await fixtures(page)
  await page.addInitScript((savedPin) => {
    localStorage.setItem('theme', 'light')
    localStorage.setItem(
      'pin-security',
      JSON.stringify({ state: savedPin, version: 1 }),
    )
    ;(window as any).__ADAPTION_NATIVE__ = true
    ;(window as any).__ADAPTION_PLATFORM__ = 'ios'
    ;(window as any).__messages = []
    ;(window as any).ReactNativeWebView = {
      postMessage(message: string) {
        ;(window as any).__messages.push(JSON.parse(message))
      },
    }
  }, pin)
  await page.goto('/settings')
  await expect(
    page.getByRole('heading', { name: 'Введите ПИН-код' }),
  ).toBeVisible()
  for (const digit of '1234')
    await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Светлая тема' })).toBeVisible()
  for (const [theme, name, dark] of [
    ['light', 'Светлая тема', false],
    ['dark', 'Тёмная тема', true],
    ['system', 'Системная тема', false],
  ] as const) {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.getByRole('tab', { name }).click()
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('theme')))
      .toBe(theme)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as any).__messages
              .filter((m: any) => m.type === 'appearance')
              .at(-1)?.dark,
        ),
      )
      .toBe(dark)
    await expect
      .poll(async () => {
        const colors = await palette(page)
        const nativeColor = await page.evaluate(
          () =>
            (window as any).__messages
              .filter((m: any) => m.type === 'appearance')
              .at(-1)?.backgroundColor,
        )
        return nativeColor === colors.root && colors.body === colors.root
      })
      .toBe(true)
  }
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__messages
            .filter((m: any) => m.type === 'appearance')
            .at(-1)?.dark,
      ),
    )
    .toBe(true)
  await page.evaluate(() => window.dispatchEvent(new Event('adaption:lock')))
  await expect(
    page.getByRole('heading', { name: 'Введите ПИН-код' }),
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Светлая тема' })).toBeHidden()
})

test('login has the same layout and colours in browser and native shell', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  await page.goto('/login')
  const browserTitle = await page
    .getByRole('heading', { name: 'Вход', exact: true })
    .boundingBox()
  const browserPalette = await palette(page)
  const nativePage = await context.newPage()
  await nativePage.addInitScript(() => {
    ;(window as any).__ADAPTION_NATIVE__ = true
    ;(window as any).ReactNativeWebView = { postMessage() {} }
  })
  await nativePage.goto('/login')
  await expect(
    nativePage.getByRole('heading', { name: 'Вход', exact: true }),
  ).toBeVisible()
  expect(
    await nativePage
      .getByRole('heading', { name: 'Вход', exact: true })
      .boundingBox(),
  ).toEqual(browserTitle)
  expect(await palette(nativePage)).toEqual(browserPalette)
})

test('first app login creates and confirms the PIN using the shared website screen', async ({
  page,
}) => {
  await fixtures(page)
  await page.addInitScript(() => {
    ;(window as any).__ADAPTION_NATIVE__ = true
    ;(window as any).__ADAPTION_PLATFORM__ = 'android'
    ;(window as any).__messages = []
    ;(window as any).ReactNativeWebView = {
      postMessage(message: string) {
        ;(window as any).__messages.push(JSON.parse(message))
      },
    }
  })
  await page.goto('/dash')
  await page.getByRole('button', { name: /4 цифры/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Придумайте ПИН-код' }),
  ).toBeVisible()
  for (const digit of '1234')
    await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Повторите ПИН-код' }),
  ).toBeVisible()
  for (const digit of '1234')
    await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByText('Физика', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(() =>
      (window as any).__messages.some(
        (m: any) => m.type === 'pin_sync' && m.pinLength === 4,
      ),
    ),
  ).toBe(true)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Введите ПИН-код' }),
  ).toBeVisible()
})
