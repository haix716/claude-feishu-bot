#!/bin/bash
# PreToolUse hook: 检测敏感信息
INPUT=$(cat)
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

if [ -z "$CONTENT" ]; then
  exit 0
fi

if echo "$CONTENT" | grep -iE '(sk-[a-zA-Z0-9]{10,}|ghp_[a-zA-Z0-9]{10,})' > /dev/null; then
  echo "⚠️ 检测到可能的敏感信息，请检查后再写入" >&2
  exit 2
fi

exit 0
