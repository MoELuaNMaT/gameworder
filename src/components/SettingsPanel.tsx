import { useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { getAIService } from '@/services/openai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { AIProvider } from '@/types'

interface SettingsPanelProps {
  onClose?: () => void
}

// AI 提供商选项
const AI_PROVIDER_OPTIONS: { value: AIProvider; label: string; description: string }[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    description: '支持 GPT-4、GPT-4o 等模型'
  },
  {
    value: 'nvidia-nim',
    label: 'NVIDIA NIM',
    description: '支持 Llama、Mistral 等 NVIDIA 托管模型'
  },
]

// 提供商对应的默认配置
const PROVIDER_DEFAULTS: Record<AIProvider, { baseURL: string; model: string }> = {
  'openai': {
    baseURL: 'https://api.openai.com/v1',
    model: '',
  },
  'nvidia-nim': {
    baseURL: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-4-maverick-17b-128e-instruct',
  },
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { apiConfig, setApiConfig } = useSettingsStore()
  const [localConfig, setLocalConfig] = useState(apiConfig)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const currentProvider = localConfig.provider || 'openai'
  const providerInfo = AI_PROVIDER_OPTIONS.find((p) => p.value === currentProvider)

  const handleProviderChange = (providerValue: string) => {
    const provider = providerValue as AIProvider
    setLocalConfig({
      ...localConfig,
      provider,
      baseURL: PROVIDER_DEFAULTS[provider].baseURL,
      model: PROVIDER_DEFAULTS[provider].model,
    })
  }

  const handleSave = async () => {
    // 先保存配置
    setApiConfig(localConfig)

    // 自动触发连接测试
    setTesting(true)
    setTestResult(null)

    try {
      const service = getAIService(localConfig)
      const result = await service.testConnection()

      setTestResult({
        success: result.success,
        message: result.success
          ? '✓ 配置已保存，连接测试成功！'
          : result.error || '连接失败',
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `配置已保存，但测试失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setTesting(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const service = getAIService(localConfig)
      const result = await service.testConnection()

      setTestResult({
        success: result.success,
        message: result.success ? '连接成功！API 配置有效。' : result.error || '连接失败',
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>API 设置</CardTitle>
          <CardDescription>
            配置你的 AI 服务连接信息。支持 OpenAI 和 NVIDIA NIM。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI 提供商选择 */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI 提供商</Label>
            <select
              id="provider"
              value={currentProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {AI_PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {providerInfo && (
              <p className="text-xs text-muted-foreground mt-1">
                {providerInfo.description}
              </p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key {providerInfo?.label}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={localConfig.apiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
              placeholder="输入你的 API Key..."
            />
            <p className="text-xs text-muted-foreground">
              你的 API Key 将安全地存储在浏览器本地，不会发送到任何第三方服务器。
            </p>
          </div>

          {/* API Base URL - 仅 OpenAI 显示 */}
          {currentProvider === 'openai' && (
            <div className="space-y-2">
              <Label htmlFor="baseURL">API 端点</Label>
              <Input
                id="baseURL"
                type="url"
                value={localConfig.baseURL}
                onChange={(e) => setLocalConfig({ ...localConfig, baseURL: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-xs text-muted-foreground">
                OpenAI API 的基础 URL。如使用兼容服务（如 Azure OpenAI），可修改此项。
              </p>
            </div>
          )}

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">
              {currentProvider === 'openai' ? '模型名称' : 'NIM 模型 ID'}
            </Label>
            <Input
              id="model"
              type="text"
              value={localConfig.model}
              onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
              placeholder={
                currentProvider === 'openai'
                  ? 'gpt-4、gpt-4o-mini 或其他自定义模型'
                  : 'meta/llama-4-maverick-17b-128e-instruct 或其他模型'
              }
            />
            <p className="text-xs text-muted-foreground">
              {currentProvider === 'openai'
                ? '支持任何兼容 OpenAI API 格式的模型。留空使用默认模型。'
                : 'NVIDIA NIM 支持的模型。可在 https://build.nvidia.com/ 查看可用模型。'
              }
            </p>
          </div>

          {/* Test Connection */}
          <div className="space-y-2">
            <Button
              onClick={handleTestConnection}
              disabled={!localConfig.apiKey || testing}
              variant="outline"
              className="w-full"
            >
              {testing ? '测试中...' : '测试连接'}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                <AlertTitle>
                  {testResult.success ? '✓ 连接成功' : '✗ 连接失败'}
                </AlertTitle>
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={testing} className="flex-1">
              {testing ? '保存并测试中...' : '保存并测试'}
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="outline" className="flex-1">
                取消
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">隐私说明</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            GameWorder 是一个纯前端应用，你的 API Key 和所有对话内容仅存储在浏览器的
            localStorage 中，不会发送到除 AI 服务端点以外的任何服务器。
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            支持 OpenAI 和 NVIDIA NIM 两种 AI 提供商。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
