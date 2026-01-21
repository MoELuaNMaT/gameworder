// 设置相关类型
export type AIProvider = 'openai' | 'nvidia-nim'

export interface ApiConfig {
  provider: AIProvider
  apiKey: string
  baseURL: string
  model: string
}

export interface Settings {
  theme: 'light' | 'dark'
  autoSave: boolean
}

// 聊天相关类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// 会话类型
export interface ChatConversation {
  id: string
  title: string           // AI生成的会话标题
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

// 聊天存储状态
export interface ChatStoreState {
  conversations: ChatConversation[]
  currentConversationId: string | null
  sidebarCollapsed: boolean
  drawerOpen: boolean     // 移动端抽屉状态

  // 会话管理方法
  createConversation: () => string
  deleteConversation: (id: string) => void
  switchConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void

  // 消息管理方法
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage
  clearCurrentConversation: () => void
  updateMessage: (id: string, content: string) => void
  deleteMessage: (id: string) => void

  // 容量管理
  enforceConversationLimit: (max?: number) => void

  // UI 状态管理
  toggleSidebar: () => void
  toggleDrawer: () => void

  // 导出和获取
  exportConversation: (id: string) => { filename: string; content: string } | null
  getCurrentMessages: () => ChatMessage[]
}

// 模板相关类型
export interface Section {
  id: string
  level: number
  title: string
  content: string
  children: Section[]
  depth?: number  // 用于扁平化显示时的层级深度
}

export interface Template {
  raw: string
  structure: Section[]
}

// 文档相关类型
export interface Workspace {
  template: Template | null
  chatHistory: ChatMessage[]
  sectionContents: Record<string, string>
  lastModified: string
}
