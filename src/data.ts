export type Mode = 'words' | 'sentences' | 'code' | 'symbols'
export type Language = 'ru' | 'en'
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const difficultyInfo: { level: Difficulty; name: string; detail: string }[] = [
  { level: 1, name: 'Разминка', detail: 'Короткие слова, строчные буквы' },
  { level: 2, name: 'Темп', detail: 'Больше слов и длиннее серия' },
  { level: 3, name: 'Точность', detail: 'Длинные слова и предложения' },
  { level: 4, name: 'Регистр', detail: 'Заглавные буквы и пунктуация' },
  { level: 5, name: 'Числа', detail: 'Цифры, даты и знаки' },
  { level: 6, name: 'Сложный набор', detail: 'Плотный текст и смена регистра' },
  { level: 7, name: 'Дистанция', detail: 'Длинная серия без пауз' },
  { level: 8, name: 'Эксперт', detail: 'Длинный текст с символами и разным регистром' },
]

export const modes: { id: Mode; title: string; subtitle: string; icon: string }[] = [
  { id: 'words', title: 'Слова', subtitle: 'Серии слов', icon: '01' },
  { id: 'sentences', title: 'Предложения', subtitle: 'Связный текст', icon: '02' },
  { id: 'code', title: 'Код', subtitle: 'Синтаксис и отступы', icon: '03' },
  { id: 'symbols', title: 'Символы', subtitle: 'Знаки и цифры', icon: '04' },
]

const words = {
  ru: ['мир', 'дом', 'код', 'луч', 'ритм', 'книга', 'экран', 'палец', 'скорость', 'точность', 'движение', 'привычка', 'развитие', 'клавиша', 'печать', 'слово', 'старт', 'уровень', 'время', 'сила', 'путь', 'фокус', 'работа', 'память', 'задача', 'команда', 'практика', 'система', 'минута', 'навык', 'ошибка', 'результат', 'последовательность', 'взаимодействие', 'производительность', 'концентрация', 'ответственность'],
  en: ['go', 'up', 'run', 'code', 'type', 'focus', 'learn', 'speed', 'skill', 'level', 'screen', 'finger', 'rhythm', 'motion', 'practice', 'balance', 'streak', 'result', 'keyboard', 'accuracy', 'system', 'project', 'future', 'bright', 'moment', 'concentration', 'responsibility', 'performance', 'development', 'consistency'],
}

const sentences = {
  ru: ['Смотри на экран и держи руки на клавиатуре.', 'Скорость зависит от точности каждого нажатия.', 'После ошибки верни внимание к текущему символу.', 'Короткие занятия помогают закрепить навык.', 'На сложном участке полезно снизить скорость.', 'Регулярная практика улучшает результат.'],
  en: ['Keep your eyes on the screen and your hands on the keyboard.', 'Typing speed depends on the accuracy of each key press.', 'After an error, return your attention to the current character.', 'Short sessions make it easier to build a steady habit.', 'Slow down when a line becomes difficult.', 'Regular practice improves your results.'],
}

const snippets = [
  { language: 'Python', text: 'def greet(name):\n    return f"Hello, {name}!"' },
  { language: 'JavaScript', text: 'const square = (n) => n * n;\nconsole.log(square(5));' },
  { language: 'HTML', text: '<main class="hero">\n  <h1>Hello, world!</h1>\n</main>' },
  { language: 'CSS', text: '.hero {\n  display: grid;\n  gap: 16px;\n}' },
  { language: 'TypeScript', text: 'type User = { id: number; name: string };\nconst ids = users.map((user) => user.id);' },
  { language: 'SQL', text: 'SELECT name, COUNT(*) AS total\nFROM users\nGROUP BY name\nORDER BY total DESC;' },
  { language: 'Python', text: 'for item in items:\n    print(item.title())' },
  { language: 'JavaScript', text: 'const colors = ["blue", "green"];\ncolors.push("gold");' },
  { language: 'HTML', text: '<button type="button">Open menu</button>' },
  { language: 'CSS', text: '.card:hover {\n  transform: translateY(-2px);\n}' },
  { language: 'TypeScript', text: 'interface Point { x: number; y: number }\nconst origin: Point = { x: 0, y: 0 };' },
  { language: 'SQL', text: 'SELECT title, created_at\nFROM notes\nWHERE is_public = TRUE;' },
  { language: 'Python', text: 'def clamp(value, low, high):\n    return max(low, min(value, high))' },
  { language: 'JavaScript', text: 'const total = prices.reduce((sum, price) => sum + price, 0);' },
  { language: 'HTML', text: '<nav aria-label="Main menu">\n  <a href="/">Home</a>\n</nav>' },
  { language: 'CSS', text: '@media (max-width: 700px) {\n  .grid { grid-template-columns: 1fr; }\n}' },
  { language: 'TypeScript', text: 'type Status = "idle" | "loading" | "done";\nlet status: Status = "idle";' },
  { language: 'SQL', text: 'UPDATE tasks\nSET completed = TRUE\nWHERE id = 42;' },
  { language: 'Python', text: 'with open("notes.txt") as file:\n    lines = file.readlines()' },
  { language: 'JavaScript', text: 'async function loadUser(id) {\n  return await fetch(`/users/${id}`);\n}' },
  { language: 'HTML', text: '<form action="/search">\n  <input name="q" required>\n</form>' },
  { language: 'CSS', text: ':root {\n  --space: 12px;\n  --accent: #72b7e8;\n}' },
  { language: 'TypeScript', text: 'function first<T>(items: T[]): T | undefined {\n  return items[0];\n}' },
  { language: 'SQL', text: 'SELECT user_id, SUM(amount) AS balance\nFROM payments\nGROUP BY user_id;' },
  { language: 'Python', text: 'scores = {"Ada": 98, "Lin": 91}\nprint(sorted(scores.items()))' },
  { language: 'JavaScript', text: 'const ready = tasks.every(({ done }) => done);\nif (ready) start();' },
  { language: 'HTML', text: '<article class="story">\n  <h2>Small discoveries</h2>\n</article>' },
  { language: 'CSS', text: '.panel {\n  padding: 1rem 1.5rem;\n  border-radius: 8px;\n}' },
  { language: 'TypeScript', text: 'const byId = new Map<number, User>();\nbyId.set(user.id, user);' },
  { language: 'SQL', text: 'SELECT category, AVG(score)\nFROM results\nHAVING AVG(score) > 80;' },
]

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const repeat = <T,>(count: number, make: () => T): T[] => Array.from({ length: count }, make)
const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
const sampleUnique = <T,>(items: T[], count: number): T[] => shuffle(items).slice(0, count)

const extendedWords = {
  ru: [...words.ru, 'лес', 'река', 'ветер', 'снег', 'мост', 'лист', 'гора', 'озеро', 'свет', 'звук', 'птица', 'облако', 'дорога', 'город', 'дерево', 'звезда', 'корабль', 'история', 'встреча', 'решение', 'вопрос', 'ответ', 'событие', 'защита', 'запись', 'картина', 'погода', 'вечер', 'утро', 'весна', 'осень', 'яблоко', 'страница', 'зеркало', 'площадь', 'спокойствие', 'наблюдение', 'воображение', 'исследование', 'путешествие', 'самостоятельность', 'любопытство', 'открытие', 'уверенность', 'творчество', 'внимательность', 'впечатление', 'приглашение', 'представление', 'преимущество'],
  en: [...words.en, 'forest', 'river', 'wind', 'snow', 'bridge', 'leaf', 'mountain', 'lake', 'light', 'sound', 'bird', 'cloud', 'road', 'city', 'tree', 'star', 'ship', 'story', 'meeting', 'choice', 'question', 'answer', 'event', 'safety', 'record', 'picture', 'weather', 'evening', 'morning', 'spring', 'autumn', 'apple', 'page', 'mirror', 'square', 'quiet', 'observe', 'imagine', 'explore', 'journey', 'independent', 'curiosity', 'discovery', 'careful', 'creative', 'confident', 'wonderful', 'comfortable', 'everywhere', 'remarkable', 'understand', 'improvement', 'achievement', 'thoughtful', 'adventure', 'possibility', 'celebrate', 'connection', 'experience', 'attention', 'precision', 'expression', 'beautiful', 'challenge', 'direction', 'knowledge', 'rhythmical', 'determined', 'opportunity'],
}

