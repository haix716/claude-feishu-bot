#!/bin/bash
# 敏感信息检测脚本
# 在 git push 前检查代码中是否有本地路径、API key、媒体文件等

set -e

echo "🔒 安全检查：扫描敏感信息..."

# 检查是否有 staged 文件
STAGED_FILES=$(git diff --cached --name-only)
if [ -z "$STAGED_FILES" ]; then
    echo "✅ 没有 staged 文件，跳过检查"
    exit 0
fi

# 检查本地路径
echo "  检查本地路径..."
if echo "$STAGED_FILES" | xargs grep -l "/Users/hxy" 2>/dev/null; then
    echo "❌ 发现本地路径泄露！"
    exit 1
fi

# 检查 API key
echo "  检查 API key..."
if git diff --cached | grep -iE "token|key|secret|password|ghp_|sk-|tp-[a-zA-Z0-9]" 2>/dev/null; then
    echo "❌ 发现敏感信息泄露！"
    exit 1
fi

# 检查图片文件
echo "  检查图片文件..."
if echo "$STAGED_FILES" | grep -E "\.(jpg|jpeg|png|gif|mp4|mp3|mov)$" 2>/dev/null; then
    echo "❌ 发现媒体文件泄露！"
    exit 1
fi

# 检查 images 目录
echo "  检查 images 目录..."
if echo "$STAGED_FILES" | grep -E "^images/" 2>/dev/null; then
    echo "❌ 发现 images 目录泄露！"
    exit 1
fi

echo "✅ 安全检查通过"
exit 0
