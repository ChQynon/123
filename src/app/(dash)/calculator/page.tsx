'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { v4 } from 'uuid'
import { useJournal } from '@/lib/hooks/useJournal'
import useRubric from '@/lib/hooks/useRubric'
import useSettingsStore from '@/lib/hooks/store/useSettingsStore'
import { RubricInfo } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Numpad from '@/widgets/calculator/Numpad'
import SubjectPill from '@/widgets/calculator/SubjectPill'
import {
  ArrowCounterClockwise,
  ArrowFatUp,
  CaretRight,
  Confetti,
  Plus,
  ShieldCheck,
  Target,
  TrashSimple,
} from '@phosphor-icons/react/dist/ssr'

/* ------------------------------------------------------------------ */
/* Типы и константы                                                    */
/* ------------------------------------------------------------------ */

type WorkKind = 'sor' | 'soch'

type Work = {
  id: string
  kind: WorkKind
  label: string
  score: number | null
  max: number
  deletable?: boolean
}

/* СОР и СОЧ дают максимум по 50% каждый — выше не прыгнуть */
const MAX_BLOCK_PERCENT = 50
const MAX_SORS = 50

const GRADE_META: Record<
  number,
  { color: string; label: string }
> = {
  5: { color: '#1bd90d', label: 'Отлично' },
  4: { color: '#fca40c', label: 'Хорошо' },
  3: { color: '#ff8a00', label: 'Удовлетворительно' },
  2: { color: '#ff3a27', label: 'Неудовлетворительно' },
}

const QUARTERS = [
  { value: '1', label: 'I' },
  { value: '2', label: 'II' },
  { value: '3', label: 'III' },
  { value: '4', label: 'IV' },
]

