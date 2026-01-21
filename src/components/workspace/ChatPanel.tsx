import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSettingsStore } from '@/stores/settingsStore'
import { useChatStore } from '@/stores/chatStore'
import { getAIService } from '@/services/openai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Section } from '@/types'

interface ChatPanelProps {
  currentSection?: Section | null
}

export default function ChatPanel({ currentSection }: ChatPanelProps) {
  const { apiConfig } = useSettingsStore()
  const {
    getCurrentMessages,
    addMessage,
    updateMessage,
    conversations,
    currentConversationId,
    updateConversationTitle,
  } = useChatStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 获取当前会话消息
  const messages = getCurrentMessages()
  const currentConversation = conversations.find(c => c.id === currentConversationId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessageId])

  // 智能标题生成（当会话有足够消息时触发）
  useEffect(() => {
    const generateTitle = async () => {
      if (
        !apiConfig.apiKey ||
        !currentConversation ||
        currentConversation.messages.length < 3 ||
        currentConversation.title !== '新对话'
      ) {
        return
      }

      try {
        const { generateConversationTitle } = await import('@/services/conversationTitleGenerator')
        const title = await generateConversationTitle(currentConversation.messages, apiConfig)
        updateConversationTitle(currentConversation.id, title)
      } catch (err) {
        console.error('Failed to generate title:', err)
      }
    }

    generateTitle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.messages.length, apiConfig, currentConversation?.id])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    if (!apiConfig.apiKey) {
      setError('请先在设置中配置 API Key')
      return
    }

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // 添加用户消息
    addMessage({
      role: 'user',
      content: userMessage,
    })

    setLoading(true)

    try {
      const service = getAIService(apiConfig)

      // 构建消息历史，包含系统提示词和章节上下文
      const systemPrompt = service.buildGameDesignSystemPrompt({
        currentSection: currentSection?.title,
      })
      const messagesWithSystem = [
        { id: 'system', role: 'system' as const, content: systemPrompt, timestamp: Date.now() },
        ...messages,
        { id: 'temp', role: 'user' as const, content: userMessage, timestamp: Date.now() },
      ]

      // 创建 AI 消息并获取生成的 ID
      const aiMessage = addMessage({
        role: 'assistant',
        content: '',
      })
      const aiMessageId = aiMessage.id
      setStreamingMessageId(aiMessageId)

      // 流式调用
      try {
        const content = await service.chatStream(messagesWithSystem, (chunk) => {
          // 更新流式内容
          updateMessage(aiMessageId, chunk)
        })
        // 流式结束，最终更新一次确保内容完整
        updateMessage(aiMessageId, content)
      } catch (err) {
        setError(err instanceof Error ? err.message : '发送消息失败')
      } finally {
        setStreamingMessageId(null)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送消息失败')
      setLoading(false)
      setStreamingMessageId(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 当前章节提示 */}
      {currentSection && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 text-sm font-medium">📌 当前章节:</span>
            <span className="text-sm text-blue-700">{currentSection.title}</span>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>开始与 AI 助手对话</p>
            <p className="text-sm mt-2">告诉我你的游戏创意，让我帮你完善设计</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={message.id === streamingMessageId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 输入框 */}
      <div className="flex gap-2 pt-4 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="描述你的游戏创意... (Enter 发送)"
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? '发送中...' : '发送'}
        </Button>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming
}: {
  message: { role: string; content: string; id?: string }
  isStreaming?: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="text-sm font-medium mb-1 opacity-70">
          {isUser ? '你' : 'AI 助手'}
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                p: ({ children }: { children: React.ReactNode }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                ul: ({ children }: { children: React.ReactNode }) => (
                  <ul className="list-disc pl-4 mb-2">{children}</ul>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                ol: ({ children }: { children: React.ReactNode }) => (
                  <ol className="list-decimal pl-4 mb-2">{children}</ol>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                li: ({ children }: { children: React.ReactNode }) => (
                  <li className="mb-1">{children}</li>
                ),
                code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
                  // 判断是否是行内代码
                  const isInline = inline || !className
                  return isInline ? (
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-200 p-2 rounded text-sm overflow-x-auto" {...props}>
                      {children}
                    </code>
                  )
                },
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                h1: ({ children }: { children: React.ReactNode }) => (
                  <h1 className="text-lg font-bold mb-2">{children}</h1>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                h2: ({ children }: { children: React.ReactNode }) => (
                  <h2 className="text-base font-bold mb-2">{children}</h2>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                h3: ({ children }: { children: React.ReactNode }) => (
                  <h3 className="text-sm font-bold mb-2">{children}</h3>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                strong: ({ children }: { children: React.ReactNode }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                // @ts-expect-error - ReactMarkdown components prop type mismatch
                em: ({ children }: { children: React.ReactNode }) => (
                  <em className="italic">{children}</em>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {/* 流式光标放在 ReactMarkdown 外部 */}
            {isStreaming && <span className="animate-pulse">▋</span>}
          </div>
        )}
      </div>
    </div>
  )
}
