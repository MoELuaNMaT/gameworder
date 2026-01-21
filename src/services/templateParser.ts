import type { Section, Template } from '@/types'

/**
 * Markdown 模板解析器
 * 负责解析 Markdown 文件并提取章节结构
 */
export class TemplateParser {
  /**
   * 解析 Markdown 内容，提取章节结构
   */
  parse(markdown: string): Template {
    // 移除 BOM（如果存在）
    if (markdown.charCodeAt(0) === 0xFEFF) {
      markdown = markdown.slice(1)
    }

    // 统一换行符：将 \r\n 和 \r 都替换为 \n
    markdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    const lines = markdown.split('\n')
    const sections: Section[] = []
    const stack: Section[] = []

    lines.forEach((line, index) => {
      // 匹配标题 # ## ### 等
      const headingMatch = line.match(/^(\s{0,3})(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[2].length
        const title = headingMatch[3].trim()
        const id = this.generateId(title, index)

        const section: Section = {
          id,
          level,
          title,
          content: '',
          children: [],
        }

        // 弹出栈中级别大于等于当前级别的章节
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        // 如果有父级，添加到父级的 children
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(section)
        } else {
          // 顶级章节
          sections.push(section)
        }

        // 当前章节入栈
        stack.push(section)
      }
    })

    return {
      raw: markdown,
      structure: sections,
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(title: string, index: number): string {
    // 简化标题作为 ID，添加索引确保唯一性
    const simplified = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return simplified ? `${simplified}-${index}` : `section-${index}`
  }

  /**
   * 扁平化章节树为列表（方便显示）
   */
  flatten(sections: Section[]): Section[] {
    const result: Section[] = []

    function traverse(sections: Section[], depth = 0) {
      sections.forEach((section) => {
        result.push({ ...section, depth })
        if (section.children.length > 0) {
          traverse(section.children, depth + 1)
        }
      })
    }

    traverse(sections)
    return result
  }

  /**
   * 根据章节 ID 查找章节
   */
  findSection(sections: Section[], id: string): Section | null {
    for (const section of sections) {
      if (section.id === id) {
        return section
      }
      if (section.children.length > 0) {
        const found = this.findSection(section.children, id)
        if (found) return found
      }
    }
    return null
  }

  /**
   * 提取章节的 Markdown 内容
   */
  extractSectionContent(markdown: string, section: Section): string {
    const lines = markdown.split('\n')
    const startLine = this.findLineNumber(markdown, section.id)

    if (startLine === -1) return ''

    // 从标题行开始，到下一个同级或更高级标题为止
    let content = ''
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{1,6})\s+/)

      if (headingMatch) {
        const level = headingMatch[1].length
        // 遇到同级或更高级的标题，停止
        if (level <= section.level) {
          break
        }
      }

      content += line + '\n'
    }

    return content.trim()
  }

  /**
   * 查找章节所在的行号
   */
  private findLineNumber(markdown: string, id: string): number {
    const lines = markdown.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const title = headingMatch[2].trim()
        const generatedId = this.generateId(title, i)
        if (generatedId === id) {
          return i
        }
      }
    }
    return -1
  }
}

// 导出单例
export const templateParser = new TemplateParser()
