'use client'

import React, { useEffect, useRef } from 'react'

const CELL = 6
const GAP = 1
const PITCH = CELL + GAP
const BORDER_OPACITY = 0.06
const DOT_PEAK_OPACITY = 0.4
const FRAME_MS = 33
const BOOT_FADE_MS = 420
const COLOR_TRANSITION_MS = 420

interface Rgb {
  r: number
  g: number
  b: number
}

/* Зоны анимации: боковые полосы + верхняя лента, центр свободен */
const SIDE_BAND_COLS = 14
const TOP_BAND_ROWS = 9

/* Жизненный цикл точки: плавный подъём → пауза → растворение */
const TRIGGER_RATE = 0.0012
const ROW_PULSE_RATE = 0.0004
const ATTACK_RATE = 0.07
const RELEASE_RATE = 0.028
const MIN_PEAK = 0.35
const MAX_PEAK = 1

/* Фейерверк по правой кнопке мыши */
const BURST_MIN_PARTICLES = 26
const BURST_MAX_PARTICLES = 38
const PARTICLE_MIN_SPEED = 30
const PARTICLE_MAX_SPEED = 140
const PARTICLE_GRAVITY = 70
const PARTICLE_DRAG = 0.35
const PARTICLE_MAX_COUNT = 420

interface Zone {
  key: string
  originX: number
  originY: number
  cols: number
  rows: number
  level: Float32Array
  vel: Float32Array
  peak: Float32Array
}

interface WorldState {
  cols: number
  rows: number
  zones: Zone[]
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  ttl: number
  bright: number
}

const parseRgbObject = (value: string): Rgb | null => {
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!match) return null
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

const lerpRgb = (from: Rgb, to: Rgb, t: number): Rgb => ({
  r: Math.round(from.r + (to.r - from.r) * t),
  g: Math.round(from.g + (to.g - from.g) * t),
  b: Math.round(from.b + (to.b - from.b) * t),
})

const snapToGrid = (value: number) => Math.round(value / PITCH) * PITCH

