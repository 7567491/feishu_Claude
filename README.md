# Claude Code UI

基于 [gaccode.com](https://gaccode.com) 的 Claude Code Web 界面，提供桌面和移动端的完整访问体验。

## 🌐 访问地址

**生产环境：** https://ccui.linapp.fun

## ✨ 核心功能

- **📱 响应式设计** - 完美支持桌面、平板和移动设备
- **💬 智能聊天** - 实时流式对话，支持 Claude Sonnet 4.5
- **🖥️ 集成终端** - 内置 Shell 终端，直接访问 Claude Code CLI
- **📁 文件管理** - 交互式文件树，支持语法高亮和实时编辑
- **🔄 Git 集成** - 查看、暂存、提交更改，切换分支
- **🎯 会话管理** - 恢复对话，管理多个会话，追踪历史
- **🤖 飞书集成** - Webhook 模式接入飞书机器人，支持私聊和群聊

## 🏗️ 技术架构

**后端:**
- Node.js + Express (主服务: 33300, Web UI: 63080)
- WebSocket 实时通信 + Feishu Webhook
- 本地 Claude CLI 集成 (gaccode 版本 2.0.37)
- SQLite 数据库（会话管理）
- PM2 进程管理

**前端:**
- React 18 + Vite + CodeMirror + Tailwind CSS

**集成:**
- Feishu Webhook (@larksuiteoapi/node-sdk v1.55.0)
- 每个用户/群组独立会话目录和 Git 仓库

**部署:**
- Nginx 反向代理 + SSL (Let's Encrypt)
- 认证: `~/.claudecode/config` (gaccode token)

## 🚀 本地开发

### 环境要求

- Node.js v20+
- gaccode Claude Code CLI 已安装并认证

### 安装依赖

```bash
npm install
```

### 配置环境

```bash
cp .env.example .env
# 编辑 .env 设置端口等配置
```

### 启动开发服务器

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm run server
```

## 🔧 生产部署

### PM2 管理

```bash
# 启动服务
pm2 start npm --name "claude-code-ui" -- run server

# 查看状态
pm2 status

# 查看日志
pm2 logs claude-code-ui

# 重启服务
pm2 restart claude-code-ui

# 停止服务
pm2 stop claude-code-ui

# 保存配置
pm2 save
```

### Nginx 配置示例

```nginx
server {
    server_name ccui.linapp.fun;

    location / {
        proxy_pass http://127.0.0.1:63080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/ccui.linapp.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ccui.linapp.fun/privkey.pem;
}
```

## 📋 环境变量

```bash
# 主服务端口（Feishu Webhook）
PORT=33300

# Claude Code CLI 路径
CLAUDE_CLI_PATH=claude

# gaccode 代理地址
ANTHROPIC_BASE_URL=https://gaccode.com/claudecode

# 飞书配置
FeishuCC_App_ID=cli_xxx
FeishuCC_App_Secret=xxx
FeishuCC_Verification_Token=xxx
FeishuCC_Encrypt_Key=xxx
```

## 🔐 认证说明

系统自动从 `~/.claudecode/config` 读取 gaccode 认证 token。确保：

1. 已安装 gaccode 版本的 Claude Code
2. 已完成 gaccode 认证登录
3. `~/.claudecode/config` 包含有效 token

## 🤖 飞书集成

**功能特性：**
- Webhook 模式接收飞书消息（稳定、可扩展）
- 私聊和群聊支持，独立会话管理
- 自动创建项目目录和 Git 仓库
- 持久化会话历史，支持多轮对话

**配置要求：**
```bash
# .env 环境变量
FeishuCC_App_ID=your_app_id
FeishuCC_App_Secret=your_app_secret
FeishuCC_Verification_Token=your_verification_token
FeishuCC_Encrypt_Key=your_encrypt_key
PORT=33300
```

**Webhook 地址：** `https://ccode.linapp.fun/webhook`

**会话目录：** `./feicc/user-{open_id}/` 或 `./feicc/group-{chat_id}/`

## 📂 项目结构

```
.
├── server/
│   ├── index.js              # 主服务器（Web UI + Feishu Webhook）
│   ├── claude-cli.js         # Claude CLI 封装
│   ├── feishu-webhook.js     # 飞书 Webhook 处理
│   ├── lib/
│   │   ├── feishu-session.js # 会话管理
│   │   └── feishu-message-writer.js # 消息写入
│   ├── database/
│   │   ├── db.js             # 数据库操作
│   │   └── init.sql          # 数据库架构
│   └── routes/               # API 路由
├── src/                      # React 前端源码
├── feicc/                    # 飞书会话目录
└── .env                      # 环境配置
```

## 🛠️ 故障排查

**日志查看：**
```bash
pm2 logs claude-code-ui --lines 100
```

**重启服务：**
```bash
pm2 restart claude-code-ui
```

**检查进程：**
```bash
pm2 status
ps aux | grep node
```

## 📄 License

MIT License

## 🙏 致谢

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Anthropic 官方 CLI
- [gaccode.com](https://gaccode.com) - Claude Code 代理服务
- 基于 [@siteboon/claude-code-ui](https://github.com/siteboon/claudecodeui) 修改
