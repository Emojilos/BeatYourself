# Progress Log

Журнал выполнения задач из `tasks.json`. Каждый агент дописывает блок в конце после завершения задачи.

## Формат записи

```
## YYYY-MM-DD — TASK-NNN: <краткое название>

**Status:** done
**Commits:** <hash1>, <hash2>, ...
**Что сделано:**
- Пункт 1
- Пункт 2

**Test results:**
- ✅ Test step 1: passed
- ✅ Test step 2: passed

**Проблемы / решения:**
- Если возникли блокеры или нестандартные решения — описать здесь

**Notes for next tasks:**
- Если обнаружены факты, важные для следующих задач — записать
```

---

## Записи

## 2026-04-29 — TASK-001: Инициализация Next.js проекта

**Status:** done
**Commits:** (см. git log — коммит создаётся в этом же шаге)
**Что сделано:**
- Установлены `prettier`, `prettier-plugin-tailwindcss`, `eslint-config-prettier`
- Созданы `.prettierrc.json`, `.prettierignore`
- В `eslint.config.mjs` добавлен `prettier` для отключения конфликтующих правил
- В `package.json` добавлены скрипты `format`, `format:check`, `typecheck`
- Создана полная структура папок согласно `agent_instructions.folder_structure` (с `.gitkeep`):
  `app/(auth)/login`, `app/(app)/{dashboard,challenges,water,weight,profile}`,
  `app/api/{auth,strava,cron}`, `lib/{db,auth,services,strava,crypto,validation,utils}`,
  `actions`, `components/{ui,features,layout}`, `prisma`, `config`
- В `beatyourself/.gitignore` добавлено `/prisma/migrations/dev/`
- `beatyourself/README.md` переписан под проект (стек, структура, скрипты, conventions)
- В `beatyourself/next.config.ts` указан `turbopack.root` для подавления warning'а
  про multi-lockfile

**Test results:**
- ✅ `npm install` — без ошибок
- ✅ `npm run dev` + `curl http://localhost:3000` → HTTP 200, без ошибок в логах
- ✅ `npm run lint` — clean
- ✅ `npm run typecheck` — clean
- ✅ `npm run format:check` — clean
- ✅ `npm run build` — успешный production build
- ✅ Все папки структуры существуют (с `.gitkeep`)

**Проблемы / решения:**
- Next.js 16 (не 15, как указано в `tech_stack_reference`). Не даунгрейдил — оставил как
  есть, перед написанием кода читать `node_modules/next/dist/docs/` (этого требует
  `beatyourself/AGENTS.md`).
- `.env.local` лежит в корне репо, а Next.js приложение — в `beatyourself/`. Это означает,
  что Next автоматически не подхватит env. Решение отложено до TASK-003 (см. `progress.txt`).
- `AGENTS.md`/`CLAUDE.md` в `beatyourself/` добавлены в `.prettierignore`, чтобы будущие
  итерации не переписывали их форматтером.

**Notes for next tasks:**
- Все `npm` команды запускать из `beatyourself/`, не из корня репо.
- Прежде чем писать Next-код, читать `node_modules/next/dist/docs/01-app/` — Next 16 имеет
  изменения относительно training data.
- Для TASK-003 решить, где будет canonical `.env.local`: в корне или в `beatyourself/`.
- Подробные заметки также см. в `progress.txt` в корне репо.