const extendedSentences = {
  ru: [...sentences.ru, 'Тихий ветер качает ветви над рекой.', 'Утром город просыпается постепенно.', 'Каждая новая задача начинается с первого шага.', 'Яркая звезда появилась над лесом.', 'Небольшая пауза помогает сохранить внимание.', 'На странице осталась важная заметка.', 'Команда проверила план перед началом работы.', 'Дорога к озеру проходит через старый парк.', 'Тёплый свет ложится на деревянный стол.', 'Мы заметили облака над высокой горой.', 'Спокойный ритм помогает печатать ровнее.', 'Вечером книга ждала читателя у окна.', 'Новый маршрут открыл красивый вид на город.', 'В каждом ответе важны ясность и точность.', 'Птица быстро перелетела через широкий мост.', 'Исследование началось с простого вопроса.', 'Путешествие запомнилось встречами и открытиями.', 'Осенний дождь тихо стучал по крыше.', 'Солнечный луч осветил пустую комнату.', 'План изменился после короткого разговора.', 'Ученик внимательно прочитал новое задание.', 'Вдали показались огни вечернего города.', 'Удобная привычка формируется постепенно.', 'Заметки помогают не забыть важные детали.'],
  en: [...sentences.en, 'A quiet wind moves the branches above the river.', 'The city wakes up slowly in the morning.', 'Every new task begins with a single step.', 'A bright star appeared above the forest.', 'A short break can help you stay focused.', 'An important note remained on the page.', 'The team checked the plan before work began.', 'The road to the lake runs through an old park.', 'Warm light falls across the wooden table.', 'We watched clouds gather over the mountain.', 'A steady rhythm makes typing feel easier.', 'In the evening, a book waited beside the window.', 'A new route revealed a beautiful view of the city.', 'Clear answers depend on careful thought.', 'A bird flew quickly across the old bridge.', 'The study began with a simple question.', 'The journey brought new friends and discoveries.', 'Autumn rain tapped softly against the roof.', 'A ray of sunlight crossed the quiet room.', 'The plan changed after a brief conversation.', 'The student read the new task carefully.', 'Lights appeared across the evening city.', 'A useful habit grows through regular practice.', 'Notes help us remember important details.'],
}

