import React, { FC } from 'react'
import { cn } from '@/lib/utils'
import { DoorOpen } from '@phosphor-icons/react/dist/ssr'

type ScheduleLesson = {
  number: number
  subjectName: { kk: string; ru: string; en: string }
  teacher: string
  classroom: string | never
  isReplacement: boolean
}

const BELL_SCHEDULE: Record<number, string> = {
  0: '08:00 – 08:25',
  1: '08:30 – 09:15',
  2: '09:25 – 10:10',
  3: '10:35 – 11:20',
  4: '11:30 – 12:15',
  5: '12:35 – 13:20',
  6: '13:30 – 14:15',
  7: '14:25 – 15:10',
  8: '15:20 – 16:05',
}

type ScheduleLessonCardProps = {
  lesson: ScheduleLesson
}

export const ScheduleLessonCard: FC<ScheduleLessonCardProps> = ({
  lesson,
}) => {
  const bellTime = BELL_SCHEDULE[lesson.number] ?? ''

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border bg-card/80 p-3 shadow-none backdrop-blur-sm transition-colors',
        lesson.isReplacement
          ? 'border-yellow-500/40 hover:border-yellow-500/60'
          : 'border-content/10 hover:border-content/30',
      )}
    >
      <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-lg bg-content/5 px-1 py-2 font-mono">
        <span className="text-xl font-bold leading-none">
          {lesson.number}
        </span>
        {bellTime && (
          <span className="mt-1 text-center text-[10px] leading-tight text-content/45">
            {bellTime}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-semibold leading-snug">
            {lesson.subjectName.ru}
          </h3>
          {lesson.isReplacement && (
            <span className="shrink-0 rounded border border-yellow-500/50 bg-yellow-500/15 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
              Замена
            </span>
          )}
        </div>

        {lesson.teacher && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {lesson.teacher}
          </p>
        )}

        {Boolean(lesson.classroom) && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-content/45">
            <DoorOpen size={14} className="shrink-0" />
            каб. {lesson.classroom}
          </p>
        )}
      </div>
    </div>
  )
}

export default ScheduleLessonCard
