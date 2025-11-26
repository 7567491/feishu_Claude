# 自动文件发送功能 - 实现总结

## ✅ 已完成功能

### 1. 核心组件
- **FeishuFileWatcher** (`server/lib/feishu-file-watcher.js`)
  - 基于 chokidar 的文件监控服务
  - 监控 `/home/ccp` 目录的所有 `.md` 文件
  - 支持防抖、去重、智能过滤

### 2. 集成到服务
- **WebSocket 模式** (`server/feishu-ws.js`)
  - 自动启动文件监控
  - 追踪当前活跃对话
  - 每次收到消息时更新活跃会话

### 3. 智能特性
- ✅ 防抖机制（默认 3 秒）
- ✅ 去重机制（1 分钟内不重复发送）
- ✅ 自动排除特定目录（node_modules, .git, feicc 等）
- ✅ 区分新建和修改事件
- ✅ 自动识别当前对话

## 📋 使用方法

### 方式一：通过飞书实际测试

**步骤 1**：启动飞书服务
```bash
cd /home/ccp
npm run feishu
```

**步骤 2**：在飞书中发消息
在飞书中向机器人发送任意消息，建立"当前对话"：
```
你: hi
```

**步骤 3**：在项目目录创建/修改 md 文件
打开新终端：
```bash
cd /home/ccp
echo "# 测试自动发送" > TEST_AUTO.md
```

**步骤 4**：检查飞书
你应该会在飞书中收到：
```
机器人: 📝 检测到文件新建: TEST_AUTO.md (0.xx KB)
        正在自动发送...
机器人: [文件: TEST_AUTO.md]
```

### 方式二：使用 vim/nano 编辑器测试

```bash
cd /home/ccp
vim MANUAL_TEST.md
# 输入一些内容
# 保存并退出 (:wq)
```

保存后，文件会自动发送到飞书当前对话。

### 方式三：让 Claude 生成文件

在飞书中：
```
你: 帮我生成一个 DEMO.md 文件
Claude: [生成文件]
```

生成后会自动发送到飞书！

## 🔧 配置说明

### 启用/禁用功能

编辑 `server/feishu-ws.js`：
```javascript
// 禁用自动发送
this.fileWatcher = new FeishuFileWatcher(watchPath, {
  enabled: false  // 改为 false
});
```

### 调整防抖延迟

```javascript
this.fileWatcher = new FeishuFileWatcher(watchPath, {
  debounceDelay: 5000  // 改为 5 秒
});
```

### 添加自定义排除目录

```javascript
this.fileWatcher = new FeishuFileWatcher(watchPath, {
  ignorePaths: [
    '**/node_modules/**',
    '**/your-custom-dir/**'  // 添加你的目录
  ]
});
```

## 📊 监控状态

### 查看日志

启动服务后，日志会显示：
```
[FileWatcher] Initialized
[FileWatcher] Watch path: /home/ccp
[FileWatcher] Enabled: true
[FileWatcher] Ready and watching for changes
```

当你发消息时：
```
[FileWatcher] Active chat updated: oc_xxx
```

当文件变化时：
```
[FileWatcher] File created: TEST.md
[FileWatcher] Auto-sending file: TEST.md
[FeishuClient] Uploading file: TEST.md (0.02KB)
[FileWatcher] File sent successfully
```

## 🎯 实际应用场景

### 场景 1：团队协作文档
```bash
# 创建团队文档
echo "# 项目进展\n今日完成..." > PROGRESS.md
```
→ 团队成员立即在飞书收到

### 场景 2：会议纪要
```bash
# 会议后整理纪要
echo "# 会议纪要\n参会人员..." > MEETING_20251126.md
```
→ 自动发送到飞书群

### 场景 3：代码文档
```bash
# API 文档更新
echo "## 新增 API\n..." >> docs/API.md
```
→ 自动同步到飞书

