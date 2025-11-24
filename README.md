# Claude Code UI

基于 [gaccode.com](https://gaccode.com) 的 Claude Code Web 界面，提供桌面和移动端的完整访问体验。

## ✨ 核心功能

- **📱 响应式设计** - 完美支持桌面、平板和移动设备
- **💬 智能聊天** - 实时流式对话，支持 Claude Sonnet 4.5
- **🖥️ 集成终端** - 内置 Shell 终端，直接访问 Claude Code CLI
- **📁 文件管理** - 交互式文件树，支持语法高亮和实时编辑
- **🔄 Git 集成** - 查看、暂存、提交更改，切换分支
- **🎯 会话管理** - 恢复对话，管理多个会话，追踪历史
- **🤖 飞书集成** - WebSocket 模式接入飞书机器人，支持私聊和群聊

## 🏗️ 技术栈

- **后端:** Node.js + Express + WebSocket + Feishu WebSocket SDK (@larksuiteoapi/node-sdk v1.55.0)
- **前端:** React 18 + Vite + CodeMirror + Tailwind CSS
- **集成:** Claude CLI (gaccode 2.0.37) + SQLite 会话管理
- **部署:** Nginx + PM2 + SSL (Let's Encrypt)

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量（参考下方）
cp .env.example .env

# 开发模式
npm run dev

# 生产模式
npm run build && npm run server
```

## 🔧 生产部署

```bash
# PM2 管理
pm2 start npm --name "claude-code-ui" -- run server
pm2 start npm --name "feishu" -- run feishu
pm2 save

# Nginx 配置示例 (WebSocket 支持)
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:63080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

## 📋 环境变量

```bash
PORT=33300                              # 主服务端口
CLAUDE_CLI_PATH=claude                  # CLI 路径
ANTHROPIC_BASE_URL=https://gaccode.com/claudecode
FeishuCC_App_ID=cli_xxx                 # 飞书应用配置（WebSocket模式）
FeishuCC_App_Secret=xxx
```

认证 token 自动从 `~/.claudecode/config` 读取（需先完成 `claude` CLI 登录）

## 🤖 飞书集成

- **WebSocket 长连接模式**（稳定、实时），支持私聊和群聊
- 自动创建独立会话目录和 Git 仓库（`./feicc/user-{open_id}/`）
- 持久化会话历史，支持多轮对话上下文
- 私聊直接响应，群聊需 @ 机器人

**启动飞书服务：**
```bash
pm2 start npm --name "feishu" -- run feishu
pm2 logs feishu  # 查看日志
```

## 📂 项目结构与维护

### 核心目录

```
server/              # 后端服务
├── database/        # SQLite 数据库 (auth.db)
├── lib/             # 飞书集成库
└── routes/          # API 路由

src/                 # React 前端源码
dist/                # 构建输出（生产部署）
public/              # 静态资源

feicc/               # 飞书会话工作目录
├── group-oc_*/      # 群聊会话（独立 Git 仓库）
└── user-ou_*/       # 私聊会话（独立 Git 仓库）

auto/                # 自动化系统
├── logs/            # 执行日志
└── task-state.json  # 任务状态

scripts/             # 工具脚本
├── cleanup-temp-files.sh      # 自动清理脚本
├── cleanup-claude-cwd.sh      # Claude 临时文件清理
└── claude-wrapper.sh          # Claude CLI 包装器

test/feishu/         # 飞书集成测试文件
docs/                # 项目文档
├── archive/         # 历史文档归档
└── claude.md        # Claude 相关文档

backups/             # 备份文件（iptables、crontab）
logs/                # 应用日志目录
```

### 配置与缓存

```
.claude/             # Claude Code CLI 数据
.claude-logs/        # Claude 临时文件（自动重定向）
.pm2/                # PM2 进程管理
  └── logs/          # PM2 服务日志
node_modules/        # npm 依赖
.git/                # Git 仓库
```

### 自动化维护

**自动清理任务：**
```bash
# 每天凌晨 3 点自动运行
0 3 * * * /home/ccp/scripts/cleanup-temp-files.sh

# 手动运行
bash /home/ccp/scripts/cleanup-temp-files.sh
```

**清理内容：**
- 自动移动 iptables 备份到 `backups/` 目录
- 删除 7 天前的 iptables 备份文件
- 清理 `.tmp*` 临时目录
- 清理 Claude CWD 临时文件
- 检查并提示过期的 `.lock` 文件

### 文件组织规范

**所有新文件自动生成位置：**
- 数据库文件 → `server/database/`
- Claude 临时文件 → `.claude-logs/`
- PM2 日志 → `.pm2/logs/`
- 应用日志 → `logs/`
- 备份文件 → `backups/`
- 飞书会话 → `feicc/`

**注意：** `.claude.json` 必须保持在根目录（Claude CLI 官方要求）

## 🛠️ 故障排查

```bash
pm2 logs claude-code-ui --lines 100  # 查看日志
pm2 restart claude-code-ui            # 重启服务
pm2 status                            # 检查状态
```

## 📄 License

MIT License

## 🙏 致谢

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) - Anthropic 官方 CLI
- [gaccode.com](https://gaccode.com) - Claude Code 代理服务
- 基于 [@siteboon/claude-code-ui](https://github.com/siteboon/claudecodeui) 修改
