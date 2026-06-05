#!/bin/bash
# 敏感信息检测脚本
# 在 git commit/push 前检查代码中是否有敏感信息泄露

set -e

echo "🔒 安全检查：扫描敏感信息..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

ERRORS=0

# 检查 staged 文件
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}✅ 没有 staged 文件，跳过检查${NC}"
    exit 0
fi

# ==================== 1. 禁止提交的文件/目录 ====================
echo "  检查禁止提交的文件..."

BLOCKED_PATTERNS=(
    "\.claude/"
    "\.env$"
    "\.env\."
    "\.env/"
    "\.pem$"
    "\.key$"
    "\.p12$"
    "\.pfx$"
    "node_modules/"
    "images/"
    "\.user-tokens\.json"
    "settings\.json"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
    if echo "$STAGED_FILES" | grep -E "$pattern" 2>/dev/null; then
        echo -e "${RED}❌ 禁止提交的文件: $pattern${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# ==================== 2. API Key 模式检测 ====================
echo "  检查 API key..."

# 从 staged diff 中提取所有新增内容（排除安全检查脚本本身，避免误报）
STAGED_DIFF=$(git diff --cached -- . ':!scripts/security-check.sh' 2>/dev/null || true)

# 检查各种 key 模式
KEY_PATTERNS=(
    "r8_[a-zA-Z0-9]{20,}"           # Replicate API key
    "tp-[a-zA-Z0-9]{20,}"           # MiMo token
    "sk-[a-zA-Z0-9]{20,}"           # OpenAI API key
    "ghp_[a-zA-Z0-9]{36}"           # GitHub personal access token
    "app_secret.*[a-zA-Z0-9]{20,}"  # 飞书 app_secret
    "ANTHROPIC_API_KEY="            # Anthropic key assignment
    "Authorization: Bearer"          # Auth headers
    "Bearer [a-zA-Z0-9_-]{20,}"     # Bearer tokens
)

for pattern in "${KEY_PATTERNS[@]}"; do
    if echo "$STAGED_DIFF" | grep -iE "$pattern" 2>/dev/null; then
        echo -e "${RED}❌ 发现敏感信息: $pattern${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# ==================== 3. 本地路径检测 ====================
echo "  检查本地路径..."

if echo "$STAGED_DIFF" | grep -E "/Users/[^/]+/" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ 发现本地路径（请确认是否必要）${NC}"
    # 不阻塞，只警告
fi

# ==================== 4. 媒体文件检测 ====================
echo "  检查媒体文件..."

if echo "$STAGED_FILES" | grep -iE "\.(jpg|jpeg|png|gif|mp4|mp3|mov|avi|webp)$" 2>/dev/null; then
    echo -e "${RED}❌ 发现媒体文件泄露！${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ==================== 5. 隐藏目录检测 ====================
echo "  检查隐藏目录..."

if echo "$STAGED_FILES" | grep -E "^\." 2>/dev/null | grep -v -E "^\.gitignore$|^\.gitattributes$|^\.github/" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ 发现隐藏目录文件（请确认是否应该提交）${NC}"
fi

# ==================== 结果 ====================
if [ $ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ 安全检查失败！发现 $ERRORS 个问题。${NC}"
    echo -e "${RED}请修复后重新 commit。${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 安全检查通过${NC}"
exit 0
