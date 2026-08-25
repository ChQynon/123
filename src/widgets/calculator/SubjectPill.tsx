'use client'

import React, { FC, useEffect, useRef, useState } from 'react'
import { BookOpen, CaretDown } from '@phosphor-icons/react/dist/ssr'
import type { Journal } from '@/shared/types'

export interface SubjectPillProps {
  journal: Journal[number]
  subjectId: string
  onSelect: (subjectId: string) => void
}

const gradeColor = (mark?: number) => {
  if (!mark) return 'text-content/60'
  if (mark >= 5) return 'text-[#1bd90d]'
  if (mark === 4) return 'text-[#fca40c]'
  if (mark === 3) return 'text-[#ff8a00]'
  return 'text-[#ff3a27]'
}

const SubjectPill: FC<SubjectPillProps> = ({
  journal,
  subjectId,
  onSelect,
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const current = journal.subjects.find(
    (subject) => subject.id === subjectId,
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () =>
      window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-2xl border border-content/15 bg-content/5 px-4 py-3 text-left transition-colors hover:bg-content/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-content/10">
          <BookOpen size={20} className="text-content/80" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-tight">
            {current?.name.ru ?? 'Выберите предмет'}
          </span>
          {current && (
            <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
              {current.currScore}% •{' '}
              <span
                className={`font-bold ${gradeColor(current.mark ?? undefined)}`}
              >
                {current.mark ?? '—'}
              </span>
            </span>
          )}
        </span>
        <CaretDown
          size={16}
          className={`shrink-0 text-content/40 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-content/15 bg-background p-1.5 shadow-2xl">
          {journal.subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => {
                onSelect(subject.id)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                subject.id === subjectId
                  ? 'bg-content/10'
                  : 'hover:bg-content/5'
              }`}
            >
              <span className="truncate text-sm">
                {subject.name.ru}
              </span>
              <span className="ml-3 shrink-0 font-mono text-xs text-muted-foreground">
                {subject.currScore}%
                {subject.mark ? ` • ${subject.mark}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubjectPill
