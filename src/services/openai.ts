import type { ChatMessage, AIProvider, ApiConfig } from '@/types'

export interface ChatResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * NVIDIA NIM API 配置接口
 */
interface NIMConfig extends ApiConfig {
  provider: 'nvidia-nim'
  invokeUrl?: string  // 自定义 NIM 调用地址
}

/**
 * 统一的 AI 服务接口
 */
class AIService {
  private config: ApiConfig

  constructor(config: ApiConfig, stream = true) {
    this.config = config
    // stream 参数保留用于未来扩展
    void stream
  }

  updateConfig(config: Partial<ApiConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const messages = this.config.provider === 'nvidia-nim'
        ? await this.nimChat([], { maxTokens: 1 })
        : await this.openaiChat([], { maxTokens: 1 })

      return { success: !!messages }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络连接失败'
      }
    }
  }

  /**
   * NVIDIA NIM API 调用（流式）
   */
  private async nimStreamChat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const { invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions' } = this.config as NIMConfig
    const stream = true

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json'
    }

    const payload = {
      model: this.config.model || 'meta/llama-4-maverick-17b-128e-instruct',
      messages: this.filterMessages(messages),
      max_tokens: options?.maxTokens || 512,
      temperature: options?.temperature ?? 1.0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stream
    }

    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`NIM API 错误: ${response.status} - ${errorText}`)
    }

    return await this.readStream(response, this.config.provider)
  }

  /**
   * NVIDIA NIM API 调用（非流式）
   */
  private async nimChat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const { invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions' } = this.config as NIMConfig

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    const payload = {
      model: this.config.model || 'meta/llama-4-maverick-17b-128e-instruct',
      messages: this.filterMessages(messages),
      max_tokens: options?.maxTokens || 512,
      temperature: options?.temperature ?? 1.0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stream: false
    }

    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`NIM API 错误: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  /**
   * OpenAI API 调用（流式）
   */
  private async openaiStreamChat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    let apiUrl = this.config.baseURL
    if (!apiUrl.includes('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '')
      apiUrl += '/chat/completions'
    }

    const requestBody = {
      model: this.config.model,
      messages: messages
        .filter((m) => m.role !== 'system' || m.content)
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return await this.readStream(response, this.config.provider)
  }

  /**
   * OpenAI API 调用（非流式）
   */
  private async openaiChat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<ChatResponse> {
    let apiUrl = this.config.baseURL
    if (!apiUrl.includes('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '')
      apiUrl += '/chat/completions'
    }

    const requestBody = {
      model: this.config.model,
      messages: messages
        .filter((m) => m.role !== 'system' || m.content)
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
      temperature: options?.temperature ?? 0.7,
      stream: false,
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    const data = await response.json()
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    }
  }

  /**
   * 读取流式响应
   */
  private async readStream(response: Response, provider: AIProvider): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)

          if (data === '[DONE]') {
            break
          }

          try {
            const parsed = JSON.parse(data)
            let content = ''

            // OpenAI 格式
            if (provider === 'openai') {
              content = parsed.choices?.[0]?.delta?.content
            }
            // NIM 格式
            else if (provider === 'nvidia-nim') {
              content = parsed.choices?.[0]?.message?.content
            }

            if (content) {
              fullContent += content
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    return fullContent
  }

  /**
   * 过滤系统消息
   */
  private filterMessages(messages: ChatMessage[]) {
    return messages
      .filter((m) => m.role !== 'system' || m.content)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }))
  }

  /**
   * 发送流式聊天请求
   */
  async chatStream(
    messages: ChatMessage[],
    _onChunk: (content: string) => void
  ): Promise<string> {
    let fullContent = ''

    if (this.config.provider === 'nvidia-nim') {
      fullContent = await this.nimStreamChat(messages, { temperature: 1.0 })
    } else {
      fullContent = await this.openaiStreamChat(messages, { temperature: 0.7 })
    }

    return fullContent
  }

  /**
   * 发送聊天请求（非流式）
   */
  async chat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<ChatResponse> {
    if (this.config.provider === 'nvidia-nim') {
      const content = await this.nimChat(messages, options)
      return { content }
    } else {
      return await this.openaiChat(messages, options)
    }
  }

  /**
   * 构建游戏设计助手的系统提示词
   */
  buildGameDesignSystemPrompt(context?: {
    templateStructure?: string
    currentSection?: string
  }): string {
    const providerName = this.config.provider === 'nvidia-nim' ? 'NVIDIA NIM' : 'OpenAI'

    const basePrompt = `你是一位经验丰富的游戏设计师，正在和一位同行朋友聊游戏创意。

对话原则：
1. **简短自然** - 每次回复控制在 3-5 句话，像真人聊天一样
2. **边聊边整理** - 帮助用户梳理思路，但要穿插在对话中
3. **提问引导** - 多问"你有没有考虑过...？""如果是...会怎样？"
4. **避免说教** - 不要一次性抛出大量信息，等待用户反应
5. **鼓励发散** - 当用户提到有趣点时，顺势展开讨论

回复风格：
- 口语化，像朋友讨论
- 适度使用表情符号（🎮、💡、🤔 等）
- 给出建议后问"你觉得呢？"
- 帮助用户发现没想到的角度

你正在使用 ${providerName} 作为 AI 提供商。

${
  context?.currentSection
    ? `

当前在讨论：${context.currentSection}
专注于这个章节，但要和整体设计保持连贯。`
    : ''
}
${
  context?.templateStructure
    ? `

文档框架：
${context.templateStructure}`
    : ''
}

记住：我们是平等讨论，不是你在授课。多提问，少讲课。`
    return basePrompt
  }
}

// 创建单例实例
let aiServiceInstance: AIService | null = null

export function getAIService(config: ApiConfig, stream = true): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService(config, stream)
  } else {
    aiServiceInstance.updateConfig(config)
  }
  return aiServiceInstance
}
