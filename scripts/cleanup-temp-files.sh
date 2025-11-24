#!/bin/bash
# 临时文件清理脚本
# 用途：清理 /home/ccp 目录下的各种临时文件和过期备份

echo "========================================="
echo "开始清理临时文件和过期备份"
echo "时间: $(date)"
echo "========================================="
echo

# 1. 移动根目录的 iptables 备份文件到 backups/ 目录
echo "📋 整理 iptables 备份文件..."
mkdir -p /home/ccp/backups
IPTABLES_IN_ROOT=$(find /home/ccp -maxdepth 1 -name "iptables_*.rules" -type f 2>/dev/null | wc -l)
if [ $IPTABLES_IN_ROOT -gt 0 ]; then
    mv /home/ccp/iptables_*.rules /home/ccp/backups/ 2>/dev/null
    echo "   ✓ 已移动 $IPTABLES_IN_ROOT 个 iptables 备份文件到 backups/ 目录"
fi

# 清理 backups/ 目录中超过7天的 iptables 备份
IPTABLES_OLD=$(find /home/ccp/backups -name "iptables_*.rules" -mtime +7 -type f 2>/dev/null | wc -l)
if [ $IPTABLES_OLD -gt 0 ]; then
    find /home/ccp/backups -name "iptables_*.rules" -mtime +7 -type f -delete
    echo "   ✓ 已删除 $IPTABLES_OLD 个超过7天的 iptables 备份文件"
else
    echo "   ✓ backups/ 目录中没有需要清理的旧备份"
fi

# 2. 清理临时目录
echo
echo "📂 清理临时目录..."
TEMP_DIRS=$(find /home/ccp -maxdepth 1 -type d -name ".tmp*" 2>/dev/null | wc -l)
if [ $TEMP_DIRS -gt 0 ]; then
    find /home/ccp -maxdepth 1 -type d -name ".tmp*" -mtime +1 -exec rm -rf {} + 2>/dev/null
    echo "   ✓ 已清理 $TEMP_DIRS 个临时目录"
else
    echo "   ✓ 没有需要清理的临时目录"
fi

# 3. 清理 Claude CWD 文件
echo
echo "🤖 清理 Claude CWD 临时文件..."
CWD_COUNT=$(find /home/ccp -maxdepth 1 -name "claude-*-cwd" -type f 2>/dev/null | wc -l)
if [ $CWD_COUNT -gt 0 ]; then
    find /home/ccp -maxdepth 1 -name "claude-*-cwd" -type f -delete
    echo "   ✓ 已删除 $CWD_COUNT 个 Claude CWD 文件"
else
    echo "   ✓ 没有需要清理的 Claude CWD 文件"
fi

# 4. 清理 .lock 文件（排除正在使用的）
echo
echo "🔒 检查 lock 文件..."
LOCK_FILES=$(find /home/ccp -maxdepth 1 -name "*.lock" -type f 2>/dev/null)
for lock_file in $LOCK_FILES; do
    # 检查文件是否被占用
    if ! lsof "$lock_file" > /dev/null 2>&1; then
        # 检查文件修改时间（超过1小时的可以删除）
        if [ -f "$lock_file" ] && [ $(find "$lock_file" -mmin +60 2>/dev/null) ]; then
            echo "   ⚠️  发现过期 lock 文件: $(basename $lock_file)"
            echo "      如需删除，请手动执行: rm $lock_file"
        fi
    fi
done

# 5. 统计磁盘使用情况
echo
echo "========================================="
echo "清理后磁盘使用情况:"
echo "========================================="
echo "/home/ccp 目录大小: $(du -sh /home/ccp 2>/dev/null | cut -f1)"
echo "可用磁盘空间: $(df -h /home/ccp | tail -1 | awk '{print $4}')"
echo
echo "✅ 清理完成！"
echo "========================================="
