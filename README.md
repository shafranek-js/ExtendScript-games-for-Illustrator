# ExtendScript Games for Adobe Illustrator

Seven playable games that run **inside Adobe Illustrator** — pure ExtendScript + ScriptUI, drawn with `ScriptUIGraphics`, no raster assets and no plugins.

**Quick start:** download the repo, then in Illustrator open `File > Scripts > Other Script…` → `Play Arcade.jsx`. Pick a game by clicking its title or pressing `1`–`7`. Closing a game brings the launcher back.

- Tested on Illustrator 2021–2026 (Windows).
- Autonomous animation (the heartbeat that keeps objects moving) is Windows-only; on macOS a game advances while you move the mouse, and the status bar says so.
- `node tools/check.js` and `node tools/test-core.js` — static checks for syntax, encoding and i18n; Illustrator not required.

Русская документация — ниже.

---

# relax — аркадные игры для Adobe Illustrator (ExtendScript + ScriptUI)

Семь законченных игр, которые запускаются прямо внутри Illustrator и рисуются на `ScriptUIGraphics` без единого растрового ассета. Любую игровую сцену можно одним кликом превратить в редактируемый вектор на активной монтажной области.

| Игра | Файл | Что интересного |
|---|---|---|
| 2048 | `2048.jsx` | пошаговая, свайпы, 4×4, восстановление партии |
| Tetris | `Tetris.jsx` | 10×20, 7-bag, ghost piece, hold, восстановление партии |
| Arkanoid | `Arkanoid.jsx` | физика отскоков, 5 уровней, 5 капсул, лазеры, управление мышью |
| Snake | `Snake.jsx` | очередь поворотов, 3 режима арены, градиентное тело |
| Space Invaders | `SpaceInvaders.jsx` | строй 5×9, двухкадровая анимация, бункеры, UFO |
| Boulder Dash | `BoulderDash.jsx` | клеточная физика валунов, ИИ монстров, 5 пещер |
| Pac-Man | `PacMan.jsx` | лабиринт 19×21, 4 призрака, режим «испуга» |

## Как запустить

**Самый простой способ — лаунчер:** `File > Scripts > Other Script…` → `Play Arcade.jsx`.

Откроется одно окно со всеми играми: клик по названию или клавиши `1–7`, `★ Random` для случайной игры, `Folder` открывает папку, `❖ Docs` — этот README. После закрытия игры лаунчер возвращается, так что следующую можно запустить сразу. `Esc` — выход.

Лаунчер не зависит от `#include`: он сам разворачивает подключаемые файлы в один временный скрипт и запускает его, поэтому ошибки в `lib/` не мешают ему хотя бы показать сообщение.

**Запуск отдельной игры напрямую:** `File > Scripts > Other Script…` → выбрать `.jsx` игры (или положите папку `relax` в `Presets/Scripts`, тогда `File > Scripts > relax > …`).

Управление: стрелки/WASD, `Space`, `Esc` для закрытия. Мышь работает в Arkanoid и Space Invaders, свайпы — в 2048, Snake, Boulder Dash, Tetris.

**Папку `lib/` нужно копировать вместе с играми** — игры подключают её через `#include`. Скопированный в одиночку `.jsx` не запустится.

## Структура

```
Play Arcade.jsx        лаунчер: меню всех игр, хоткеи 1-7, Random
lib/GameCore.jsx       цвет, скругления, капсулы, дуги, прогон глифов
lib/GameHeartbeat.jsx  автономный цикл (PowerShell + C#), Windows
lib/GamePersist.jsx    key=value в Folder.userData
lib/GameI18n.jsx       подстановка {0}
tools/check.js         статическая проверка всех игр и lib
tools/test-core.js     прогон ядра в песочнице (геометрия, i18n, heartbeat)
tools/migrate.js       механические правки (служебный)
_baseline_20261107/    локальный снимок до рефакторинга (в git не входит, не запускать)
```

## Проверка