const toNum = (value?: string): number => {
  const parsed = Number((value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

const gradeOf = (percent: number): number => {
  if (percent >= 85) return 5
  if (percent >= 65) return 4
  if (percent >= 40) return 3
  return 2
}

const clampValue = (raw: string | null): number | null => {
  if (raw === null || raw === '') return null
  const parsed = Number(raw.replace(',', '.'))
  if (!Number.isFinite(parsed)) return null
  return Math.min(Math.max(parsed, 0), 999)
}

const buildWorksFromRubric = (
  info?: RubricInfo,
): Work[] => {
  if (!info) return []
  const sors: Work[] = info.sumChapterCriteria
    .map((rubric, index) => ({
      id: `real-sor-${index}`,
      kind: 'sor' as const,
      label: `СОР ${index + 1}`,
      score: toNum(rubric.mark),
      max: toNum(rubric.maxMark),
    }))
    .filter((work) => work.max > 0)

  const sochMax = info.sumQuarterCriteria.reduce(
    (acc, rubric) => acc + toNum(rubric.maxMark),
    0,
  )
  const sochScore = info.sumQuarterCriteria.reduce(
    (acc, rubric) => acc + toNum(rubric.mark),
    0,
  )
  const soch: Work[] =
    sochMax > 0
      ? [
          {
            id: 'real-soch',
            kind: 'soch',
            label: 'СОЧ',
            score: sochScore,
            max: sochMax,
          },
        ]
      : []

  return [...sors, ...soch]
}

/* ------------------------------------------------------------------ */
/* Страница                                                            */
/* ------------------------------------------------------------------ */

const Page = () => {
  const storeQuarter = useSettingsStore(
    (state) => state.currentQuarter,
  )

  const [quarter, setQuarter] = useState(storeQuarter)
  const [subjectId, setSubjectId] = useState<string>()
  const [works, setWorks] = useState<Work[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'score' | 'max'>(
    'score',
  )
  const [draft, setDraft] = useState<string | null>(null)
  const [focusTarget, setFocusTarget] = useState<85 | 65>(85)

  const journalQuery = useJournal()
  const journal = journalQuery.data?.find(
    (entry: { number: number }) =>
      entry.number === Number(quarter),
  )

  useEffect(() => {
    if (!subjectId && journal?.subjects.length) {
      setSubjectId(journal.subjects[0]!.id)
    }
  }, [journal, subjectId])

  useEffect(() => {
    setSubjectId(undefined)
    setWorks([])
    setActiveId(null)
  }, [quarter])

  const rubricQuery = useRubric(
    subjectId ?? '',
    Number(quarter),
    Boolean(subjectId),
  )

  useEffect(() => {
    if (rubricQuery.data) {
      setWorks(buildWorksFromRubric(rubricQuery.data))
      setActiveId(null)
      setDraft(null)
    }
  }, [rubricQuery.data])

  const resetToReal = useCallback(() => {
    setWorks(buildWorksFromRubric(rubricQuery.data))
    setActiveId(null)
    setDraft(null)
  }, [rubricQuery.data])

  /* ------------------------- Расчёты ------------------------- */

  const calc = useMemo(() => {
    const sors = works.filter((work) => work.kind === 'sor')
    const sorScore = sors.reduce(
      (acc, work) => acc + (work.score ?? 0),
      0,
    )
    const sorMax = sors.reduce((acc, work) => acc + work.max, 0)
    const sorPercent =
      sorMax > 0
        ? Math.min(sorScore / sorMax, 1) * MAX_BLOCK_PERCENT
        : 0

    const sochs = works.filter((work) => work.kind === 'soch')
    const sochScore = sochs.reduce(
      (acc, work) => acc + (work.score ?? 0),
      0,
    )
    const sochMax = sochs.reduce((acc, work) => acc + work.max, 0)
    const sochPercent =
      sochMax > 0
        ? Math.min(sochScore / sochMax, 1) * MAX_BLOCK_PERCENT
        : 0

    const total = sorPercent + sochPercent

    return {
      sorPercent,
      sochPercent,
      total,
      grade: gradeOf(total),
      maxSoch: sochMax,
    }
  }, [works])

  type Hint =
    | { kind: 'guaranteed' }
    | { kind: 'need'; need: number }
    | { kind: 'impossible'; best: number }

  const hintFor = useCallback(
    (target: number): Hint | null => {
      if (!calc.maxSoch) return null
      if (calc.sorPercent >= target) return { kind: 'guaranteed' }
      const need =
        ((target - calc.sorPercent) /
          MAX_BLOCK_PERCENT) *
        calc.maxSoch
      if (
        need > calc.maxSoch + 1e-9 ||
        calc.sorPercent + MAX_BLOCK_PERCENT < target
      ) {
        return {
          kind: 'impossible',
          best: calc.sorPercent + MAX_BLOCK_PERCENT,
        }
      }
      return { kind: 'need', need: Math.ceil(need - 1e-9) }
    },
    [calc],
  )

  /* ------------------------- Ввод ------------------------- */

  const activeWork = works.find((work) => work.id === activeId)

  const updateActive = (updater: (work: Work) => Work) => {
    if (!activeId) return
    setWorks((list) =>
      list.map((work) =>
        work.id === activeId ? updater(work) : work,
      ),
    )
  }

  const commitDraft = (value: string | null) => {
    updateActive((work) =>
      inputMode === 'score'
        ? { ...work, score: clampValue(value) }
        : { ...work, max: clampValue(value) ?? 0 },
    )
  }

  const onNumpadKey = (key: string) => {
    if (!activeWork) return

    if (key === '⌫') {
      const base =
        draft ??
        (inputMode === 'max'
          ? String(activeWork.max)
          : activeWork.score === null
            ? ''
            : String(activeWork.score))
      const next = base.slice(0, -1)
      setDraft(next || null)
      commitDraft(next || null)
      return
    }

    const base = draft ?? ''
    if (key === ',' && base.includes(',')) return
    if (base.replace(/[^0-9]/g, '').length >= 5) return
    const next = base + key
    setDraft(next)
    commitDraft(next)
  }

  const selectChip = (id: string) => {
    setActiveId(id)
    setDraft(null)
    setInputMode('score')
  }

  /* Физическая клавиатура дублирует numpad для активной работы */
  useEffect(() => {
    if (!activeId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) {
        onNumpadKey(event.key)
      } else if (event.key === ',' || event.key === '.') {
        onNumpadKey(',')
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        onNumpadKey('⌫')
      } else if (event.key === '/') {
        event.preventDefault()
        onNumpadKey('/')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const sorCount = works.filter((work) => work.kind === 'sor').length

  const addWork = (kind: WorkKind) => {
    const id = v4()
    const sameKindCount =
      works.filter((work) => work.kind === kind).length

    const prefix = kind === 'sor' ? 'СОР' : 'СОЧ'
    const label =
      kind === 'soch' && sameKindCount === 0
        ? 'СОЧ'
        : `${prefix} ${sameKindCount + 1}`

    const inserted: Work = {
      id,
      kind,
      label,
      score: null,
      max: kind === 'sor' ? 10 : 20,
      deletable: true,
    }

    setWorks((list) =>
      kind === 'sor'
        ? [
            ...list.filter((work) => work.kind === 'sor'),
            inserted,
            ...list.filter((work) => work.kind !== 'sor'),
          ]
        : [...list, inserted],
    )
    setActiveId(id)
    setDraft(null)
    setInputMode('score')
  }

  const removeWork = (id: string) => {
    setWorks((list) => list.filter((work) => work.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setDraft(null)
    }
  }

  /* ------------------------- Отображение ------------------------- */

  const gradeMeta = GRADE_META[calc.grade]!
  const hint = hintFor(focusTarget)

  const hintText = (() => {
    if (!hint) return null
    if (hint.kind === 'guaranteed') {
      return `Оценка ${
        focusTarget === 85 ? 5 : 4
      } гарантирована при любом балле СОЧ`
    }
    if (hint.kind === 'impossible') {
      return `Максимально возможный балл: ${Math.min(
        hint.best,
        100,
      ).toFixed(1)}% (${gradeOf(hint.best)})`
    }
    return `Нужно ${hint.need}/${calc.maxSoch} на СОЧ для ${
      focusTarget === 85 ? 5 : 4
    } (${focusTarget}%)`
  })()

  const HintIcon =
    hint?.kind === 'guaranteed'
      ? Confetti
      : focusTarget === 85
        ? Target
        : ShieldCheck

  return (
    <div className="page-enter sm:mb-[3.5rem]">
      <div className="relative overflow-hidden rounded-2xl border border-content/10 bg-card/80 shadow-xl backdrop-blur-sm">
        {/* Акцентное свечение снизу в цвете темы */}
        <div
          className="pointer-events-none absolute -bottom-28 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, hsl(var(--primary) / 0.22), transparent)',
          }}
        />

        <div className="relative z-10 flex min-h-[560px] flex-col">
          {/* Header bar */}
          <div className="flex items-center justify-center px-4 pt-4">
            <div className="flex items-center rounded-full border border-content/10 bg-content/5 p-1">
              {QUARTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setQuarter(item.value)}
                  className={cn(
                    'cursor-pointer rounded-full px-3.5 py-1 font-mono text-sm transition-colors',
                    quarter === item.value
                      ? 'bg-content/15 font-semibold text-content'
                      : 'text-content/50 hover:text-content',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Контент */}
          <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-4">
            {journalQuery.isLoading || !journal ? (
              <Skeleton className="h-16 w-full" />
            ) : journal.subjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                В этой четверти нет предметов
              </p>
            ) : (
              <SubjectPill
                journal={journal}
                subjectId={subjectId ?? ''}
                onSelect={(id) => setSubjectId(id)}
              />
            )}

            {subjectId && rubricQuery.isError && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                Не удалось загрузить реальные оценки — считаем с
                нулями.
              </div>
            )}

            {/* Hero */}
            <div className="flex flex-col items-center py-2">
              <p className="font-mono text-xs tracking-wide text-content/45">
                {calc.sorPercent.toFixed(1)}% СОР +{' '}
                {calc.sochPercent.toFixed(1)}% СОЧ
              </p>

              <div className="mt-1 flex items-center gap-4">
                <span className="font-mono text-6xl font-bold leading-none tracking-tight text-content">
                  {calc.total.toFixed(1)}
                  <span className="text-3xl text-content/50">%</span>
                </span>
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-extrabold text-black"
                  style={{ backgroundColor: gradeMeta.color }}
                >
                  {calc.grade}
                </span>
              </div>
              <p
                className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em]"
                style={{ color: gradeMeta.color }}
              >
                {gradeMeta.label}
              </p>

              {hintText && (
                <button
                  type="button"
                  onClick={() =>
                    setFocusTarget((target) =>
                      target === 85 ? 65 : 85,
                    )
                  }
                  className="mt-3 flex cursor-pointer items-center gap-2 rounded-full border border-content/15 bg-content/5 px-4 py-2 text-center font-mono text-xs text-content/80 transition-colors hover:bg-content/10 hover:text-content"
                >
                  <HintIcon
                    size={14}
                    className="shrink-0 text-primary"
                  />
                  {hintText}
                  <CaretRight
                    size={12}
                    className="text-content/40"
                  />
                </button>
              )}
            </div>

            {/* Чипы работ */}
            <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {rubricQuery.isLoading && subjectId ? (
                <>
                  {[0, 1, 2].map((index) => (
                    <Skeleton
                      key={`chip-skeleton-${index}`}
                      className="h-9 w-24 shrink-0 rounded-full"
                    />
                  ))}
                </>
              ) : (
                <>
                  {works.map((work) => {
                    const isActive = activeId === work.id
                    const editingMax =
                      isActive && inputMode === 'max'
                    const shownScore = !isActive
                      ? work.score ?? '--'
                      : !editingMax
                        ? draft ?? work.score ?? '--'
                        : work.score ?? '--'
                    const shownMax = editingMax
                      ? draft ?? String(work.max)
                      : String(work.max)

                    return (
                      <span
                        key={work.id}
                        className={cn(
                          'group relative flex shrink-0 items-stretch overflow-visible rounded-full border transition-colors',
                          isActive
                            ? 'border-primary/60'
                            : 'border-content/15',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectChip(work.id)}
                          className={cn(
                            'cursor-pointer whitespace-nowrap rounded-l-full py-1.5 pl-3.5 pr-2 font-mono text-sm transition-colors',
                            isActive && inputMode === 'score'
                              ? 'bg-primary/15 text-content'
                              : 'bg-content/5 text-content/80 hover:bg-content/10',
                          )}
                        >
                          {work.label}: {shownScore}
                        </button>
                        <button
                          type="button"
                          title="Изменить максимум"
                          onClick={() => {
                            setActiveId(work.id)
                            setDraft(null)
                            setInputMode('max')
                          }}
                          className={cn(
                            'cursor-pointer whitespace-nowrap rounded-r-full py-1.5 pr-3.5 pl-1.5 font-mono text-sm transition-colors',
                            editingMax
                              ? 'bg-primary/15 font-semibold text-content'
                              : 'bg-content/10 text-content/55 hover:bg-content/20 hover:text-content',
                          )}
                        >
                          /{shownMax}
                        </button>
                        {work.deletable && (
                          <button
                            type="button"
                            aria-label={`Удалить ${work.label}`}
                            onClick={() => removeWork(work.id)}
                          className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <TrashSimple size={11} weight="bold" />
                          </button>
                        )}
                      </span>
                    )
                  })}

                  <button
                    type="button"
                    disabled={sorCount >= MAX_SORS}
                    title={
                      sorCount >= MAX_SORS
                        ? `Максимум ${MAX_SORS} СОРов`
                        : undefined
                    }
                    onClick={() => addWork('sor')}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed border-content/25 px-3.5 py-1.5 font-mono text-sm text-content/60 transition-colors hover:border-content/50 hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={14} /> СОР
                  </button>

                  <button
                    type="button"
                    onClick={() => addWork('soch')}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed border-content/25 px-3.5 py-1.5 font-mono text-sm text-content/60 transition-colors hover:border-content/50 hover:text-content"
                  >
                    <Plus size={14} /> СОЧ
                  </button>
                </>
              )}
            </div>

            {/* Быстрые действия */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-9 gap-1.5 rounded-full px-3 font-mono text-xs"
                  onClick={resetToReal}
                >
                  <ArrowCounterClockwise size={14} /> К реальным
                </Button>
                <Button
                  variant="ghost"
                  disabled={!activeWork}
                  title="Выставить максимум активной работе"
                  className="h-9 gap-1.5 rounded-full px-3 font-mono text-xs"
                  onClick={() => {
                    updateActive((work) => ({
                      ...work,
                      score: work.max,
                    }))
                    setDraft(null)
                  }}
                >
                  <ArrowFatUp size={14} /> Максимум
                </Button>
              </div>

              <div className="flex items-center rounded-full border border-content/10 bg-content/5 p-1">
                {(['score', 'max'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setInputMode(mode)
                      setDraft(null)
                    }}
                    className={cn(
                      'cursor-pointer rounded-full px-3 py-1 font-mono text-[11px] transition-colors',
                      inputMode === mode
                        ? 'bg-content/15 font-semibold text-content'
                        : 'text-content/50 hover:text-content',
                    )}
                  >
                    {mode === 'score' ? 'Набрано' : 'Максимум'}
                  </button>
                ))}
              </div>
            </div>

            {/* Numpad */}
            <Numpad onKey={onNumpadKey} />
          </div>

          {/* Action bar */}
          <div className="relative z-10 flex items-center justify-between gap-3 border-t border-content/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 font-mono text-sm text-content/70">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: activeWork
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--content-hsl) / 0.2)',
                }}
              />
              <span className="truncate">
                {activeWork
                  ? `${activeWork.label} • ${
                      inputMode === 'score' ? 'набрано' : 'максимум'
                    }`
                  : 'Выберите работу'}
              </span>
            </div>
            <Button
              disabled={!activeWork}
              onClick={() => {
                setActiveId(null)
                setDraft(null)
              }}
            >
              Применить
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
