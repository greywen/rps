# 🎮 Rock Paper Scissors - 石头剪刀布

一个使用 Next.js 构建的人机对战石头剪刀布游戏，支持 AI 对手配置和多语言切换。

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)

## ✨ 功能特性

- 🎯 **人机对战** - 与 AI 对手进行五局三胜的石头剪刀布对决
- 🤖 **智能 AI** - 支持接入 OpenAI 兼容 API，AI 会分析玩家出牌模式进行博弈
- 🎭 **多 AI 对手** - 可配置多个不同的 AI 对手，各有不同的头像和策略
- 📊 **游戏统计** - 记录所有游戏数据，查看人类 vs AI 的总体战绩
- 🌐 **多语言支持** - 支持中文和英文界面切换
- ⏱️ **计时模式** - 每轮 10 秒倒计时，超时自动选择
- 📱 **响应式设计** - 支持桌面端和移动端

## 🎮 游戏规则

- **五局三胜制** - 先赢得 3 轮的一方获胜
- **经典规则** - 石头 ✊ 胜 剪刀 ✌️ | 剪刀 ✌️ 胜 布 🖐️ | 布 🖐️ 胜 石头 ✊
- **限时决策** - 每轮 10 秒内做出选择，超时将随机选择

## 🛠️ 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) (App Router)
- **前端**: React 19 + TypeScript
- **样式**: Tailwind CSS 4
- **数据库**: SQLite (better-sqlite3)
- **AI 集成**: OpenAI SDK (兼容任何 OpenAI API 格式的服务)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn 或 pnpm

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/greywen/rps.git
cd rps
```

2. **安装依赖**

```bash
npm install
```

3. **启动开发服务器**

```bash
npm run dev
```

4. **打开浏览器访问** [http://localhost:3000](http://localhost:3000)

### 生产环境构建

```bash
npm run build
npm run start
```

## ⚙️ 配置 AI 对手

访问 `/admin/ai-configs` 页面来管理 AI 对手：

1. **添加新的 AI 对手**
2. **配置 API 连接**：
   - `Host`: API 地址（如 `https://api.openai.com/v1`）
   - `API Key`: 你的 API 密钥
   - `Model`: 使用的模型（如 `gpt-4o-mini`）
3. **设置难度**：
   - `normal`: AI 会分析玩家模式，尽力获胜
   - `chaos`: 完全随机，不可预测
4. **自定义头像和描述**

## 📁 项目结构

```
rps/
├── public/
│   └── avatars/          # AI 对手头像
├── src/
│   ├── app/
│   │   ├── page.tsx      # 首页 - 选择对手
│   │   ├── game/[id]/    # 游戏页面
│   │   ├── result/[id]/  # 结果页面
│   │   ├── admin/        # 管理后台
│   │   │   └── ai-configs/  # AI 配置管理
│   │   └── api/          # API 路由
│   │       ├── ai-configs/  # AI 配置 API
│   │       ├── game/        # 游戏 API
│   │       └── stats/       # 统计 API
│   ├── components/
│   │   └── LanguageSwitcher.tsx  # 语言切换组件
│   └── lib/
│       ├── ai-service.ts   # AI 决策服务
│       ├── db.ts           # 数据库配置
│       ├── game.ts         # 游戏逻辑
│       ├── i18n.ts         # 国际化配置
│       └── I18nContext.tsx # 国际化上下文
├── game.db               # SQLite 数据库文件（自动生成）
└── package.json
```

## 📝 API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/ai-configs` | GET | 获取启用的 AI 对手列表 |
| `/api/ai-configs/admin` | GET/POST/PUT/DELETE | AI 配置管理 |
| `/api/game` | POST | 创建新游戏 |
| `/api/game/play` | POST | 进行一轮游戏 |
| `/api/stats` | GET | 获取游戏统计数据 |

## 🎯 AI 策略说明

### Normal 模式
- 分析玩家历史出牌模式
- 根据上轮结果预测玩家心理
- 玩家输了上轮 → 预测会出克制 AI 的选项
- 玩家赢了上轮 → 预测会继续同一招
- 平局 → 分析玩家频率偏好

### Chaos 模式
- 完全随机选择
- 不可预测，纯看运气

## 🌐 多语言

支持的语言：
- 🇨🇳 中文 (zh)
- 🇺🇸 English (en)

在界面右上角点击语言切换按钮即可切换。

## 📜 开源协议

MIT License

---

**享受游戏，挑战 AI！** 🎮🤖
