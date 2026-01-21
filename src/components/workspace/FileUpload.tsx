import { useCallback } from 'react'
import { templateParser } from '@/services/templateParser'
import { useDocumentStore } from '@/stores/documentStore'

interface FileUploadProps {
  onTemplateLoaded?: (template: ReturnType<typeof templateParser.parse>) => void
}

export default function FileUpload({ onTemplateLoaded }: FileUploadProps) {
  const { setTemplate } = useDocumentStore()

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.md')) {
        alert('请选择 Markdown (.md) 文件')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          if (!content) {
            alert('文件内容为空')
            return
          }

          const template = templateParser.parse(content)

          if (template.structure.length === 0) {
            alert('解析失败：Markdown 文件中没有找到标题（# 开头的行）')
            return
          }

          setTemplate(template)
          onTemplateLoaded?.(template)
        } catch (error) {
          alert(`解析文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }

      reader.onerror = () => {
        alert('读取文件失败')
      }

      reader.readAsText(file)
    },
    [setTemplate, onTemplateLoaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".md"
        onChange={handleFileInput}
        className="hidden"
      />
      <svg className="mx-auto h-12 w-12 mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-slate-600 mb-2">点击或拖拽 Markdown 文件到此处</p>
      <p className="text-sm text-slate-400">支持 .md 格式的游戏设计文档模板</p>
    </div>
  )
}
