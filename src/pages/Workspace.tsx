import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MessageSquare } from 'lucide-react'
import SettingsPanel from '@/components/SettingsPanel'
import ConversationSidebar from '@/components/workspace/ConversationSidebar'
import ChatPanel from '@/components/workspace/ChatPanel'
import TemplateViewer from '@/components/workspace/TemplateViewer'
import FileUpload from '@/components/workspace/FileUpload'
import { useDocumentStore } from '@/stores/documentStore'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getAIService } from '@/services/openai'
import { templateParser } from '@/services/templateParser'
import type { Section } from '@/types'

export default function Workspace() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [generatingContent, setGeneratingContent] = useState(false)
  const { workspace, clearTemplate, setTemplate, setSectionContent } = useDocumentStore()
  const {
    conversations,
    createConversation,
    clearCurrentConversation,
    drawerOpen,
    toggleDrawer,
    getCurrentMessages,
  } = useChatStore()
  const { apiConfig } = useSettingsStore()

  // 获取当前会话消息
  const currentMessages = getCurrentMessages()

  // 初始化默认会话
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSectionSelect = (section: Section) => {
    setSelectedSection(section)
  }

  const handleClearMessages = () => {
    clearCurrentConversation()
    setShowClearConfirm(false)
  }

  const handleGenerateContent = async () => {
    if (!selectedSection || !apiConfig.apiKey) {
      alert('请先配置 API Key 并选择一个章节')
      return
    }

    // 获取当前会话消息
    const {
      getCurrentMessages,
    } = useChatStore.getState()
    const currentMessages = getCurrentMessages()

    if (currentMessages.length === 0) {
      alert('请先与 AI 助手进行对话')
      return
    }

    setGeneratingContent(true)

    try {
      const service = getAIService(apiConfig)

      // 构建生成内容的提示词
      const prompt = `请根据我们刚才的讨论，为"${selectedSection.title}"章节生成完整的游戏设计文档内容。

要求：
1. 使用专业的游戏设计文档语言
2. 内容要具体、可执行，避免空泛
3. 使用 Markdown 格式
4. 保持简洁但完整
5. 可以包含要点列表、表格等格式

请直接输出文档内容，不需要额外的解释。`

      // 调用 AI 生成内容（非流式）
      const response = await service.chat([
        {
          id: 'system',
          role: 'system',
          content: service.buildGameDesignSystemPrompt({
            currentSection: selectedSection.title,
          }),
          timestamp: Date.now(),
        },
        ...currentMessages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        {
          id: 'generate',
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        },
      ])

      // 保存生成的内容
      setSectionContent(selectedSection.id, response.content)
    } catch (error) {
      alert(`生成内容失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setGeneratingContent(false)
    }
  }

  const handleExportDocument = async (exportToFeishu = false) => {
    if (!workspace.template) {
      alert('请先上传模板')
      return
    }

    // 递归渲染章节树
    const renderSection = (section: Section, depth = 0): string => {
      const prefix = '#'.repeat(section.level)
      let content = `${prefix} ${section.title}\n\n`

      // 如果有生成的内容，添加内容
      if (workspace.sectionContents[section.id]) {
        content += workspace.sectionContents[section.id] + '\n\n'
      }

      // 递归渲染子章节
      if (section.children && section.children.length > 0) {
        section.children.forEach((child: Section) => {
          content += renderSection(child, depth + 1)
        })
      }

      return content
    }

    // 生成完整文档
    let fullDocument = `# ${workspace.template.raw.split('\n').find((l: string) => l.startsWith('#'))?.substring(1).trim() || '游戏设计文档'}\n\n`

    workspace.template.structure.forEach((section) => {
      fullDocument += renderSection(section)
    })

    // 导出到飞书云文档
    if (exportToFeishu) {
      try {
        const { feishuSDK } = await import('@/services/feishuSDK')

        if (!feishuSDK.isAvailable()) {
          alert('飞书 SDK 不可用，将使用本地下载')
          // 继续执行本地下载
        } else {
          await feishuSDK.createDocument(
            `游戏设计文档_${new Date().toLocaleDateString()}`,
            fullDocument
          )
          alert('已成功导出到飞书云文档！')
          return
        }
      } catch (error) {
        console.error('飞书导出失败:', error)
        // 降级到本地下载
      }
    }

    // 本地下载（原有逻辑）
    const blob = new Blob([fullDocument], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `游戏设计文档_${new Date().toLocaleDateString()}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportFromFeishu = async () => {
    try {
      const { feishuSDK } = await import('@/services/feishuSDK')

      if (!feishuSDK.isAvailable()) {
        alert('飞书 SDK 不可用，请确保在飞书环境中运行')
        return
      }

      const file = await feishuSDK.selectFile()

      if (!file) {
        return // 用户取消选择
      }

      const content = await feishuSDK.readDocument(file.fileId)
      const template = templateParser.parse(content)

      if (template.structure.length === 0) {
        alert('解析失败：文档中没有找到标题')
        return
      }

      setTemplate(template)
      alert('导入成功！')
    } catch (error) {
      console.error('飞书导入失败:', error)
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 显示设置页面
  if (showSettings) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-600 hover:text-slate-800"
            >
              ← 返回
            </button>
            <h1 className="text-xl font-semibold">设置</h1>
          </div>
        </header>
        <SettingsPanel onClose={() => setShowSettings(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="w-full mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* 移动端抽屉按钮 */}
            <button
              onClick={toggleDrawer}
              className="lg:hidden p-2 hover:bg-slate-100 rounded"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <Link to="/" className="text-xl font-bold text-slate-800">
              GameWorder
            </Link>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              ⚙️ 设置
            </button>
          </div>
        </div>
      </header>
      <main className="w-full mx-auto p-4">
        <div className="flex gap-4">
          {/* 桌面端侧边栏 */}
          <ConversationSidebar />

          {/* 主内容区 */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 模板查看器 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col h-[calc(100vh-180px)] min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">📄 模板结构</h2>
              <div className="flex gap-2">
                {workspace.template && (
                  <>
                    <button
                      onClick={() => handleExportDocument(false)}
                      className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      💾 本地下载
                    </button>
                    <button
                      onClick={() => handleExportDocument(true)}
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      🚀 飞书导出
                    </button>
                    <button
                      onClick={clearTemplate}
                      className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                    >
                      清除模板
                    </button>
                  </>
                )}
                <button
                  onClick={handleImportFromFeishu}
                  className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  📥 从飞书导入
                </button>
              </div>
            </div>
            {workspace.template ? (
              <div className="flex-1 overflow-y-auto">
                <TemplateViewer
                  sections={workspace.template.structure}
                  onSectionSelect={handleSectionSelect}
                  selectedSectionId={selectedSection?.id}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <FileUpload />
              </div>
            )}
          </div>

          {/* 聊天面板 */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col h-[calc(100vh-180px)] min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">🤖 AI 助手</h2>
              {currentMessages.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  清空对话
                </button>
              )}
            </div>
            <ChatPanel currentSection={selectedSection} />
          </div>
        </div>

        {/* 文档预览 */}
        <div className="mt-4 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">📝 文档预览</h2>
            {selectedSection && (
              <button
                onClick={handleGenerateContent}
                disabled={generatingContent || currentMessages.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {generatingContent ? '生成中...' : '✨ AI 生成内容'}
              </button>
            )}
          </div>
          {selectedSection ? (
            <div>
              <div className="mb-4 pb-4 border-b">
                <h3 className="text-lg font-bold mb-1">{selectedSection.title}</h3>
                <p className="text-sm text-slate-500">章节级别: H{selectedSection.level}</p>
              </div>
              <div className="prose prose-sm max-w-none prose-slate">
                {workspace.sectionContents[selectedSection.id] ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      p: ({ children }: { children: React.ReactNode }) => (
                        <p className="mb-3 last:mb-0">{children}</p>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      ul: ({ children }: { children: React.ReactNode }) => (
                        <ul className="list-disc pl-6 mb-3">{children}</ul>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      ol: ({ children }: { children: React.ReactNode }) => (
                        <ol className="list-decimal pl-6 mb-3">{children}</ol>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      li: ({ children }: { children: React.ReactNode }) => (
                        <li className="mb-1">{children}</li>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      h1: ({ children }: { children: React.ReactNode }) => (
                        <h1 className="text-xl font-bold mb-3">{children}</h1>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      h2: ({ children }: { children: React.ReactNode }) => (
                        <h2 className="text-lg font-bold mb-3">{children}</h2>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      h3: ({ children }: { children: React.ReactNode }) => (
                        <h3 className="text-base font-bold mb-2">{children}</h3>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      table: ({ children }: { children: React.ReactNode }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full border border-slate-300">{children}</table>
                        </div>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      th: ({ children }: { children: React.ReactNode }) => (
                        <th className="border border-slate-300 px-4 py-2 bg-slate-100 font-bold text-left">
                          {children}
                        </th>
                      ),
                      // @ts-expect-error - ReactMarkdown components prop type mismatch
                      td: ({ children }: { children: React.ReactNode }) => (
                        <td className="border border-slate-300 px-4 py-2">{children}</td>
                      ),
                    }}
                  >
                    {workspace.sectionContents[selectedSection.id]}
                  </ReactMarkdown>
                ) : (
                  <div className="bg-slate-50 p-8 rounded border text-center">
                    {currentMessages.length === 0 ? (
                      <>
                        <p className="text-slate-400 mb-2">暂无内容</p>
                        <p className="text-sm text-slate-300">先与 AI 助手讨论，然后点击"AI 生成内容"</p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-400 mb-2">内容待生成</p>
                        <p className="text-sm text-slate-300">点击上方"AI 生成内容"按钮，根据对话生成文档</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p>请选择左侧章节查看详情</p>
            </div>
          )}
        </div>
        </div>
      </main>

      {/* 移动端抽屉 */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={toggleDrawer}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-slate-50 z-50 lg:hidden overflow-y-auto">
            <ConversationSidebar />
          </div>
        </>
      )}

      {/* 清空对话确认对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">清空对话历史</h3>
            <p className="text-slate-600 mb-4">
              确定要清空所有对话历史吗？此操作不可撤销。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleClearMessages}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
