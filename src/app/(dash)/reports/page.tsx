'use client'

import React, { useState } from 'react'
import { useReports } from '@/lib/hooks/useReports'
import { useContingent } from '@/lib/hooks/useContingent'
import ReportCardError from '@/widgets/reports/ReportCardError'
import ReportsLoading from '@/widgets/reports/ReportsLoading'
import ReportPrintView from '@/widgets/reports/ReportPrintView'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DownloadSimple } from '@phosphor-icons/react'
import { ReportCard } from '@/shared/types'
import ReportTable from '@/widgets/reports/ReportTable'

const Page = () => {
  const { data, isLoading, isError } = useReports()
  const { data: contingent } = useContingent()

  const [selectedSchoolYear, setSelectedSchoolYear] =
    useState<ReportCard[number]>()
  const [printYear, setPrintYear] = useState<ReportCard[number]>()

  if (isError) return <ReportCardError />
  if (isLoading) return <ReportsLoading />
  if (!data) return null

  const activeSchoolYear =
    selectedSchoolYear ??
    data.find((report) => report.schoolYear.isCurrent) ??
    data[0]

  return (
    <div className="page-enter sm:mb-[3.5rem]">
      <div className="flex flex-row items-center gap-2">
        <Select
          value={activeSchoolYear?.schoolYear.id}
          onValueChange={(value) =>
            setSelectedSchoolYear(
              data.find((report) => report.schoolYear.id === value),
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите учебный год" />
          </SelectTrigger>
          <SelectContent>
            {data.map((report) => (
              <SelectItem
                value={report.schoolYear.id}
                key={`school-year-${report.schoolYear.id}`}
              >
                {report.schoolYear.name.ru}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="shrink-0 whitespace-nowrap"
          disabled={!!printYear}
          onClick={() =>
            activeSchoolYear && setPrintYear(activeSchoolYear)
          }
        >
          <DownloadSimple size={16} className="mr-1.5" />
          {printYear ? 'Формирую…' : 'Скачать PDF'}
        </Button>
      </div>

      <ReportTable reportCard={activeSchoolYear} />

      {printYear && (
        <ReportPrintView
          year={printYear}
          person={contingent}
          onClose={() => setPrintYear(undefined)}
        />
      )}
    </div>
  )
}

export default Page
