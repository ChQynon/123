import { CityAbbr } from '@/shared/constants/cities'

/*
  Школы НИШ публикуют расписание в EduPage — это тот же источник, который
  показывает официальный сайт школы в разделе «Расписание». Он публичный:
  ни токен, ни авторизация не нужны.

  Карта собрана и проверена вручную: для каждого хоста запрашивался
  ttviewer.js?__func=getTTViewerData и сверялось название школы в <title>.
  Поэтому сюда попадают только однозначно опознанные школы.

  hasPublicTimetable = false означает, что аккаунт EduPage у школы есть,
  но раздел расписания пуст (все версии скрыты — школа их не публиковала).
  Для таких городов расписание берётся из micros-сервиса.
*/
export type EduPageSchool = {
  host: string
  hasPublicTimetable: boolean
}

const EDUPAGE_SCHOOLS: Partial<Record<CityAbbr, EduPageSchool>> = {
  /* Расписание опубликовано, данные проверены */
  ura: { host: 'nisuralsk', hasPublicTimetable: true },
  pvl: { host: 'nis-pvl', hasPublicTimetable: true },
  trz: { host: 'nistaraz', hasPublicTimetable: true },
  tk: { host: 'nistaldykorgan', hasPublicTimetable: true },
  ptr: { host: 'nispetropavlovsk', hasPublicTimetable: true },
  kzl: { host: 'niskzl', hasPublicTimetable: true },
  kst: { host: 'kstnis', hasPublicTimetable: true },
  krg: { host: 'niskaraganda', hasPublicTimetable: true },
  atr: { host: 'nisatyrau', hasPublicTimetable: true },
  akb: { host: 'nisaktobe', hasPublicTimetable: true },
  akt: { host: 'nisaktau', hasPublicTimetable: true },
  fmalm: { host: 'fmalmnis', hasPublicTimetable: true },
  /* Название хоста совпадает с районом Наурызбай (Алматы) — это НИШ ХБН */
  hbalm: { host: 'hba', hasPublicTimetable: true },

  /* Аккаунт есть, но школа не опубликовала расписание */
  hbsh: { host: 'hbsh', hasPublicTimetable: false },
  ukk: { host: 'nisoskemen', hasPublicTimetable: false },
  kt: { host: 'niskokshetau', hasPublicTimetable: false },
  ast: { host: 'phmnisastana', hasPublicTimetable: false },
  sm: { host: 'semey', hasPublicTimetable: false },
}

/* У города fmsh (Шымкент, ФМН) аккаунта EduPage найти не удалось. */

export const getEduPageSchool = (
  city: CityAbbr,
): EduPageSchool | undefined => EDUPAGE_SCHOOLS[city]

export const getEduPageHost = (city: CityAbbr): string | undefined =>
  EDUPAGE_SCHOOLS[city]?.host

/*
  Публикует ли школа расписание в EduPage. Если нет — нет смысла ходить
  в EduPage за расписанием, сразу используем micros-сервис.
*/
export const hasPublicEduPageTimetable = (city: CityAbbr): boolean =>
  EDUPAGE_SCHOOLS[city]?.hasPublicTimetable ?? false
