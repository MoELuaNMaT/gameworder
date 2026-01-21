import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatConversation, ChatMessage, ChatStoreState } from '@/types'

const MAX_CONVERSATIONS = 30

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      sidebarCollapsed: false,
      drawerOpen: false,

      // 创建新会话
      createConversation: () => {
        const newConversation: ChatConversation = {
          id: crypto.randomUUID(),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newConversation.id,
        }))

        get().enforceConversationLimit(MAX_CONVERSATIONS)
        return newConversation.id
      },

      // 删除会话
      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id)
          const newCurrentId =
            state.currentConversationId === id
              ? filtered.length > 0
                ? filtered[0].id
                : null
              : state.currentConversationId
          return {
            conversations: filtered,
            currentConversationId: newCurrentId,
          }
        })
      },

      // 切换会话
      switchConversation: (id) => {
        set({ currentConversationId: id })
      },

      // 更新会话标题（AI生成后调用）
      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }))
      },

      // 添加消息
      addMessage: (message) => {
        const state = get()
        const currentId = state.currentConversationId || get().createConversation()

        const newMessage: ChatMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        }

        set((prevState) => ({
          conversations: prevState.conversations.map((c) =>
            c.id === currentId
              ? {
                  ...c,
                  messages: [...c.messages, newMessage],
                  updatedAt: Date.now(),
                }
              : c
          ),
        }))

        return newMessage
      },

      // 清空当前会话
      clearCurrentConversation: () => {
        const state = get()
        if (!state.currentConversationId) return

        set((prevState) => ({
          conversations: prevState.conversations.map((c) =>
            c.id === state.currentConversationId
              ? { ...c, messages: [], updatedAt: Date.now() }
              : c
          ),
        }))
      },

      // 容量限制
      enforceConversationLimit: (max = MAX_CONVERSATIONS) => {
        set((state) => {
          if (state.conversations.length <= max) return state

          const sorted = [...state.conversations].sort(
            (a, b) => b.updatedAt - a.updatedAt
          )
          const kept = sorted.slice(0, max)
          const deletedIds = new Set(
            state.conversations
              .filter((c) => !kept.includes(c))
              .map((c) => c.id)
          )

          const newCurrentId = deletedIds.has(state.currentConversationId || '')
            ? kept[0]?.id || null
            : state.currentConversationId

          return { conversations: kept, currentConversationId: newCurrentId }
        })
      },

      // 切换侧边栏折叠状态
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      // 切换移动端抽屉状态
      toggleDrawer: () => {
        set((state) => ({ drawerOpen: !state.drawerOpen }))
      },

      // 更新消息（流式输出）
      updateMessage: (id, content) => {
        const state = get()
        set((prevState) => ({
          conversations: prevState.conversations.map((c) => {
            if (c.id === state.currentConversationId) {
              return {
                ...c,
                messages: c.messages.map((msg) =>
                  msg.id === id ? { ...msg, content } : msg
                ),
                updatedAt: Date.now(),
              }
            }
            return c
          }),
        }))
      },

      // 删除消息
      deleteMessage: (id) => {
        const state = get()
        set((prevState) => ({
          conversations: prevState.conversations.map((c) => {
            if (c.id === state.currentConversationId) {
              return {
                ...c,
                messages: c.messages.filter((msg) => msg.id !== id),
                updatedAt: Date.now(),
              }
            }
            return c
          }),
        }))
      },

      // 导出会话为Markdown
      exportConversation: (id) => {
        const state = get()
        const conversation = state.conversations.find((c) => c.id === id)
        if (!conversation) return null

        const markdown =
          `# ${conversation.title}\n\n` +
          conversation.messages
            .map(
              (msg) =>
                `## ${msg.role === 'user' ? '用户' : 'AI'}\n\n${msg.content}\n`
            )
            .join('\n---\n\n')

        return {
          filename: `${conversation.title}_${new Date(conversation.createdAt).toISOString().slice(0, 10)}.md`,
          content: markdown,
        }
      },

      // 获取当前会话的消息
      getCurrentMessages: () => {
        const state = get()
        const current = state.conversations.find(
          (c) => c.id === state.currentConversationId
        )
        return current?.messages || []
      },
    }),
    {
      name: 'gameworder:chat',
      version: 2,

      // 数据迁移：处理旧版本数据
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persistedState: any, version: number) => {
        if (version === 1) {
          // 旧版本数据结构：{ messages: [] }
          const oldMessages = persistedState.messages || []

          // 创建默认会话，迁移旧消息
          return {
            conversations: [
              {
                id: crypto.randomUUID(),
                title: '历史对话',
                messages: oldMessages,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
            currentConversationId: null, // 将在hydrate后设置为第一个会话
            sidebarCollapsed: false,
            drawerOpen: false,
          }
        }
        return persistedState
      },

      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        sidebarCollapsed: state.sidebarCollapsed,
        drawerOpen: state.drawerOpen,
      }),
    }
  )
)
