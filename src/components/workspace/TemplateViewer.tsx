import { useState, useEffect } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { Section } from '@/types'

interface TemplateViewerProps {
  sections: Section[]
  onSectionSelect?: (section: Section) => void
  selectedSectionId?: string
}

export default function TemplateViewer({
  sections,
  onSectionSelect,
  selectedSectionId,
}: TemplateViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // 默认展开所有顶级章节
  useEffect(() => {
    const topLevelIds = sections.map((s) => s.id)
    setExpandedSections(new Set(topLevelIds))
  }, [sections])

  const toggleExpand = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const renderSection = (section: Section, depth = 0): React.ReactNode => {
    const isExpanded = expandedSections.has(section.id)
    const hasChildren = section.children.length > 0
    const isSelected = selectedSectionId === section.id

    return (
      <div key={section.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-slate-100 transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(section.id)
            }
            onSectionSelect?.(section)
          }}
        >
          {/* 展开/收起图标 */}
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}

          {/* 章节标题 */}
          <span className={`text-sm flex-1 ${depth === 0 ? 'font-medium' : ''}`}>
            {section.title}
          </span>

          {/* 章节级别标识 */}
          <span className="text-xs text-slate-400">H{section.level}</span>
        </div>

        {/* 子章节 */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {section.children.map((child) => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>暂无模板</p>
        <p className="text-sm mt-2 mb-4">请上传 Markdown 模板文件</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          重新上传
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* 统计信息 */}
      <div className="mb-4 pb-4 border-b text-sm text-slate-500">
        <p>共 {sections.length} 个顶级章节</p>
        <p className="text-xs mt-1">点击章节可查看详情</p>
      </div>

      {/* 章节树 */}
      {sections.map((section) => renderSection(section))}
    </div>
  )
}
