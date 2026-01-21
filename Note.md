# GameWorder 项目文档

> AI 驱动的游戏设计文档助手

---

## 📋 项目规范

### 项目定位

GameWorder 是一个面向游戏开发者的 AI 辅助写作工具，用户可以：
1. 上传 Markdown 格式的游戏设计文档模板
2. 选择文档章节与 AI 进行针对性对话
3. 基于 AI 对话内容自动生成章节内容
4. 导出完整的游戏设计文档（本地下载 / 飞书云文档）

### 技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| React | 18.3.1 | 现代化 UI 框架，生态成熟 |
| Vite | 6.0.5 | 快速构建工具，开发体验优秀 |
| TypeScript | 5.6.2 | 类型安全，提升代码可维护性 |
| Zustand | 5.0.2 | 轻量级状态管理，支持持久化 |
| Tailwind CSS | 4.1.18 | 原子化 CSS，快速构建 UI |
| React Router | 7.1.1 | 单页应用路由管理 |
| react-markdown | 9.0.1 | Markdown 渲染，支持 GFM |

---

## 📂 项目目录

```
E:\GameWorder/
├── src/
│   ├── components/           # UI 组件
│   │   ├── ui/              # 基础 UI 组件（Button, Input, Card, Alert）
│   │   ├── SettingsPanel.tsx        # 设置面板
│   │   └── workspace/       # 工作区组件
│   │       ├── ChatPanel.tsx        # AI 聊天面板
│   │       ├── ConversationSidebar.tsx  # 会话历史侧边栏
│   │       ├── TemplateViewer.tsx  # 模板章节树查看器
│   │       └── FileUpload.tsx      # 文件上传组件
│   ├── pages/               # 页面组件
│   │   ├── Home.tsx         # 首页（欢迎页）
│   │   └── Workspace.tsx    # 主工作区
│   ├── services/            # 服务层（业务逻辑）
│   │   ├── openai.ts        # AI 服务（OpenAI / NVIDIA NIM）
│   │   ├── templateParser.ts    # Markdown 模板解析器
│   │   ├── feishuSDK.ts     # 飞书云文档集成
│   │   └── conversationTitleGenerator.ts  # 会话标题生成
│   ├── stores/              # Zustand 状态管理
│   │   ├── documentStore.ts # 文档状态（模板、章节内容）
│   │   ├── chatStore.ts     # 聊天状态（会话、消息）
│   │   └── settingsStore.ts # 设置状态（API 配置）
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── lib/
│   │   └── utils.ts         # 工具函数（cn 样式合并）
│   ├── App.tsx              # 应用根组件（路由配置）
│   ├── main.tsx             # 应用入口
│   └── index.css            # 全局样式
├── package.json
├── vite.config.ts           # Vite 构建配置
├── tsconfig.json            # TypeScript 全局配置
├── tsconfig.app.json        # TypeScript 应用配置
└── tsconfig.node.json       # TypeScript Node 配置
```

---

## 🔄 实现逻辑

### 1. 用户流程

```
首页 (/)
  └─→ 点击"开始创作"
     ↓
工作区 (/workspace)
  ├─→ 上传 Markdown 模板 → 模板解析器提取章节树
  ├─→ 选择章节 → 与 AI 对话（流式响应）
  ├─→ 点击"AI 生成内容" → 基于对话生成章节文档
  └─→ 导出完整文档（本地下载 / 飞书云文档）
```

### 2. 核心模块

#### 模板解析器 (`templateParser.ts`)
- **输入**：Markdown 原文本
- **处理**：解析标题层级（# H1 - ###### H6），构建嵌套章节树
- **输出**：`Template` 对象 `{ raw: string, structure: Section[] }`

#### AI 服务 (`openai.ts`)
- **支持提供商**：OpenAI / NVIDIA NIM
- **调用模式**：流式（`chatStream`）/ 非流式（`chat`）
- **Prompt 构建**：根据当前章节动态构建游戏设计助手 Prompt

#### 状态管理 (`stores/`)
- **documentStore**：持久化存储模板和章节生成内容
- **chatStore**：管理多会话、消息历史、自动生成标题
- **settingsStore**：存储 API 配置（key、baseURL、model）

#### 飞书集成 (`feishuSDK.ts`)
- 动态加载飞书 JSSDK
- 创建/读取云文档
- API 不可用时降级为本地下载

### 3. 数据流

```
用户输入 → ChatPanel → addMessage() → chatStore
                    ↓
              AIService.chatStream()
                    ↓
              流式更新 updateMessage()
                    ↓
              UI 实时渲染（带光标动画 ▋）
```

---

## ⚠️ 注意事项

### 已知问题

| 位置 | 问题描述 | 影响 |
|------|----------|------|
| `src/pages/Workspace.tsx:73` | 使用了未定义的 `getOpenAIService`，应为 `getAIService` | 会导致运行时错误 |

### 开发注意

1. **流式响应处理**：AI 回复使用流式传输，需正确处理 `readStream` 中的 buffer 拼接
2. **会话容量限制**：最多保留 30 个会话，超出时按更新时间自动清理
3. **持久化策略**：所有 Store 使用 `zustand/persist`，数据存储在 localStorage
4. **移动端适配**：小屏幕下侧边栏变为抽屉，需测试响应式布局
5. **飞书降级**：飞书 SDK 加载失败或 API 不可用时，自动降级为本地下载

### 代码规范

- **智能注释**：只注释"为什么"，不注释"做什么"
- **TypeScript 严格模式**：已启用 `strict`、`noUnusedLocals`、`noUnusedParameters`
- **组件命名**：PascalCase，文件名与组件名一致
- **样式**：优先使用 Tailwind 工具类，避免内联样式

---

## 🔗 关联文件

| 模块 | 关键文件 |
|------|----------|
| 路由入口 | `src/App.tsx` |
| 主工作区 | `src/pages/Workspace.tsx` |
| AI 服务 | `src/services/openai.ts` |
| 模板解析 | `src/services/templateParser.ts` |
| 聊天状态 | `src/stores/chatStore.ts` |
| 文档状态 | `src/stores/documentStore.ts` |
| 类型定义 | `src/types/index.ts` |

---

## 📝 TODOS

<!-- 此处记录项目 TODO 事项，完成后删除并记录总结 -->

### 待办事项

- [2026-01-21][bug] 修复 Workspace.tsx 中 `getOpenAIService` 引用错误

### 已完成

<!-- 完成的 TODO 记录在此处 -->