export function makeExercise(mode: Mode, language: Language, difficulty: Difficulty) {
  if (mode === 'words') {
    const maxLength = difficulty === 1 ? 5 : difficulty === 2 ? 7 : 10
    const pool = extendedWords[language].filter((word) => word.length <= maxLength)
    const count = [0, 12, 20, 28, 32, 38, 46, 58, 72][difficulty]
    const shuffledPool = sampleUnique(pool, pool.length)
    const selectedWords = Array.from({ length: count }, (_, index) => shuffledPool[index % shuffledPool.length])
    const text = selectedWords.map((item, index) => {
      let word = item
      if (difficulty >= 4 && index % 5 === 2) word = word[0].toUpperCase() + word.slice(1)
      if (difficulty >= 5 && index % 7 === 3) word += pick(['-18', '-42', '-307', '_24'])
      if (difficulty >= 6 && index % 4 === 1) word += pick([',', ';', ':', '!'])
      if (difficulty >= 7 && index % 6 === 4) word = `(${word})`
      if (difficulty >= 8 && index % 8 === 5) word = `"${word}"`
      return word
    }).join(' ')
    return { text, label: 'Слова' }
  }
  if (mode === 'sentences') {
    const count = [0, 1, 2, 3, 4, 5, 6, 8, 10][difficulty]
    const text = sampleUnique(extendedSentences[language], count).map((sentence, index) => {
      let line = sentence
      if (difficulty >= 4 && index % 3 === 1) line = `${line.slice(0, -1)}; ${language === 'ru' ? 'проверь каждую клавишу' : 'check each key'}.`
      if (difficulty >= 5 && index % 2 === 0) line = `${line.slice(0, -1)} (${2020 + Math.floor(Math.random() * 10)}).`
      if (difficulty >= 6 && index % 3 === 2) line = `"${line}"`
      if (difficulty >= 7 && index % 4 === 1) line = `${line.slice(0, -1)} — ${language === 'ru' ? 'шаг' : 'step'} ${Math.floor(10 + Math.random() * 90)}.`
      if (difficulty >= 8 && index % 3 === 0) line = line.toUpperCase()
      return line
    }).join(difficulty >= 6 ? '\n' : ' ')
    return { text, label: 'Предложения' }
  }
  if (mode === 'code') {
    const count = [0, 1, 2, 2, 3, 4, 5, 6, 8][difficulty]
    const codePool = difficulty <= 2 ? snippets.slice(0, 6) : snippets
    const pieces = sampleUnique(codePool, count)
    let text = pieces.map((piece) => piece.text).join('\n\n')
    if (difficulty >= 4) text += '\n// TODO: check(value_42);'
    if (difficulty >= 5) text += '\nconst labels = ["ready", "waiting", "done"];'
    if (difficulty >= 6) text += '\nconst result = (a, b) => ({ total: a + b, ok: true });'
    if (difficulty >= 7) text += '\nasync function update(id: number) {\n  const response = await fetch(`/items/${id}`);\n  return response.json();\n}'
    if (difficulty >= 8) text += '\nif (result.ok && result.total >= 42) { console.log("ready!"); }'
    return { text, label: pieces.length === 1 ? pieces[0].language : 'Фрагменты кода' }
  }
  const alphabet = language === 'ru' ? 'абвгдежзийклмнопрстуфхцчшщъыьэюяё' : 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const punctuation = language === 'ru' ? '!"№;%:?*()-_=+,.' : '!@#$%&*+-=?/;:()_[]{}'
  const simpleLetters = language === 'ru' ? 'аоиестнвркм' : 'etaoinshrdl'
  const pool = difficulty === 1 ? simpleLetters : difficulty === 2 ? alphabet : difficulty <= 4 ? `${alphabet}${digits}` : difficulty <= 6 ? `${alphabet}${alphabet.toUpperCase()}${digits}${punctuation}` : `${alphabet}${alphabet.toUpperCase()}${digits}${punctuation}${language === 'ru' ? '№ёЁ' : "'\\`"}`
  const groupCount = [0, 5, 7, 9, 11, 13, 16, 20, 24][difficulty]
  const groupSize = difficulty === 1 ? 5 : difficulty <= 4 ? 8 : difficulty <= 6 ? 10 : 12
  const characters = pool.split('')
  const text = repeat(groupCount, () => {
    const shuffled = sampleUnique(characters, characters.length)
    return Array.from({ length: groupSize }, (_, index) => shuffled[index % shuffled.length]).join('')
  }).join(' ')
  return { text, label: 'Символы' }
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export const rarityNames: Record<Rarity, string> = {
  common: 'Обычное', uncommon: 'Необычное', rare: 'Редкое', epic: 'Эпическое', legendary: 'Легендарное',
}

export const achievementInfo: { key: string; name: string; description: string; rarity: Rarity }[] = [
  { key: 'first', name: 'Первый шаг', description: '3 занятия: 40+ знаков и 15+ секунд', rarity: 'common' },
  { key: 'five', name: 'Вошёл во вкус', description: '12 занятий: 40+ знаков и 15+ секунд', rarity: 'common' },
  { key: 'clean', name: 'Чистая строка', description: '120 знаков без единой ошибки', rarity: 'uncommon' },
  { key: 'thousand', name: 'Пять тысяч', description: 'Напечатать 5 000 знаков всего', rarity: 'uncommon' },
  { key: 'regular', name: 'Ритм', description: '7 дней: по 40+ знаков и 15+ секунд', rarity: 'uncommon' },
  { key: 'speed', name: 'Быстрые пальцы', description: '260 зн/мин на дистанции 120 знаков', rarity: 'rare' },
  { key: 'streak', name: 'Серия без ошибок', description: '240 знаков без единой ошибки', rarity: 'rare' },
  { key: 'polyglot', name: 'Два языка', description: 'По 3 занятия RU и EN: 100+ знаков, 15+ секунд', rarity: 'rare' },
  { key: 'all_modes', name: 'Все режимы', description: 'По 3 занятия в 4 режимах: ур. 3+, 40+ знаков, 15+ секунд', rarity: 'rare' },
  { key: 'precision', name: 'Почти идеально', description: 'Точность 99,5% на 300 знаках', rarity: 'epic' },
  { key: 'speed300', name: 'На ускорении', description: '400 зн/мин на дистанции 200 знаков', rarity: 'epic' },
  { key: 'ten_thousand', name: 'Большая дистанция', description: 'Напечатать 50 000 знаков всего', rarity: 'epic' },
  { key: 'week', name: 'Три недели', description: '21 день: по 40+ знаков и 15+ секунд', rarity: 'legendary' },
  { key: 'expert', name: 'Восьмой уровень', description: 'Дважды пройти ур. 8 без ошибок: 350+ знаков', rarity: 'legendary' },
]

export const modeName: Record<Mode, string> = { words: 'Слова', sentences: 'Предложения', code: 'Код', symbols: 'Символы' }

export function prettyChar(char: string): string {
  if (char === ' ') return 'пробел'
  if (char === '\n') return 'Enter'
  return char
}
