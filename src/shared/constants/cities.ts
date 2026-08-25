const CITIES: Record<string, string> = {
  Uralsk: 'ura',
  Pavlodar: 'pvl',
  Taraz: 'trz',
  Taldykorgan: 'tk',
  Shymkent_HBSH: 'hbsh',
  Shymkent_FMSH: 'fmsh',
  Semey: 'sm',
  Petropavlovsk: 'ptr',
  Oskemen: 'ukk',
  Kyzylorda: 'kzl',
  Kostanay: 'kst',
  Kokshetau: 'kt',
  Karaganda: 'krg',
  Atyrau: 'atr',
  Aktobe: 'akt',
  Aktau: 'akt',
  Astana_FMSH: 'ast',
  Almaty_HBSH: 'hbalm',
  Almaty_Fmsh: 'fmalm',
}

export default CITIES

export type CityAbbr = (typeof CITIES)[keyof typeof CITIES]
export type CityFullName = keyof typeof CITIES

/* Обратная карта: аббревиатура -> полное имя города.
   Первое вхождение выигрывает (коллизия akt: Aktobe/Aktau). */
const CITY_NAME_BY_ABBR: Record<string, CityFullName> = {}

for (const [name, abbr] of Object.entries(CITIES)) {
  if (!(abbr in CITY_NAME_BY_ABBR)) {
    CITY_NAME_BY_ABBR[abbr] = name as CityFullName
  }
}

export const getCityNameByAbbr = (
  abbr: string,
): CityFullName | undefined => CITY_NAME_BY_ABBR[abbr]
