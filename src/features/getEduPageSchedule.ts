import { CityAbbr } from '@/shared/constants/cities'
import { getEduPageHost } from '@/shared/constants/edupage'
import { translateSubjectName } from '@/shared/constants/subjects'
import { getAdditionalUserInfo } from '@/features/getAdditionalUserInfo'
import { Schedule, ScheduleDay, ScheduleLesson } from '@/shared/types'

/*
  Расписание берётся из EduPage — сервиса, который используют школы НИШ
  (тот же источник, что и официальный сайт школы). Авторизация не нужна:
  расписание класса публичное, из профиля пользователя берётся только класс.

  Запросы (RPC поверх POST с __args/__gsh):
    1. ttviewer.js?__func=getTTViewerData   — список версий расписания
    2. regulartt.js?__func=regularttGetData — полные таблицы (классы, уроки, звонки)
    3. currenttt.js?__func=curentttGetData  — актуальное расписание класса на неделю
*/

const GSH = '00000000'
const RPC_TIMEOUT_MS = 8000

type EduPageRow = Record<string, unknown>
type EduPageTable = { id: string; data_rows?: EduPageRow[] }

type EduPageTimetableInfo = {
  tt_num?: string
  year?: number
  text?: string
  datefrom?: string
  hidden?: boolean
}

type EduPageTTViewerData = {
  regular?: {
    default_num?: string
    timetables?: EduPageTimetableInfo[]
  }
}

type EduPageRegularData = {
  dbiAccessorRes?: {
    tables?: EduPageTable[]
  }
}

type EduPageCurrentItem = {
  type?: string
  date?: string
  uniperiod?: string
  starttime?: string
  endtime?: string
  durationperiods?: number
  subjectid?: string
  teacherids?: unknown
  classroomids?: unknown
  classids?: unknown
}

type EduPageCurrentData = {
  ttitems?: EduPageCurrentItem[]
  error?: string
}

type EduPageEnvelope<T> = {
  r?: T
  e?: string
  em?: string
}

type EduPageTimetable = {
  ttNum: string
  dateFrom: string
  hidden: boolean
}

type EduPageClass = {
  id: string
  name: string
  short: string
}

type EduPageLesson = {
  numberStart: number | null
  numberEnd: number | null
  time: string
  subject: string
  teacher: string
  classroom: string
}

type EduPageLookups = {
  subjects: Record<string, EduPageRow>
  teachers: Record<string, EduPageRow>
  classrooms: Record<string, EduPageRow>
  periods: Record<string, EduPageRow>
}

export type EduPageScheduleOptions = {
  date?: string | null
  classQuery?: string | null
}

/* ------------------------------ RPC ------------------------------ */