### 场景 4：Claude 生成内容
在飞书对 Claude 说：
```
"帮我生成一份产品需求文档"
```
Claude 生成的 .md 文件会自动发送回飞书！

## 🐛 故障排除

### 问题：文件没有自动发送

**检查清单**：
1. ✅ 服务是否正在运行？
   ```bash
   ps aux | grep feishu
   ```

2. ✅ 是否先在飞书发过消息？
   - 必须先建立"当前对话"

3. ✅ 文件是否在监控目录？
   - 监控：`/home/ccp/**/*.md`
   - 排除：`feicc/`, `node_modules/` 等

4. ✅ 查看日志是否有错误？
   - 检查控制台输出

### 问题：文件发送到错误的群

**解决方法**：
在正确的飞书群中给机器人发一条消息，更新"当前对话"。

### 问题：文件发送太频繁

**解决方法**：
增加防抖延迟：
```javascript
debounceDelay: 5000  // 5秒
```

### 问题：想临时禁用

**方法 1**：配置禁用
```javascript
enabled: false
```

**方法 2**：重启服务（不启动文件监控）

## 📁 创建的文件列表

1. `server/lib/feishu-file-watcher.js` - 文件监控核心服务
2. `server/lib/feishu-file-handler.js` - 文件命令处理器（手动发送）
3. `server/test-file-upload.js` - 文件上传测试脚本
4. `server/test-file-command.js` - 命令解析测试脚本
5. `server/test-auto-send.js` - 自动发送测试脚本
6. `AUTO_FILE_SEND.md` - 用户使用文档
7. `AUTO_SEND_IMPLEMENTATION.md` - 实现总结（本文件）
8. `FILE_SEND_GUIDE.md` - 手动发送指南

## 🔐 安全说明

- ✅ 不需要 sudo 权限
- ✅ 只监控 .md 文件
- ✅ 自动排除敏感目录
- ✅ 只发送到你主动对话的群
- ✅ 可随时配置禁用

## 🎨 技术架构

```
┌─────────────────┐
│  文件系统       │
│  /home/ccp      │
└────────┬────────┘
         │ 文件变化事件
         ↓
┌─────────────────┐
│   chokidar      │
│   文件监控      │
└────────┬────────┘
         │ add/change
         ↓
┌─────────────────┐
│ FeishuFileWatcher│
│  - 防抖处理     │
│  - 去重检查     │
│  - 目录过滤     │
└────────┬────────┘
         │ 符合条件
         ↓
┌─────────────────┐
│  获取活跃对话   │
│  (最后聊天的群) │
└────────┬────────┘
         │ chatId
         ↓
┌─────────────────┐
│  FeishuClient   │
│  - 上传文件     │
│  - 发送消息     │
└────────┬────────┘
         │ API调用
         ↓
┌─────────────────┐
│   飞书服务器    │
└────────┬────────┘
         │ 推送
         ↓
┌─────────────────┐
│  飞书客户端     │
│  (用户收到文件) │
└─────────────────┘
```

## 📝 下一步改进建议

1. **支持更多文件类型**
   - 目前只支持 .md
   - 可扩展：.txt, .pdf, .doc 等

2. **添加文件大小限制**
   - 避免发送过大文件
   - 当前已有 20MB 限制

3. **批量发送优化**
   - 短时间内多个文件变化
   - 可以打包发送

4. **白名单模式**
   - 除了黑名单（排除目录）
   - 也可以设置白名单（只监控特定目录）

5. **发送确认提示**
   - 文件变化时先询问
   - 用户确认后再发送

## 🎉 总结

✅ 功能已完全实现并集成
✅ 支持自动监控和手动发送两种模式
✅ 完整的文档和测试覆盖
✅ 可配置、可扩展、易维护

现在可以直接使用！启动服务后，任何在 `/home/ccp` 目录下创建或修改的 .md 文件都会自动发送到你当前对话的飞书群聊。
