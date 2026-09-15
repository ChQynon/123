import { Hono } from 'hono'
import { authMiddleware } from '@/app/api/[[...route]]/route'
import { decode } from '@/lib/token/jwt'
import { Schedule, Userinfo } from '@/shared/types'
import { getAdditionalUserInfo } from '@/features/getAdditionalUserInfo'
import { Session } from '@/lib/token/resolver'
import { getJournal } from '@/features/getJournal'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { getJournalElement } from '@/features/getJournalElement'
import { isAxiosError } from 'axios'
import { getReports } from '@/features/getReports'
import { getSchedule } from '@/features/getSchedule'
import { getEduPageSchedule } from '@/features/getEduPageSchedule'
import { getCityNameByAbbr } from '@/shared/constants/cities'
import {
  getEduPageHost,
  hasPublicEduPageTimetable,
} from '@/shared/constants/edupage'

const app = new Hono<{
  Variables: {
    session: Session
  }
}>()

app.use(async (c, next) => authMiddleware(c, next))

app.get('/contingent', async (c) => {
  const rawUserInfo = await decode<{ UserInfo: string }>(
    c.get('session').accessToken,
  )

  const { FirstName, SecondName } = JSON.parse(rawUserInfo.UserInfo) as Userinfo

  const data = await getAdditionalUserInfo(c.get('session').accessToken)

  return c.json({
    ...data,
    firstName: FirstName,
    lastName: SecondName,
  })
})

app.get('/journal', async (c) => {
  const session = c.get('session')
  const journal = await getJournal(session.accessToken, session.city)

  return c.json(journal)
})

app.get('/journal/:subject', async (c) => {
  const session = c.get('session')
  const subjectId = c.req.param('subject')
  const quarter = z.coerce
    .number()
    .min(1)
    .max(4)
    .safeParse(c.req.query('quarter'))

  if (!quarter.success) {
    throw new HTTPException(400, {
      res: Response.json({
        message: 'Bad request',
        cause: 'Quarter index (quarter search param) is required',
      }),
    })
  }

  try {
    const data = await getJournalElement(
      session.accessToken,
      session.city,
      subjectId,
      quarter.data,
    )

    return c.json(data)
  } catch (e) {
    if (
      isAxiosError(e) &&
      e.response?.data.message.startsWith('предмет не найден')
    ) {
      throw new HTTPException(404, {
        res: Response.json({
          message: 'Not found',
          cause: 'Subject with id ' + subjectId + ' not found',
        }),
      })
    } else
      throw new HTTPException(503, {
        res: Response.json(
          {
            message: 'Service unavailable',
            cause: 'AEO NIS microservices are currently unavailable / down',
          },
          {
            status: 503,
          },
        ),
      })
  }
})

app.get('/reports', async (c) => {
  const { accessToken } = c.get('session')

  try {
    const reports = await getReports(accessToken)
    return c.json(reports)
  } catch (e) {
    console.log(e)

    throw new HTTPException(503, {
      res: Response.json(
        {
          message: 'Service unavailable',
          cause: 'AEO NIS microservices are currently unavailable / down',
        },
        {
          status: 503,
        },
      ),
    })
  }
})

/*
  Расписание собирается из двух источников, по очереди:

  1. EduPage — публичное расписание школы (то же, что на её официальном
     сайте). Работает без токена и покрывает большинство городов.
  2. micros — официальный сервис расписания НИШ. Требует токен, зато
     заведён для всех 19 городов проекта, включая те школы, которые
     расписание в EduPage не публикуют.

  Первый источник, который отдал данные, выигрывает. Если оба ответили
  «данных нет» (а не сетевой ошибкой) — значит школа расписание не
  публикует, и это отдаётся отдельным кодом, чтобы UI показал понятный
  текст вместо «сервис недоступен». В конце EduPage пробуется ещё раз,
  уже для школ без опубликованного расписания.
*/
const SCHEDULE_NOT_PUBLISHED = 'SCHEDULE_NOT_PUBLISHED'
const SCHEDULE_UNAVAILABLE = 'SCHEDULE_UNAVAILABLE'

const describeFailure = (e: unknown): string => {
  if (isAxiosError(e)) {
    const status = e.response?.status
    const message = (e.response?.data as { message?: string } | undefined)
      ?.message

    return `HTTP ${status ?? 'ERR'}${message ? ' ' + message : ''}`
  }

  return e instanceof Error ? e.message : 'unknown'
}

/*
  «Данных нет» — это отсутствие опубликованного расписания в EduPage или
  ответ 400/404 от micros («нет доступа к данным», город не найден).
  Такие случаи не лечатся повтором запроса, в отличие от 401 (истёк
  токен) или 5xx — это уже сбой сервиса, и о нём честнее сказать прямо.
*/
const isMissingDataFailure = (failure: string): boolean =>
  /EDUPAGE_(TIMETABLE|CLASSES|CLASS)_NOT_FOUND/.test(failure) ||
  /HTTP (400|404)\b/.test(failure)

app.get('/schedule', async (c) => {
  const session = c.get('session')
  const cityName = getCityNameByAbbr(session.city)

  if (!cityName) {
    throw new HTTPException(400, {
      res: Response.json({
        message: 'Bad request',
        cause: 'Unknown city abbreviation in session token',
      }),
    })
  }

  const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(c.req.query('date'))
  const requestedDate = date.success ? date.data : undefined

  const failures: string[] = []

  const loadFromEduPage = () =>
    getEduPageSchedule(session.accessToken, session.city, {
      date: requestedDate,
      classQuery: c.req.query('class') ?? null,
    })

  const loadFromMicros = () =>
    getSchedule(session.accessToken, cityName, requestedDate)

  /* Источник, который упал, не роняет запрос — просто идём к следующему. */
  const trySource = async (
    name: string,
    load: () => Promise<Schedule>,
  ): Promise<Schedule | null> => {
    try {
      return await load()
    } catch (e) {
      failures.push(name + ': ' + describeFailure(e))

      return null
    }
  }

  const publishesInEduPage = hasPublicEduPageTimetable(session.city)

  /* 1. EduPage — публичное расписание школы, без токена. */
  if (publishesInEduPage) {
    const schedule = await trySource('edupage', loadFromEduPage)

    if (schedule) return c.json(schedule)
  }

  /* 2. micros — официальный сервис расписания, покрывает все города. */
  const fromMicros = await trySource('micros', loadFromMicros)

  if (fromMicros) return c.json(fromMicros)

  /*
    3. EduPage для школ, которые на момент проверки расписание не
    публиковали. Это состояние может измениться, поэтому пробуем ещё раз
    как последний шанс — раньше micros его перекрывал.
  */
  if (!publishesInEduPage && getEduPageHost(session.city)) {
    const schedule = await trySource('edupage', loadFromEduPage)

    if (schedule) return c.json(schedule)
  }

  console.error('[schedule]', session.city, failures)

  const notPublished = failures.every(isMissingDataFailure)

  throw new HTTPException(notPublished ? 404 : 503, {
    res: Response.json(
      {
        message: notPublished
          ? 'Schedule is not published'
          : 'Schedule service is unavailable',
        cause: notPublished
          ? 'Neither EduPage nor micros has a published schedule for this school'
          : 'Schedule sources are currently unavailable / down',
        code: notPublished ? SCHEDULE_NOT_PUBLISHED : SCHEDULE_UNAVAILABLE,
        details: failures.join(' | '),
      },
      { status: notPublished ? 404 : 503 },
    ),
  })
})

export default app
