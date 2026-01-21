import { useState } from 'react'
import { useChatStore } from '@/stores/chatStore'
import {
  MessageSquarePlus,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ConversationSidebar() {
  const {
    conversations,
    currentConversationId,
    sidebarCollapsed,
    createConversation,
    deleteConversation,
    switchConversation,
    toggleSidebar,
    exportConversation,
  } = useChatStore()

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 折叠状态（桌面端）
  if (sidebarCollapsed) {
    return (
      <div className="hidden lg:block w-12 border-r border-slate-200 bg-slate-50 flex flex-col items-center py-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-200 rounded transition-colors"
          title="展开侧边栏"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    )
  }

  // 删除确认对话框
  const confirmDelete = () => {
    if (deletingId) {
      deleteConversation(deletingId)
      setDeletingId(null)
    }
  }

  // 导出会话
  const handleExport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const data = exportConversation(id)
    if (data) {
      const blob = new Blob([data.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <>
      <div className="hidden lg:flex w-64 border-r border-slate-200 bg-slate-50 flex-col">
        {/* 折叠按钮 */}
        <div className="p-2 border-b border-slate-200 flex justify-end">
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            title="折叠侧边栏"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* 新对话按钮 */}
        <div className="p-3">
          <Button
            onClick={createConversation}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <MessageSquarePlus className="w-4 h-4" />
            新对话
          </Button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {conversations.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              暂无对话
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => switchConversation(conv.id)}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-all
                    ${
                      currentConversationId === conv.id
                        ? 'bg-blue-100 border border-blue-200'
                        : 'hover:bg-slate-100 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {conv.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {conv.messages.length} 条消息
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <button
                    onClick={(e) => handleExport(conv.id, e)}
                    className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                    title="导出会话"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (conversations.length === 1) {
                        alert('至少保留一个会话')
                        return
                      }
                      setDeletingId(conv.id)
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                    title="删除会话"
                  >
                    <X className="w-3 h-3 text-slate-500 hover:text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="p-3 border-t border-slate-200 text-xs text-slate-500 text-center">
          {conversations.length} / 30 个会话
        </div>
      </div>

      {/* 删除确认对话框 */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">删除会话</h3>
            <p className="text-slate-600 mb-4">
              确定要删除此会话吗？此操作不可撤销。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
