#!/bin/bash
# PostToolUse hook: 自动 lint 检查
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 只对 src/ 下的 .ts 文件跑 lint
if echo "$FILE_PATH" | grep -E '^src/.*\.ts$' > /dev/null; then
  cd "$(git rev-parse --show-toplevel)" || exit 0
  RESULT=$(npx eslint "$FILE_PATH" 2>&1)
  if [ $? -ne 0 ]; then
    echo "$RESULT" | head -20
    exit 2
  fi
fi

exit 0