export default function TerminalGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fgRef = useRef('235,238,241')
  const worldRef = useRef<WorldState | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let cols = 0
    let rows = 0
    let dpr = 1
    let gridLayer: HTMLCanvasElement | null = null
    let gridOld: HTMLCanvasElement | null = null
    let gridBlendStart = -1
    let fgFrom: Rgb = { r: 235, g: 238, b: 241 }
    let fgTo: Rgb = { r: 235, g: 238, b: 241 }
    let colorStart = -1
    let particles: Particle[] = []
    let bootAt = -1
    let lastFrame = -1
    let rafId = 0
    let disposed = false

    const currentFg = (now: number): Rgb => {
      if (colorStart < 0) return fgTo
      const t = Math.min(
        (now - colorStart) / COLOR_TRANSITION_MS,
        1,
      )
      return lerpRgb(fgFrom, fgTo, easeOutCubic(t))
    }

    const readColors = () => {
      const style = getComputedStyle(document.body)
      const next =
        parseRgbObject(style.color) ?? { r: 235, g: 238, b: 241 }
      if (
        next.r !== fgTo.r ||
        next.g !== fgTo.g ||
        next.b !== fgTo.b
      ) {
        fgFrom = colorStart >= 0 ? currentFg(performance.now()) : fgTo
        fgTo = next
        colorStart = performance.now()
        if (gridLayer) {
          gridOld = gridLayer
          gridBlendStart = colorStart
        }
        gridLayer = buildGridLayer(next)
      }
      if (reducedMotion) renderStatic()
    }

    const buildGridLayer = (color: Rgb) => {
      const layer = document.createElement('canvas')
      layer.width = canvas.width
      layer.height = canvas.height
      const layerCtx = layer.getContext('2d')
      if (!layerCtx) return layer
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      layerCtx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${BORDER_OPACITY})`
      layerCtx.lineWidth = 1
      layerCtx.beginPath()
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          layerCtx.rect(x * PITCH + 0.5, y * PITCH + 0.5, CELL, CELL)
        }
      }
      layerCtx.stroke()
      return layer
    }

    const renderStatic = () => {
      if (!gridLayer) return
      ctx.clearRect(0, 0, cols * PITCH, rows * PITCH)
      ctx.drawImage(gridLayer, 0, 0, cols * PITCH, rows * PITCH)
    }

    const makeZone = (
      key: string,
      originCol: number,
      originRow: number,
      zoneCols: number,
      zoneRows: number,
    ): Zone => ({
      key,
      originX: originCol * PITCH,
      originY: originRow * PITCH,
      cols: zoneCols,
      rows: zoneRows,
      level: new Float32Array(zoneCols * zoneRows),
      vel: new Float32Array(zoneCols * zoneRows),
      peak: new Float32Array(zoneCols * zoneRows),
    })

    /* Переносим состояние старых зон в новые, чтобы точки не гасли
       при ресайзе окна и переходах между вкладками */
    const carryOver = (
      previous: WorldState | null,
      nextZones: Zone[],
    ) => {
      if (!previous) return
      for (const zone of nextZones) {
        const old = previous.zones.find((z) => z.key === zone.key)
        if (!old) continue
        const length = Math.min(zone.level.length, old.level.length)
        zone.level.set(old.level.subarray(0, length))
        zone.vel.set(old.vel.subarray(0, length))
        zone.peak.set(old.peak.subarray(0, length))
      }
    }

    const buildWorld = (nextCols: number, nextRows: number) => {
      const sideCols = Math.max(
        8,
        Math.min(SIDE_BAND_COLS, Math.floor((nextCols - 12) / 2)),
      )
      const nextZones: Zone[] = [
        makeZone('left', 0, 0, sideCols, nextRows),
        makeZone('right', nextCols - sideCols, 0, sideCols, nextRows),
      ]
      const topCols = nextCols - sideCols * 2
      const topRows = Math.min(TOP_BAND_ROWS, nextRows)
      if (topCols >= 12 && topRows >= 8) {
        nextZones.push(
          makeZone('top', sideCols, 0, topCols, topRows),
        )
      }
      carryOver(worldRef.current, nextZones)
      worldRef.current = {
        cols: nextCols,
        rows: nextRows,
        zones: nextZones,
      }
    }

    const ensureWorld = (nextCols: number, nextRows: number) => {
      const world = worldRef.current
      if (!world || world.cols !== nextCols || world.rows !== nextRows) {
        buildWorld(nextCols, nextRows)
      }
      return worldRef.current!
    }

    const layout = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      cols = Math.max(Math.ceil(rect.width / PITCH), 12)
      rows = Math.max(Math.ceil(rect.height / PITCH), 12)
      ensureWorld(cols, rows)
      gridOld = null
      gridLayer = buildGridLayer(fgTo)
      if (reducedMotion) renderStatic()
    }

    const spawnBurst = (x: number, y: number) => {
      const count =
        BURST_MIN_PARTICLES +
        Math.floor(
          Math.random() *
            (BURST_MAX_PARTICLES - BURST_MIN_PARTICLES),
        )
      const originX = snapToGrid(x)
      const originY = snapToGrid(y)
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed =
          PARTICLE_MIN_SPEED +
          Math.random() *
            (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED)
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          ttl: 0.8 + Math.random() * 0.8,
          bright: 0.45 + Math.random() * 0.55,
        })
      }
      if (particles.length > PARTICLE_MAX_COUNT) {
        particles.splice(
          0,
          particles.length - PARTICLE_MAX_COUNT,
        )
      }
    }

    const drawParticles = (
      dtSeconds: number,
      bootAlpha: number,
    ) => {
      if (!particles.length) return
      const fg = fgRef.current
      let writeIndex = 0
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i]
        if (!particle) continue
        particle.age += dtSeconds
        if (particle.age >= particle.ttl) continue
        particle.vy += PARTICLE_GRAVITY * dtSeconds
        const drag = 1 - PARTICLE_DRAG * dtSeconds
        particle.vx *= drag
        particle.vy *= drag
        particle.x += particle.vx * dtSeconds
        particle.y += particle.vy * dtSeconds

        const progress = 1 - particle.age / particle.ttl
        const alpha =
          particle.bright * progress * progress * bootAlpha
        if (alpha > 0.02) {
          ctx.fillStyle = `rgba(${fg}, ${alpha.toFixed(3)})`
          ctx.fillRect(
            snapToGrid(particle.x),
            snapToGrid(particle.y),
            CELL,
            CELL,
          )
        }
        particles[writeIndex++] = particle
      }
      particles.length = writeIndex
    }

    const draw = (now: number) => {
      if (disposed) return
      rafId = requestAnimationFrame(draw)
      if (bootAt < 0) bootAt = now
      if (lastFrame < 0) {
        lastFrame = now
        return
      }
      if (now - lastFrame < FRAME_MS) return
      const dt = Math.min(now - lastFrame, 100)
      lastFrame = now

      const bootAlpha = Math.min((now - bootAt) / BOOT_FADE_MS, 1)

      const fg = currentFg(now)
      fgRef.current = `${fg.r}, ${fg.g}, ${fg.b}`

      ctx.clearRect(0, 0, cols * PITCH, rows * PITCH)
      if (gridOld && gridLayer) {
        ctx.drawImage(gridOld, 0, 0, cols * PITCH, rows * PITCH)
        const blend = Math.min(
          (now - gridBlendStart) / COLOR_TRANSITION_MS,
          1,
        )
        if (blend >= 1) {
          gridOld = null
          ctx.drawImage(gridLayer, 0, 0, cols * PITCH, rows * PITCH)
        } else {
          ctx.globalAlpha = easeOutCubic(blend)
          ctx.drawImage(gridLayer, 0, 0, cols * PITCH, rows * PITCH)
          ctx.globalAlpha = 1
        }
      } else if (gridLayer) {
        ctx.drawImage(gridLayer, 0, 0, cols * PITCH, rows * PITCH)
      }

      const world = ensureWorld(cols, rows)
      for (const zone of world.zones) {
        drawZoneDots(zone, bootAlpha)
      }

      drawParticles(dt / 1000, bootAlpha)
    }

    const triggerCell = (
      zone: Zone,
      index: number,
      peak?: number,
    ) => {
      if (zone.vel[index] !== 0 || zone.level[index] !== 0) return
      zone.peak[index] =
        peak ?? MIN_PEAK + Math.random() * (MAX_PEAK - MIN_PEAK)
      zone.vel[index] = ATTACK_RATE
    }

    const drawZoneDots = (zone: Zone, bootAlpha: number) => {
      for (let i = 0; i < zone.level.length; i++) {
        if (
          zone.level[i] === 0 &&
          zone.vel[i] === 0 &&
          Math.random() < TRIGGER_RATE
        ) {
          triggerCell(zone, i)
        }
      }

      if (Math.random() < ROW_PULSE_RATE) {
        const y = Math.floor(Math.random() * zone.rows)
        const boost = 0.55 * (0.35 + Math.random() * 0.65)
        for (let x = 0; x < zone.cols; x++) {
          triggerCell(zone, y * zone.cols + x, boost)
        }
      }

      const alphaScale = DOT_PEAK_OPACITY * bootAlpha
      const fg = fgRef.current

      for (let y = 0; y < zone.rows; y++) {
        for (let x = 0; x < zone.cols; x++) {
          const index = y * zone.cols + x
          let velocity = zone.vel[index] ?? 0
          let level = zone.level[index] ?? 0

          if (velocity > 0) {
            level += velocity
            if (level >= (zone.peak[index] ?? 0)) {
              level = zone.peak[index] ?? 0
              velocity = -RELEASE_RATE
            } else {
              velocity = ATTACK_RATE
            }
          } else if (velocity < 0) {
            level += velocity
            if (level <= 0) {
              level = 0
              velocity = 0
            }
          }

          if (level !== zone.level[index]) {
            zone.level[index] = level
          }
          zone.vel[index] = velocity

          if (level > 0.02) {
            ctx.fillStyle = `rgba(${fg}, ${(
              level * alphaScale
            ).toFixed(3)})`
            ctx.fillRect(
              zone.originX + x * PITCH,
              zone.originY + y * PITCH,
              CELL,
              CELL,
            )
          }
        }
      }
    }

    const burstAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      spawnBurst(clientX - rect.left, clientY - rect.top)
    }

    const onContextMenu = (event: MouseEvent) => {
      if (reducedMotion) return
      event.preventDefault()
      burstAt(event.clientX, event.clientY)
    }

    const onMouseDown = (event: MouseEvent) => {
      if (reducedMotion) return
      if (event.button !== 0) return
      burstAt(event.clientX, event.clientY)
    }

    readColors()
    layout()

    const resizeObserver = new ResizeObserver(layout)
    resizeObserver.observe(canvas)

    const themeObserver = new MutationObserver(readColors)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    window.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('mousedown', onMouseDown)

    if (!reducedMotion) {
      rafId = requestAnimationFrame(draw)
    }

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('mousedown', onMouseDown)
      worldRef.current = null
    }
  }, [])

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 select-none print:hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  )
}
