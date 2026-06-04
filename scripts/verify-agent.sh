#!/bin/bash
# SubagentStop hook: 验证 agent 产出

echo "🔍 验证 agent 产出..."

# 检查是否有未提交的改动
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 有未提交的改动，请先 commit"
  git status --short
  exit 2
fi

# 检查最近一次 commit 是否是 agent 的
LAST_COMMIT=$(git log -1 --pretty=format:"%s")
echo "📝 最近 commit: $LAST_COMMIT"

# 运行 lint
echo "🔍 运行 lint..."
LINT_RESULT=$(npx eslint src/ 2>&1)
LINT_EXIT=$?
if [ $LINT_EXIT -ne 0 ]; then
  echo "❌ lint 失败:"
  echo "$LINT_RESULT" | head -20
  exit 2
fi
echo "✅ lint 通过"

# 运行测试
echo "🔍 运行测试..."
TEST_RESULT=$(npm test 2>&1)
TEST_EXIT=$?
if [ $TEST_EXIT -ne 0 ]; then
  echo "❌ 测试失败:"
  echo "$TEST_RESULT" | tail -20
  exit 2
fi
echo "✅ 测试通过"

echo "✅ agent 产出验证通过"
exit 0
