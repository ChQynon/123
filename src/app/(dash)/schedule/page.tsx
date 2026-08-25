'use client'

import React, { useMemo, useState } from 'react'
import useSchedule from '@/lib/hooks/useSchedule'
import ScheduleLessonCard from '@/widgets/schedule/ScheduleLessonCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  ArrowClockwise,
  CalendarBlank,
  CalendarCheck,
  CaretLeft,
  CaretRight,
  LinkBreak,
} from '@phosphor-icons/react/dist/ssr'

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const pad2 = (value: number) => value.toString().padStart(2, '0')

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const isSameDay = (a: Date, b: Date) => toISODate(a) === toISODate(b)

const addDays = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

const startOfWeek = (date: Date) => {
  const monday = new Date(date)
  const offset = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - offset)
  monday.setHours(0, 0, 0, 0)
  return monday
}

type DayCell = {
  date: Date
  iso: string
  label: string
  dayNumber: number
}

const getWeekDays = (selected: Date): DayCell[] => {
  const monday = startOfWeek(selected)
  return Array.from({ length: 6 }, (_, index) => {
    const date = addDays(monday, index)
    return {
      date,
      iso: toISODate(date),
      label: WEEKDAY_LABELS[index]!,
      dayNumber: date.getDate(),
    }
  })
}

const Page = () => {
  const [selected, setSelected] = useState<Date>(() => new Date())
  const selectedISO = toISODate(selected)
  const { data, isLoading, isError, refetch } = useSchedule(selectedISO)

  const weekDays = useMemo(() => getWeekDays(selected), [selected])

  const monthLabel = useMemo(
    () =>
      selected.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    [selected],
  )

  const scheduleDay = useMemo(
    () =>
      data?.scheduleDays?.find((day) => day.date?.startsWith(selectedISO)),
    [data, selectedISO],
  )

  const notWorking = scheduleDay?.scheduleNotWorkingDay
  const lessons = [...(scheduleDay?.lessons ?? [])].sort(
    (a, b) => a.number - b.number,
  )

  const showEmpty =
    !isLoading &&
    !isError &&
    (!scheduleDay || (!notWorking?.isNotWorkingDay && lessons.length === 0))

  return (
    <div className="page-enter sm:mb-[3.5rem]">
      {/* Переключение недель */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Предыдущая неделя"
          onClick={() => setSelected((date) => addDays(date, -7))}
        >
          <CaretLeft size={16} />
        </Button>

        <div className="flex min-w-0 flex-col items-center">
          <p className="truncate font-mono text-sm uppercase tracking-[0.08em] text-content/70">
            {monthLabel}
          </p>
          <Button
            variant={isSameDay(selected, new Date()) ? 'secondary' : 'ghost'}
            className="mt-0.5 h-7 px-3 font-mono text-xs uppercase tracking-[0.08em]"
            onClick={() => setSelected(new Date())}
          >
            Сегодня
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Следующая неделя"
          onClick={() => setSelected((date) => addDays(date, 7))}
        >
          <CaretRight size={16} />
        </Button>
      </div>

      {/* Дни недели */}
      <div className="mb-4 grid grid-cols-6 gap-1.5">
        {weekDays.map((cell) => {
          const isSelected = cell.iso === selectedISO
          const isToday = isSameDay(cell.date, new Date())

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelected(cell.date)}
              className={cn(
                'flex cursor-pointer flex-col items-center rounded-lg border py-1.5 transition-colors',
                isSelected
                  ? 'border-content/40 bg-content/15 text-content'
                  : 'border-content/10 text-content/50 hover:bg-content/10 hover:text-content',
              )}
            >
              <span className="font-mono text-[11px] uppercase tracking-wide opacity-80">
                {cell.label}
              </span>
              <span className="mt-0.5 font-mono text-base font-semibold leading-none">
                {cell.dayNumber}
              </span>
              <span
                className={cn(
                  'mt-1 h-1 w-1 rounded-full',
                  isToday ? 'bg-primary' : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={`schedule-skeleton-${index}`} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Ошибка */}
      {!isLoading && isError && (
        <div className="flex flex-col items-center py-14 text-center">
          <LinkBreak size={56} className="mx-auto text-red-600" />
          <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
            Расписание недоступно
          </h2>
          <p className="mt-1 max-w-72 text-sm leading-5 text-muted-foreground">
            Сервис расписания сейчас не отвечает. Попробуйте ещё раз позже.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <ArrowClockwise size={16} className="mr-1.5" />
            Повторить
          </Button>
        </div>
      )}

      {/* Нерабочий / праздничный день */}
      {!isLoading && !isError && notWorking?.isNotWorkingDay && (
        <div className="page-enter flex flex-col items-center rounded-xl border border-content/10 bg-card/80 px-6 py-12 text-center backdrop-blur-sm">
          <CalendarCheck size={56} className="mx-auto text-primary" />
          <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
            {notWorking.calendarEventName?.ru || 'Нерабочий день'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {notWorking.isHoliday
              ? 'Праздничный день — занятий нет'
              : 'Выходной день — занятий нет'}
          </p>
        </div>
      )}

      {/* Пустой день */}
      {showEmpty && (
        <div className="page-enter flex flex-col items-center py-14 text-center">
          <CalendarBlank size={56} className="mx-auto text-content/30" />
          <h2 className="mt-3 text-xl font-semibold sm:text-2xl">
            Нет уроков
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            На выбранный день расписание пустое
          </p>
        </div>
      )}

      {/* Уроки */}
      {!isLoading && !isError && !notWorking?.isNotWorkingDay && lessons.length > 0 && (
        <div className="flex flex-col gap-2">
          {lessons.map((lesson, index) => (
            <ScheduleLessonCard
              key={`lesson-${lesson.number}-${index}`}
              lesson={lesson}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Page
