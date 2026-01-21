/**
 * 飞书 JSSDK 封装服务
 * 用于与飞书开放平台 API 交互
 */

// 飞书全局类型声明
declare global {
  interface Window {
    tt?: {
      ready: (callback: () => void) => void
      doc?: {
        createDocument: (options: {
          title: string
          content: string
          success: (res: { data: { documentId: string } }) => void
          fail: (err: { errorMessage: string }) => void
        }) => void
        getDocumentContent: (options: {
          documentId: string
          success: (res: { data: { content: string } }) => void
          fail: (err: { errorMessage: string }) => void
        }) => void
      }
      chooseFile?: (options: {
        type: string
        success: (res: { data: { fileId: string; title: string } }) => void
        fail: () => void
      }) => void
    }
  }
}

class FeishuSDKService {
  private initialized = false

  /**
   * 初始化飞书 JSSDK
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      // 动态加载飞书 JSSDK
      const script = document.createElement('script')
      script.src = 'https://lf1-cdn-tos.bytegoofy.com/goofy/lark/op/h5-js-sdk-1.5.17.js'
      script.onload = () => {
        if (window.tt) {
          window.tt.ready(() => {
            this.initialized = true
            console.log('飞书 JSSDK 初始化成功')
            resolve()
          })
        } else {
          reject(new Error('飞书 JSSDK 加载失败'))
        }
      }
      script.onerror = () => reject(new Error('飞书 JSSDK 加载失败'))
      document.head.appendChild(script)
    })
  }

  /**
   * 创建飞书云文档并写入内容
   */
  async createDocument(title: string, content: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      if (!window.tt?.doc?.createDocument) {
        // 降级：触发浏览器下载
        this.triggerBrowserDownload(title, content)
        reject(new Error('飞书 API 不可用，已为您准备本地文件'))
        return
      }

      window.tt.doc.createDocument({
        title,
        content,
        success: (res: { data: { documentId: string } }) => {
          resolve(res.data.documentId)
        },
        fail: (err: { errorMessage: string }) => {
          // 降级：触发浏览器下载
          this.triggerBrowserDownload(title, content)
          reject(new Error(`创建文档失败: ${err.errorMessage}，已为您准备本地文件`))
        }
      })
    })
  }

  /**
   * 从飞书云文档读取内容
   */
  async readDocument(documentId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.tt?.doc?.getDocumentContent) {
        reject(new Error('飞书 API 不可用'))
        return
      }

      window.tt.doc.getDocumentContent({
        documentId,
        success: (res: { data: { content: string } }) => {
          resolve(res.data.content)
        },
        fail: (err: { errorMessage: string }) => {
          reject(new Error(`读取文档失败: ${err.errorMessage}`))
        }
      })
    })
  }

  /**
   * 打开飞书文件选择器
   */
  async selectFile(): Promise<{ fileId: string; title: string } | null> {
    return new Promise((resolve) => {
      if (!window.tt?.chooseFile) {
        resolve(null)
        return
      }

      window.tt.chooseFile({
        type: 'doc',
        success: (res: { data: { fileId: string; title: string } }) => {
          resolve({
            fileId: res.data.fileId,
            title: res.data.title
          })
        },
        fail: () => {
          resolve(null)
        }
      })
    })
  }

  /**
   * 检查 SDK 是否可用
   */
  isAvailable(): boolean {
    return this.initialized && typeof window !== 'undefined' && 'tt' in window
  }

  /**
   * 降级方案：触发浏览器下载
   */
  private triggerBrowserDownload(title: string, content: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const feishuSDK = new FeishuSDKService()
