#!/bin/bash
# Claude CLI 包装脚本
# 用途：将临时 cwd 文件重定向到专门的日志目录，并在使用后自动清理

# 设置日志目录
CLAUDE_LOG_DIR="/home/ccp/.claude-logs"
mkdir -p "$CLAUDE_LOG_DIR"

# 设置 TMPDIR 到日志目录（这样 claude CLI 会将临时文件写入这里）
export TMPDIR="$CLAUDE_LOG_DIR"

# 调用真正的 claude CLI，传递所有参数
/usr/bin/claude "$@"

# 保存退出状态
EXIT_CODE=$?

# 清理 cwd 临时文件（保留其他可能有用的临时文件）
find "$CLAUDE_LOG_DIR" -name "claude-*-cwd" -mtime +0 -delete 2>/dev/null

# 返回 claude CLI 的退出状态
exit $EXIT_CODE
