#!/bin/bash
set -e

TASKS_FILE="tasks.json"
PROGRESS_FILE="progress.txt"
APP_DIR="beatyourself"
MAX_STUCK=3

# Озвучка с кросс-платформенным фолбэком (на Linux/Windows say отсутствует).
speak() {
    local text="$1"
    if command -v say >/dev/null 2>&1; then
        say -v Milena "$text" 2>/dev/null || true
    else
        echo "🗣️  $text"
    fi
}

# Выбор агента:
# - RALPH_AGENT=claude|codex — принудительный выбор.
# - Иначе автодетект (предпочитаем claude).
resolve_agent() {
    if [[ -n "${RALPH_AGENT:-}" ]]; then
        echo "$RALPH_AGENT"
        return 0
    fi
    if command -v claude >/dev/null 2>&1; then
        echo "claude"
        return 0
    fi
    if command -v codex >/dev/null 2>&1; then
        echo "codex"
        return 0
    fi
    return 1
}

run_agent() {
    local agent="$1"
    local prompt="$2"

    case "$agent" in
        claude)
            claude --permission-mode acceptEdits -p "$prompt"
            ;;
        codex)
            local output_file
            output_file="$(mktemp -t ralph_codex.XXXXXX)"
            codex exec --full-auto --color never -C "$PWD" --output-last-message "$output_file" "$prompt" >/dev/null
            cat "$output_file"
            rm -f "$output_file"
            ;;
        *)
            echo "Unsupported agent: $agent" >&2
            return 1
            ;;
    esac
}

count_status() {
    local status="$1"
    if [ -f "$TASKS_FILE" ]; then
        # `|| true` чтобы grep с 0 совпадений не уронил `set -e`.
        grep -c "\"status\": \"$status\"" "$TASKS_FILE" || true
    else
        echo "0"
    fi
}

iteration=1
prev_pending=-1
stuck_count=0

while :; do
    pending=$(count_status "pending")
    if [ "$pending" -eq 0 ]; then
        break
    fi
    done_count=$(count_status "done")

    echo "==================================="
    echo "🚀 Итерация $iteration"
    echo "==================================="
    echo "📊 Статус: $pending ожидают, $done_count готово"
    echo "-----------------------------------"

    # Anti-stuck: если pending не уменьшается несколько итераций подряд — выходим.
    if [ "$pending" -eq "$prev_pending" ]; then
        stuck_count=$((stuck_count + 1))
        if [ "$stuck_count" -ge "$MAX_STUCK" ]; then
            echo "⚠️  Прогресса нет $MAX_STUCK итераций подряд (pending=$pending). Останавливаю цикл."
            speak "Хозяин, я застрял. Помоги."
            exit 1
        fi
    else
        stuck_count=0
    fi
    prev_pending=$pending

    agent=$(resolve_agent) || {
        echo "❌ Не найден поддерживаемый агент. Установите 'claude' или 'codex', либо задайте RALPH_AGENT." >&2
        exit 1
    }

    # Кавычки на EOF делают heredoc буквальным — никаких сюрпризов с $/`.
    prompt=$(cat <<'EOF'
@tasks.json @progress.txt
Контекст: Next.js + TypeScript проект. Код приложения лежит в подпапке `beatyourself/`,
а tasks.json и progress.txt — в корне репозитория.

1. Прочитай progress.txt, чтобы понимать текущий контекст и формат записей.
2. Найди ОДНУ фичу в tasks.json со статусом "pending" и наивысшим приоритетом
   (critical > high > medium > low). Это должна быть фича, которую ТЫ считаешь
   наиболее приоритетной — не обязательно первая в списке.
3. Проверь зависимости: все задачи из массива `dependencies` текущей задачи должны
   иметь статус "done". Если нет — выбери другую подходящую задачу.
4. Реализуй фичу. Перед завершением обязательно прогони из подпапки beatyourself/:
       cd beatyourself && npm run typecheck
       cd beatyourself && npm run lint
       cd beatyourself && npm test    # если в задаче или проекте есть тесты
   Все применимые проверки должны пройти зелёными.
5. Обнови tasks.json: поставь задаче статус "done" и кратко опиши результат
   в поле `notes`.
6. Допиши блок в конец progress.txt по формату, который уже используется в файле
   (дата YYYY-MM-DD, ID задачи, что сделано, какие файлы тронуты).
7. Сделай атомарный git commit для этой фичи.

РАБОТАЙ ТОЛЬКО НАД ОДНОЙ ФИЧЕЙ. Не делай "попутный рефакторинг".
Если задача полностью выполнена и все проверки прошли — выведи строго:
<promise>COMPLETE</promise>
EOF
)

    result=$(run_agent "$agent" "$prompt")
    echo "$result"

    if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
        echo "✅ Задача успешно выполнена!"

        remaining=$(count_status "pending")
        if [ "$remaining" -eq 0 ]; then
            echo "🎉 Все задачи из беклога завершены!"
            speak "Хозяин, я всё сделал!"
            exit 0
        fi

        echo "Осталось задач: $remaining. Перехожу к следующей..."
        speak "Задача готова. Продолжаю работу."
    else
        echo "⚠️  Агент не вернул тег завершения. Возможно, задача выполнена частично."
    fi

    iteration=$((iteration + 1))
done

echo "🎉 Все задачи выполнены! Всего итераций: $((iteration - 1))"
speak "Хозяин, я всё сделал!"
