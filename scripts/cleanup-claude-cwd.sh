#!/bin/bash
# Claude CWD 文件清理脚本
# 这些文件是 Claude CLI 的临时文件，使用后未被正确清理

LOG_DIR="/home/ccp/.claude-logs"
CLEAN_COUNT=0

# 创建日志目录
mkdir -p "$LOG_DIR"

echo "开始清理 Claude CWD 临时文件..."
echo "时间: $(date)"

# 查找并删除所有 claude-*-cwd 文件
for file in /home/ccp/claude-*-cwd; do
    if [ -f "$file" ]; then
        # 可选：移动到日志目录而不是直接删除（用于调试）
        # mv "$file" "$LOG_DIR/"

        # 直接删除
        rm "$file"
        ((CLEAN_COUNT++))
    fi
done

echo "清理完成！删除了 $CLEAN_COUNT 个文件"
echo "----------------------------------------"
