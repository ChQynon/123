'use client'

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Logo from '@/components/misc/Logo'
import TerminalSpinner from '@/components/misc/TerminalSpinner'
import Shimmer from '@/components/misc/Shimmer'
import type { ContingentInfo } from '@/lib/hooks/useContingent'
import type { ReportCard } from '@/shared/types'
import { calculateGpa } from './ReportTable'

type ReportPrintViewProps = {
  year: ReportCard[number]
  person?: ContingentInfo
  onClose: () => void
}

const A4_WIDTH_PX = 794

const PERIODS: {
  key: 'firstPeriod' | 'secondPeriod' | 'thirdPeriod' | 'fourthPeriod'
  label: string
}[] = [
  { key: 'firstPeriod', label: 'I' },
  { key: 'secondPeriod', label: 'II' },
  { key: 'thirdPeriod', label: 'III' },
  { key: 'fourthPeriod', label: 'IV' },
]

export default function ReportPrintView({
  year,
  person,
  onClose,
}: ReportPrintViewProps) {
  const documentRef = useRef<HTMLDivElement | null>(null)
  const doneRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const finish = () => {
      if (!doneRef.current) {
        doneRef.current = true
        onCloseRef.current()
      }
    }

    /* страховка: не висим вечно, даже если что-то зависло */
    const failsafe = window.setTimeout(finish, 25_000)

    const generate = async () => {
      try {
        await document.fonts?.ready
        const node = documentRef.current
        if (!node) return

        const [{ default: html2canvas }, { jsPDF }] =
          await Promise.all([
            import('html2canvas'),
            import('jspdf'),
          ])

        const canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
        })
        if (doneRef.current) return

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        })

        const pageWidthMm = 210
        const pageHeightMm = 297
        const pxPerMm = canvas.width / pageWidthMm
        const pageHeightPx = Math.floor(
          pageHeightMm * pxPerMm,
        )

        let renderedPx = 0
        while (renderedPx < canvas.height) {
          const sliceHeight = Math.min(
            pageHeightPx,
            canvas.height - renderedPx,
          )
          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = canvas.width
          pageCanvas.height = sliceHeight
          const pageCtx = pageCanvas.getContext('2d')
          if (!pageCtx) break
          pageCtx.fillStyle = '#ffffff'
          pageCtx.fillRect(0, 0, pageCanvas.width, sliceHeight)
          pageCtx.drawImage(
            canvas,
            0,
            renderedPx,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight,
          )
          if (renderedPx > 0) pdf.addPage()
          pdf.addImage(
            pageCanvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            0,
            0,
            pageWidthMm,
            sliceHeight / pxPerMm,
          )
          renderedPx += sliceHeight
        }

        if (doneRef.current) return
        pdf.save(
          `adaption-top-tabel-${year.schoolYear.name.ru}.pdf`,
        )
      } catch (error) {
        console.error('PDF export failed:', error)
      } finally {
        window.clearTimeout(failsafe)
        finish()
      }
    }

    void generate()
    return () => window.clearTimeout(failsafe)
  }, [year])

  const gpa = calculateGpa(year)
  const generatedAt = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return createPortal(
    <>
      <div className="overlay-fade fixed inset-0 z-[200] flex items-center justify-center bg-background/70 backdrop-blur-sm">
        <div className="approval-toast flex items-center gap-3 rounded-lg border border-content/15 bg-background/90 px-6 py-4 shadow-xl">
          <TerminalSpinner className="text-base leading-none" />
          <span className="font-mono text-sm tracking-[0.08em]">
            <Shimmer duration={1.2}>ФОРМИРУЮ PDF…</Shimmer>
          </span>
        </div>
      </div>

      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: -20000,
          top: 0,
          width: A4_WIDTH_PX,
          background: '#ffffff',
        }}
      >
        <div ref={documentRef} className="bg-white p-12 text-black">
          <header className="flex items-center justify-between border-b-2 border-black/80 pb-6">
            <div className="flex items-center gap-5">
              <Logo width={64} height={64} className="my-0 shrink-0" />
              <div>
                <h1 className="text-3xl font-bold leading-tight">
                  {person?.lastName ?? ''} {person?.firstName ?? ''}
                </h1>
                <p className="mt-1.5 text-base text-black/60">
                  {person?.data?.School?.Name?.ru ?? ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-semibold tracking-wide">
                adaption.top
              </p>
              <p className="mt-1.5 text-base text-black/60">
                Табель · {year.schoolYear.name.ru}
              </p>
            </div>
          </header>

          <table className="mt-8 w-full border-collapse text-base">
            <thead>
              <tr>
                <th className="border-b border-black/40 px-2 py-2.5 text-left font-semibold">
                  Предмет
                </th>
                {PERIODS.map((period) => (
                  <th
                    key={period.key}
                    className="border-b border-black/40 px-2 py-2.5 text-center font-semibold"
                  >
                    {period.label}
                  </th>
                ))}
                <th className="border-b border-black/40 px-2 py-2.5 text-center font-semibold">
                  Год
                </th>
              </tr>
            </thead>
            <tbody>
              {year.reportCard.map((report) => (
                <tr key={`print-${report.subject.id}`}>
                  <td className="border-b border-black/10 px-2 py-2">
                    {report.subject.name.ru}
                  </td>
                  {PERIODS.map((period) => (
                    <td
                      key={`print-${report.subject.id}-${period.key}`}
                      className="border-b border-black/10 px-2 py-2 text-center"
                    >
                      {report[period.key]?.ru?.trim() || '—'}
                    </td>
                  ))}
                  <td className="border-b border-black/10 px-2 py-2 text-center font-bold">
                    {report.yearMark?.ru?.trim() || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-2 pt-4 font-semibold" colSpan={5}>
                  Средний балл за год (GPA)
                </td>
                <td className="px-2 pt-4 text-center text-lg font-bold">
                  {gpa ? gpa.toFixed(2) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>

          <footer className="mt-12 border-t border-black/20 pt-4 text-xs leading-relaxed text-black/55">
            Данные в документе являются официальными и получены из системы
            СУШ (система управления школой) по состоянию на {generatedAt}.
            Документ сформирован автоматически сервисом adaption.top и
            отражает оценки за {year.schoolYear.name.ru} учебный год.
          </footer>
        </div>
      </div>
    </>,
    document.body,
  )
}
