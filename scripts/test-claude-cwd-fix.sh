#!/bin/bash
# 测试 Claude CWD 修复是否生效

echo "========================================="
echo "测试 Claude CWD 文件修复"
echo "========================================="
echo

# 1. 检查当前目录是否有遗留的 cwd 文件
echo "1️⃣ 检查 /home/ccp 目录..."
CWD_IN_HOME=$(ls /home/ccp/claude-*-cwd 2>/dev/null | wc -l)
if [ $CWD_IN_HOME -eq 0 ]; then
    echo "   ✅ /home/ccp 目录干净，没有 cwd 文件"
else
    echo "   ❌ 发现 $CWD_IN_HOME 个 cwd 文件（应该为0）"
fi

# 2. 检查日志目录是否存在
echo
echo "2️⃣ 检查 ~/.claude-logs 目录..."
if [ -d ~/.claude-logs ]; then
    echo "   ✅ 日志目录已创建"
    echo "   📊 目录内容:"
    ls -lh ~/.claude-logs/ 2>/dev/null | tail -n +2 | while read line; do
        echo "      $line"
    done
else
    echo "   ℹ️  日志目录将在首次运行 Claude 时创建"
fi

# 3. 检查服务器进程
echo
echo "3️⃣ 检查服务器状态..."
if pm2 list | grep -q "claude-code-ui.*online"; then
    echo "   ✅ claude-code-ui 服务运行正常"
else
    echo "   ⚠️  服务未运行或状态异常"
fi

# 4. 检查定时任务
echo
echo "4️⃣ 检查定时清理任务..."
if crontab -l 2>/dev/null | grep -q "cleanup-temp-files"; then
    echo "   ✅ 定时清理任务已设置（每天凌晨3点）"
    crontab -l | grep cleanup
else
    echo "   ⚠️  定时任务未设置"
fi

# 5. 检查修改的代码
echo
echo "5️⃣ 验证代码修改..."
if grep -q "\.claude-logs" /home/ccp/server/claude-cli.js; then
    echo "   ✅ 服务器代码已包含日志目录配置"
else
    echo "   ❌ 代码修改可能未生效"
fi

if grep -q "Clean up temporary cwd files" /home/ccp/server/claude-cli.js; then
    echo "   ✅ 服务器代码已包含自动清理逻辑"
else
    echo "   ❌ 自动清理代码可能缺失"
fi

echo
echo "========================================="
echo "✅ 测试完成！"
echo "========================================="
echo
echo "💡 提示："
echo "   - 当下次使用 Claude CLI 时，临时文件会自动存储在 ~/.claude-logs/"
echo "   - 命令完成后，临时 cwd 文件会自动删除"
echo "   - 定时任务每天凌晨3点清理过期文件"
echo