```powershell
node tools/check.js      # синтаксис, ES3, #include, кодировка/BOM, i18n, дубли
node tools/check.js --fix # починить BOM на месте
node tools/test-core.js  # геометрия ядра, подстановки, генерация heartbeat
```

`check.js` ловит синтаксические ошибки ExtendScript сразу, без запуска Illustrator. `test-core.js` исполняет `lib/` в песочнице с поддельным `ScriptUIGraphics` и проверяет математику рисования, разбор сохранений и корректность генерируемого PowerShell/C#.

## Ограничения

- **Автономная анимация — только Windows.** Реализована через скрытый PowerShell-процесс, который посылает окну `WM_MOUSEMOVE` и `F15`. На macOS игра работает, но шагает только когда вы двигаете мышь; об этом сообщает статус-строка.
- На машинах с политикой, запрещающей `powershell.exe -ExecutionPolicy Bypass` или `wscript.exe`, таймер не запустится — игра покажет сообщение и останется управляемой, но без автохода.
- Игры должны запускаться модальным окном (`dialog`); это ограничение платформы, а не дизайна.
- **Кодировка.** Illustrator читает `.jsx` без BOM как Windows-1252, поэтому файлы игр сохранены в UTF-8 **с BOM**. Если после правки интерфейс показывает `ÄŒeÅ¡tina` / `â€¢` / `RomÃ¢nÄƒ` — BOM потерялся: `node tools/check.js --fix`. Файлы в `lib/` наоборот держите ASCII-only и **без BOM**.

## Где лежат сохранения

`Folder.userData` (`%APPDATA%\Adobe\InDesign`-подобная папка Illustrator):

```
AI_2048_SaveData.txt
AI_Tetris_SaveData.txt
AI_Arkanoid_SaveData.txt
AI_Snake_SaveData.txt
AI_SpaceInvaders_SaveData.txt
AI_BoulderDash_SaveData.txt
AI_PacMan_SaveData.txt
```

Формат — `key=value`, по строке на ключ. Удаление файла сбрасывает рекорд/язык/тему; у 2048 и Tetris — и сохранённую партию.

## Диагностика и логи

Каждая игра пишет лог кадров в `%TEMP%\relax_log_<Игра>.txt` (кнопка **Logs** в лаунчере открывает эту папку). Файл перезаписывается при каждом запуске игры.

Раз в секунду пишется строка вида:

```
[+12.0s] frames=38 fps=38.0 gap_avg=26 gap_max=120 | set=0.2 hs=3.9 draw=9.1 total=13.2 max=52 | keys=1
```

| Поле | Что означает |
|---|---|
| `frames`, `fps` | сколько раз за секунду перерисовался канвас |
| `gap_avg`, `gap_max` | средний/максимальный интервал между кадрами, мс |
| `set` | время на `statusLbl.text` (пересчёт вёрстки окна) |
| `hs` | время на `gameCanvas.hide()/show()` |
| `draw` | время на `notify("onDraw")` — собственно рисование |
| `total`, `max` | полное время кадра, среднее и максимум |
| `keys` | нажатий клавиш за секунду |

В шапке файла — окружение: версия Illustrator, ОС, путь запуска (`$.fileName` покажет, запущена игра напрямую или через бандл лаунчера), размер канваса, `tickMs`, тема и язык. События (сбой таймера, экспорт) пишутся строками `[+12.0s] ...`.

Если игра «лагает», лог сразу показывает, что именно медленно: `hs` — пересоздание окна, `draw` — сложная отрисовка, `set` — перестройка вёрстки, большой `gap` при малом `total` — простой вне кадра (логика или ожидание событий).

## Документация

- `EXTENDSCRIPT_GAME_DEV_GUIDE.md` — подробный разбор платформенных ловушек и рецептов (таймер, векторный шрифт, вёрстка, локализация, экспорт на артборд).
- `TESTING.md` — план тестирования: матрица покрытия, тест-кейсы по ID, критерии приёмки, известные ограничения.
- `AGENTS.md` — соглашения по коду и чек-лист проверки.
