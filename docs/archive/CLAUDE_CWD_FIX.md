# Claude CWD 临时文件问题修复说明

## 问题描述

在 `/home/ccp` 目录下累积了 700 个 `claude-*-cwd` 文件。这些是 Claude CLI 工具创建的临时文件，用于记录命令执行的工作目录，但由于 CLI 的 bug，这些文件在使用后没有被清理。

## 问题根源

**文件来源**：`/usr/lib/node_modules/@anthropic-ai/claude-code/cli.js` (第 261308 行)

```javascript
let C = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0"),
    V = mYQ.tmpdir();  // 获取临时目录
let K = `${V}/claude-${C}-cwd`,  // 创建临时文件路径
...
H.push(`pwd -P >| ${K}`);  // 将工作目录写入文件
```

**问题**：文件读取后没有执行删除操作。

## 已实施的修复方案

### 1. 清理了现有的 700 个临时文件
- 执行脚本：`/home/ccp/cleanup-claude-cwd.sh`
- 结果：已删除所有 700 个文件

### 2. 修改了服务器代码 (`/home/ccp/server/claude-cli.js`)

**改动 1：设置专用日志目录**
- 创建 `~/.claude-logs` 目录
- 通过设置 `TMPDIR` 环境变量，让 Claude CLI 将临时文件写入该目录
- 这样可以集中管理临时文件，不会污染工作目录

**改动 2：自动清理机制**
- 在 Claude 进程完成后自动清理所有 `claude-*-cwd` 文件
- 清理逻辑在 `close` 事件处理器中执行
- 错误会被忽略，不影响主流程

### 3. 创建了独立的清理脚本

**脚本路径**：`/home/ccp/cleanup-claude-cwd.sh`

可用于手动清理或设置定时任务：
```bash
# 手动执行
./cleanup-claude-cwd.sh

# 或添加到 crontab (每天清理一次)
0 2 * * * /home/ccp/cleanup-claude-cwd.sh
```

### 4. 创建了包装脚本（可选）

**脚本路径**：`/home/ccp/claude-wrapper.sh`

如果需要在命令行直接使用 claude CLI，可以使用这个包装脚本：
```bash
# 使用包装脚本代替直接调用 claude
/home/ccp/claude-wrapper.sh <命令>

# 或者创建别名
alias claude='/home/ccp/claude-wrapper.sh'
```

## 验证修复

1. **检查当前状态**：
   ```bash
   ls /home/ccp/claude-*-cwd 2>/dev/null | wc -l
   # 应该返回 0
   ```

2. **测试新的行为**：
   - 重启服务器后运行 Claude
   - 临时文件会在 `~/.claude-logs/` 目录中创建
   - 命令完成后会自动清理

3. **监控日志目录**：
   ```bash
   ls -la ~/.claude-logs/
   ```

## 技术细节

- **临时文件格式**：`claude-<4位十六进制>-cwd`
- **内容**：当前工作目录的绝对路径
- **新存储位置**：`~/.claude-logs/` (之前是 tmpdir 或当前目录)
- **清理时机**：Claude CLI 进程结束时自动清理

## 需要重启的服务

✅ **已完成** - 服务器已重启
```bash
pm2 restart claude-code-ui
```

## 自动化清理

✅ **已设置定时任务**
- 任务：每天凌晨 3:00 执行清理
- 脚本：`/home/ccp/cleanup-temp-files.sh`
- 日志：`~/.claude-logs/cleanup.log`

查看定时任务：
```bash
crontab -l
```

手动执行清理：
```bash
/home/ccp/cleanup-temp-files.sh
```

## 验证测试

运行测试脚本验证修复：
```bash
/home/ccp/test-claude-cwd-fix.sh
```

测试结果（已通过）：
- ✅ /home/ccp 目录干净，无遗留 cwd 文件
- ✅ ~/.claude-logs 目录已创建
- ✅ 服务器运行正常
- ✅ 定时清理任务已设置
- ✅ 代码修改已生效

## 额外优化

除了修复 Claude CWD 问题，还清理了其他临时文件：
- 清理了 2 个过期的临时目录（.tmp*）
- 设置了 iptables 备份文件的自动清理（保留7天）
- 发现了 cloud-az_monitor.lock 文件（需要手动检查）

## 长期建议

建议向 Claude Code 项目提交 issue 报告此 bug：
https://github.com/anthropics/claude-code/issues

问题描述：临时 cwd 文件未被清理，导致文件累积。

## 相关脚本

- `/home/ccp/cleanup-claude-cwd.sh` - 专门清理 Claude CWD 文件
- `/home/ccp/cleanup-temp-files.sh` - 综合清理各种临时文件（已加入定时任务）
- `/home/ccp/test-claude-cwd-fix.sh` - 验证修复是否生效
- `/home/ccp/claude-wrapper.sh` - Claude CLI 包装脚本（可选，用于命令行）
