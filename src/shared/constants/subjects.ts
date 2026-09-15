/*
  Часть предметов школы заводят в EduPage латиницей («Mathematics», «Biology»),
  а официальный сайт показывает их по-русски. Небольшой словарь приводит такие
  названия к русскому виду. Всё, чего нет в словаре, остаётся как в источнике.
*/
const SUBJECT_NAMES_RU: Record<string, string> = {
  mathematics: 'Математика',
  biology: 'Биология',
  chemistry: 'Химия',
  physics: 'Физика',
  geography: 'География',
  'english language': 'Английский язык',
  'kazakh language and literature': 'Казахский язык и литература',
  'russian language and literature': 'Русский язык и литература',
  'world history': 'Всемирная история',
  'history of kazakhstan': 'История Казахстана',
  informatics: 'Информатика',
  'computer science': 'Информатика',
  programming: 'Программирование',
  'physical education': 'Физическая культура',
  art: 'Искусство',
  music: 'Музыка',
  economics: 'Экономика',
  'global perspectives and project work': 'ГППР',
  'basics of law': 'Основы права',
  'robotics': 'Робототехника',
}

export const translateSubjectName = (name: string) =>
  SUBJECT_NAMES_RU[name.trim().toLowerCase()] ?? name