const fetchEduPageRpc = async <T>(
  host: string,
  file: string,
  func: string,
  args: unknown[],
): Promise<T> => {
  const response = await fetch(
    `https://${host}.edupage.org/timetable/server/${file}?__func=${func}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ __args: args, __gsh: GSH }),
      cache: 'no-store',
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    },
  )

  if (!response.ok) {
    throw new Error(`EDUPAGE_HTTP_${response.status}`)
  }

  const envelope = (await response.json()) as EduPageEnvelope<T>

  if (envelope.r == null) {
    throw new Error(envelope.em ?? envelope.e ?? 'EDUPAGE_RPC_ERROR')
  }

  return envelope.r
}

/* ------------------------------ Даты ------------------------------ */

const isIsoDate = (value?: string | null): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

const pad = (value: number) => String(value).padStart(2, '0')

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const fromIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

const shiftIsoDate = (value: string, amount: number) => {
  const next = fromIsoDate(value)
  next.setDate(next.getDate() + amount)
  return toIsoDate(next)
}

/* 0 — понедельник, 6 — воскресенье */
const isoWeekdayIndex = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  const jsIndex = new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1),
  ).getUTCDay()

  return (jsIndex + 6) % 7
}

/* Неделя целиком: с понедельника по воскресенье */
const getWeekDates = (value: string) => {
  const monday = shiftIsoDate(value, -isoWeekdayIndex(value))
  return Array.from({ length: 7 }, (_, index) => shiftIsoDate(monday, index))
}

const schoolYearFromDate = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  return (month ?? 1) >= 8 ? (year ?? 0) : (year ?? 0) - 1
}

/* --------------------------- Примитивы --------------------------- */

const readString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (value == null || value === '') return []
  return [String(value)]
}

const findTable = (tables: EduPageTable[], id: string) =>
  tables.find((table) => table.id === id)

const makeLookup = (tables: EduPageTable[], id: string) => {
  const out: Record<string, EduPageRow> = {}

  for (const row of findTable(tables, id)?.data_rows ?? []) {
    out[readString(row.id)] = row
  }

  return out
}

const getSubjectName = (row: EduPageRow | undefined, fallback = 'Урок') =>
  readString(row?.name) || readString(row?.short) || fallback

const getTeacherName = (row: EduPageRow | undefined) => {
  if (!row) return ''

  return (
    readString(row.name) ||
    `${readString(row.firstname)} ${readString(row.lastname)}`.trim() ||
    readString(row.short)
  )
}

const getClassroomName = (row: EduPageRow | undefined, fallback = '') =>
  readString(row?.name) || readString(row?.short) || fallback

const resolvePeriodNumber = (
  periods: Record<string, EduPageRow>,
  raw: unknown,
): number | null => {
  if (raw == null || raw === '') return null

  const key = String(raw)
  const row = periods[key]

  if (row) {
    const value = Number(row.period ?? row.short ?? row.id)
    return Number.isFinite(value) ? value : null
  }

  const value = Number(key)
  return Number.isFinite(value) ? value : null
}

const getPeriodTime = (
  periods: Record<string, EduPageRow>,
  period: number | null,
  field: 'starttime' | 'endtime',
) => {
  if (period == null) return ''

  const row =
    periods[String(period)] ??
    Object.values(periods).find(
      (item) =>
        String(item.period ?? '') === String(period) ||
        String(item.short ?? '') === String(period),
    )

  return readString(row?.[field])
}

/* -------------------------- Класс ученика -------------------------- */

const normalizeClassValue = (value?: string | null) =>
  (value ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/\u0406/g, 'I')
    .replace(/[^0-9A-Z\u0410-\u042F]/g, '')

/* «10 F k» -> «10F», «10-А» -> «10А» */
const getClassKey = (value?: string | null) => {
  const normalized = normalizeClassValue(value)
  const match = normalized.match(/^(\d{1,2})([A-Z\u0410-\u042F])/)
  return match ? `${match[1]}${match[2]}` : ''
}

const getClassGrade = (value?: string | null) =>
  normalizeClassValue(value).match(/^(\d{1,2})/)?.[1] ?? ''

const buildClasses = (tables: EduPageTable[]): EduPageClass[] => {
  const rows = findTable(tables, 'classes')?.data_rows ?? []

  return rows
    .map((row) => {
      const id = readString(row.id)
      const name = readString(row.name) || id

      return {
        id,
        name,
        short: readString(row.short) || name,
      }
    })
    .filter((item) => item.id)
}

const matchClass = (
  classes: EduPageClass[],
  requested?: string | null,
): EduPageClass | null => {
  if (!requested) return null

  const byId = classes.find((item) => item.id === requested)
  if (byId) return byId

  const requestedKey = getClassKey(requested)

  if (requestedKey) {
    /* Параллель не подменяем: если «10F» не нашёлся, лучше показать ошибку */
    return (
      classes.find(
        (item) =>
          getClassKey(item.name) === requestedKey ||
          getClassKey(item.short) === requestedKey,
      ) ?? null
    )
  }

  const grade = getClassGrade(requested)

  /* В профиле указан только класс обучения (например «10») */
  return grade
    ? (classes.find((item) => getClassGrade(item.name) === grade) ?? null)
    : null
}

/* ------------------------ Версии расписания ------------------------ */

const toTimetable = (info: EduPageTimetableInfo): EduPageTimetable => ({
  ttNum: readString(info.tt_num),
  dateFrom: isIsoDate(info.datefrom) ? info.datefrom : '',
  hidden: Boolean(info.hidden),
})

/*
  Скрытую версию расписания школа не публикует. Такая версия годится
  только если относится к тому же учебному году, что и запрошенная дата,
  иначе легко отдать расписание давностью в год-два: например, у школы
  hbsh последняя версия — 2025/2026, а у niskokshetau — 2022/2023.
*/
const isUsableTimetable = (
  item: EduPageTimetable,
  selectedDate: string,
): boolean => {
  if (!item.hidden) return true

  return (
    Boolean(item.dateFrom) &&
    schoolYearFromDate(item.dateFrom) === schoolYearFromDate(selectedDate)
  )
}

const chooseActiveTimetable = (
  timetables: EduPageTimetable[],
  selectedDate: string,
  defaultNum?: string,
): EduPageTimetable | null => {
  const pool = timetables.filter((item) =>
    isUsableTimetable(item, selectedDate),
  )

  if (pool.length === 0) return null

  const sorted = [...pool].sort((first, second) =>
    first.dateFrom.localeCompare(second.dateFrom),
  )

  const byDate = [...sorted]
    .filter((item) => item.dateFrom && item.dateFrom <= selectedDate)
    .at(-1)

  if (byDate) return byDate

  return (
    sorted.find((item) => item.ttNum === readString(defaultNum)) ??
    sorted[sorted.length - 1] ??
    null
  )
}

const getGlobalsSettings = (tables: EduPageTable[]): EduPageRow => {
  const raw = findTable(tables, 'globals')?.data_rows?.[0]?.settings

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return typeof parsed === 'object' && parsed != null
        ? (parsed as EduPageRow)
        : {}
    } catch {
      return {}
    }
  }

  return typeof raw === 'object' && raw != null ? (raw as EduPageRow) : {}
}

/* Строка «Действительность: 13/09/2026-31/12/2026» -> диапазон ISO */
const parseValidityRange = (value: string) => {
  const match = value.match(
    /(\d{1,2})[./](\d{1,2})[./](\d{4})\s*[-–]\s*(\d{1,2})[./](\d{1,2})[./](\d{4})/,
  )

  if (!match) return null

  const [, fromDay, fromMonth, fromYear, toDay, toMonth, toYear] = match

  return {
    dateFrom: `${fromYear}-${pad(Number(fromMonth))}-${pad(Number(fromDay))}`,
    dateTo: `${toYear}-${pad(Number(toMonth))}-${pad(Number(toDay))}`,
  }
}

/* --------------------------- Уроки --------------------------- */

/* Маска EduPage выровнена по началу недели: «00010» — четверг */
const maskToDayIndexes = (mask: string, daysCount: number) => {
  const normalized = mask.replace(/[^01]/g, '')
  if (!normalized) return [] as number[]

  const value =
    normalized.length < daysCount
      ? normalized.padEnd(daysCount, '0')
      : normalized.slice(0, daysCount)

  return value
    .split('')
    .flatMap((char, index) => (char === '1' ? [index] : []))
}

/* В card.days обычно лежит готовая маска, но бывает и ссылка на daysdef */
const resolveDayMasks = (
  card: EduPageRow,
  lesson: EduPageRow,
  daysdefs: Record<string, EduPageRow>,
) => {
  const raw = readString(card.days) || readString(card.daysmask)

  if (/^[01]{3,}$/.test(raw)) return [raw]

  const defId =
    raw || readString(card.daysdefid) || readString(lesson.daysdefid)
  const vals = daysdefs[defId]?.vals

  return Array.isArray(vals) ? vals.map((item) => String(item)) : []
}

const buildCurrentLessons = (
  weekDates: string[],
  items: EduPageCurrentItem[],
  lookups: EduPageLookups,
  classId: string,
) => {
  const byDate: Record<string, EduPageLesson[]> = {}

  for (const date of weekDates) byDate[date] = []

  for (const item of items) {
    if (item.type !== 'card') continue

    const date = readString(item.date)
    const bucket = byDate[date]

    if (!bucket) continue

    const classIds = stringArray(item.classids)
    if (classIds.length > 0 && !classIds.includes(classId)) continue

    const numberStart = resolvePeriodNumber(lookups.periods, item.uniperiod)
    const duration = Number(item.durationperiods ?? 1)
    const totalPeriods =
      Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1
    const numberEnd =
      numberStart == null ? null : numberStart + Math.max(totalPeriods - 1, 0)

    const start =
      readString(item.starttime) ||
      getPeriodTime(lookups.periods, numberStart, 'starttime')
    const end =
      readString(item.endtime) ||
      getPeriodTime(lookups.periods, numberEnd, 'endtime')

    bucket.push({
      numberStart,
      numberEnd,
      time: [start, end].filter(Boolean).join('–'),
      subject: getSubjectName(lookups.subjects[readString(item.subjectid)]),
      teacher: stringArray(item.teacherids)
        .map((id) => getTeacherName(lookups.teachers[id]))
        .filter(Boolean)
        .join(', '),
      classroom: stringArray(item.classroomids)
        .map((id) => getClassroomName(lookups.classrooms[id], id))
        .filter(Boolean)
        .join(', '),
    })
  }

  return byDate
}

/* Постоянное (регулярное) расписание — используется для недель вне периода действия */
const buildRegularLessons = (
  tables: EduPageTable[],
  classId: string,
  weekDates: string[],
) => {
  const lookups: EduPageLookups = {
    subjects: makeLookup(tables, 'subjects'),
    teachers: makeLookup(tables, 'teachers'),
    classrooms: makeLookup(tables, 'classrooms'),
    periods: makeLookup(tables, 'periods'),
  }
  const daysdefs = makeLookup(tables, 'daysdefs')
  const lessons = findTable(tables, 'lessons')?.data_rows ?? []
  const cards = findTable(tables, 'cards')?.data_rows ?? []

  const cardsByLesson: Record<string, EduPageRow[]> = {}
  for (const card of cards) {
    const lessonId = readString(card.lessonid)
    if (!lessonId) continue

    const bucket = cardsByLesson[lessonId] ?? []
    bucket.push(card)
    cardsByLesson[lessonId] = bucket
  }

  const byDate: Record<string, EduPageLesson[]> = {}
  for (const date of weekDates) byDate[date] = []

  for (const lesson of lessons) {
    if (!stringArray(lesson.classids).includes(classId)) continue

    const subject = getSubjectName(
      lookups.subjects[readString(lesson.subjectid)],
      readString(lesson.subjectid) || 'Урок',
    )
    const teacher = stringArray(lesson.teacherids)
      .map((id) => getTeacherName(lookups.teachers[id]))
      .filter(Boolean)
      .join(', ')

    for (const card of cardsByLesson[readString(lesson.id)] ?? []) {
      const numberStart = resolvePeriodNumber(lookups.periods, card.period)
      const duration = Number(card.durationperiods ?? lesson.durationperiods ?? 1)
      const totalPeriods =
        Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1
      const numberEnd =
        numberStart == null ? null : numberStart + Math.max(totalPeriods - 1, 0)

      const classroom = stringArray(card.classroomids)
        .map((id) => getClassroomName(lookups.classrooms[id], id))
        .filter(Boolean)
        .join(', ')

      const dayIndexes = resolveDayMasks(card, lesson, daysdefs).flatMap((mask) =>
        maskToDayIndexes(mask, weekDates.length),
      )

      for (const dayIndex of dayIndexes) {
        const date = weekDates[dayIndex]
        const bucket = date ? byDate[date] : undefined

        if (!bucket) continue

        const key = [numberStart, subject, teacher, classroom].join('|')
        const exists = bucket.some(
          (item) =>
            [item.numberStart, item.subject, item.teacher, item.classroom].join(
              '|',
            ) === key,
        )

        if (exists) continue

        bucket.push({
          numberStart,
          numberEnd,
          time: [
            getPeriodTime(lookups.periods, numberStart, 'starttime'),
            getPeriodTime(lookups.periods, numberEnd, 'endtime'),
          ]
            .filter(Boolean)
            .join('–'),
          subject,
          teacher,
          classroom,
        })
      }
    }
  }

  return byDate
}

/* --------------------------- Сборка дня --------------------------- */

const toScheduleLesson = (lesson: EduPageLesson): ScheduleLesson => ({
  number: lesson.numberStart ?? 0,
  numberEnd: lesson.numberEnd,
  time: lesson.time,
  subjectName: {
    kk: lesson.subject,
    ru: translateSubjectName(lesson.subject),
    en: lesson.subject,
  },
  teacher: lesson.teacher,
  classroom: lesson.classroom,
  isReplacement: false,
})

const buildScheduleDays = (
  weekDates: string[],
  lessonsByDate: Record<string, EduPageLesson[]>,
): ScheduleDay[] =>
  weekDates.map((date) => {
    const lessons = [...(lessonsByDate[date] ?? [])].sort(
      (first, second) =>
        (first.numberStart ?? 0) - (second.numberStart ?? 0),
    )
    const isWeekend = isoWeekdayIndex(date) >= 5 && lessons.length === 0

    return {
      date,
      lessons: lessons.map(toScheduleLesson),
      scheduleNotWorkingDay: {
        isNotWorkingDay: isWeekend,
        isWeekend,
        isHoliday: false,
        calendarEventName: {
          kk: 'Демалыс күні',
          ru: 'Выходной день',
          en: 'Day off',
        },
      },
    }
  })

/* --------------------------- Точка входа --------------------------- */

export const getEduPageSchedule = async (
  token: string,
  city: CityAbbr,
  options: EduPageScheduleOptions = {},
): Promise<Schedule> => {
  const host = getEduPageHost(city)

  if (!host) throw new Error('EDUPAGE_HOST_NOT_FOUND')

  const requestedDate = isIsoDate(options.date)
    ? options.date
    : toIsoDate(new Date())
  const weekDates = getWeekDates(requestedDate)
  const schoolYear = schoolYearFromDate(requestedDate)

  const viewerData = await fetchEduPageRpc<EduPageTTViewerData>(
    host,
    'ttviewer.js',
    'getTTViewerData',
    [null, schoolYear],
  )

  const activeTimetable = chooseActiveTimetable(
    (viewerData.regular?.timetables ?? [])
      .map(toTimetable)
      .filter((item) => item.ttNum),
    requestedDate,
    viewerData.regular?.default_num,
  )

  if (!activeTimetable) throw new Error('EDUPAGE_TIMETABLE_NOT_FOUND')

  const regularData = await fetchEduPageRpc<EduPageRegularData>(
    host,
    'regulartt.js',
    'regularttGetData',
    [null, activeTimetable.ttNum],
  )

  const tables = regularData.dbiAccessorRes?.tables ?? []
  const classes = buildClasses(tables)

  if (classes.length === 0) throw new Error('EDUPAGE_CLASSES_NOT_FOUND')

  const classQuery =
    options.classQuery ??
    (await getAdditionalUserInfo(token)
      .then((info) => info.data.Klass)
      .catch(() => null))
  const matchedClass = matchClass(classes, classQuery)

  if (!matchedClass) throw new Error('EDUPAGE_CLASS_NOT_FOUND')

  const lookups: EduPageLookups = {
    subjects: makeLookup(tables, 'subjects'),
    teachers: makeLookup(tables, 'teachers'),
    classrooms: makeLookup(tables, 'classrooms'),
    periods: makeLookup(tables, 'periods'),
  }

  const currentData = await fetchEduPageRpc<EduPageCurrentData>(
    host,
    'currenttt.js',
    'curentttGetData',
    [
      null,
      {
        year: schoolYear,
        datefrom: weekDates[0],
        dateto: weekDates[weekDates.length - 1],
        table: 'classes',
        id: matchedClass.id,
        showColors: true,
        showIgroupsInClasses: true,
        showOrig: false,
        log_module: 'adaption.schedule',
      },
    ],
  ).catch(() => null)

  const currentLessons = buildCurrentLessons(
    weekDates,
    currentData?.ttitems ?? [],
    lookups,
    matchedClass.id,
  )
  const hasCurrentLessons = Object.values(currentLessons).some(
    (lessons) => lessons.length > 0,
  )

  if (hasCurrentLessons) {
    return { scheduleDays: buildScheduleDays(weekDates, currentLessons) }
  }

  /*
    Актуального расписания на неделю нет. Если она вне периода действия
    опубликованного расписания (например, каникулы или новый семестр),
    показываем постоянное расписание, иначе — честно пустой день.
  */
  const globalsSettings = getGlobalsSettings(tables)
  const validity =
    parseValidityRange(
      readString(globalsSettings.m_strDateBellowTimeTable),
    ) ??
    (activeTimetable.dateFrom
      ? { dateFrom: activeTimetable.dateFrom, dateTo: null }
      : null)
  const withinActiveRange =
    validity != null &&
    (!validity.dateFrom || validity.dateFrom <= requestedDate) &&
    (!validity.dateTo || requestedDate <= validity.dateTo)

  const lessonsByDate = withinActiveRange
    ? currentLessons
    : buildRegularLessons(tables, matchedClass.id, weekDates)

  return { scheduleDays: buildScheduleDays(weekDates, lessonsByDate) }
}

export default getEduPageSchedule
