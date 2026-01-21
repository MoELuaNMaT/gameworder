import type { ApiConfig } from '@/types'

/**
 * 根据对话内容生成智能标题
 * 分析前几轮对话，提取游戏类型和核心概念
 */
export async function generateConversationTitle(
  messages: Array<{ role: string; content: string }>,
  config: ApiConfig
): Promise<string> {
  const sampleMessages = messages.slice(0, 5)

  if (sampleMessages.length === 0) {
    return '新对话'
  }

  try {
    const prompt = `根据以下对话内容，生成一个简洁的标题（不超过15字）。
标题应体现游戏类型（如RPG、策略、卡牌等）和核心创意。

对话内容：
${sampleMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n')}

要求：
1. 只返回标题，不要任何解释
2. 标题格式：[游戏类型] 核心概念
3. 示例："赛博朋克ARPG"、"太空4X策略"、"多人卡牌对战"`

    const response = await fetch(
      `${config.baseURL.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 30,
          temperature: 0.3,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim() || '新对话'

    return title.replace(/^['"]|['"]$/g, '').substring(0, 20)
  } catch (error) {
    console.error('Failed to generate conversation title:', error)
    // 降级方案：使用首条消息前15字
    const firstUserMessage =
      sampleMessages.find((m) => m.role === 'user')?.content || ''
    return (
      firstUserMessage.substring(0, 15) +
      (firstUserMessage.length > 15 ? '...' : '')
    )
  }
}
