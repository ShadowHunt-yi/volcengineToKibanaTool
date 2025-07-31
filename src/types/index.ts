// 应用信息接口
export interface AppInfo {
  name: string
  indexType: string
  detectedAt: string
}

// 索引配置接口
export interface IndexConfig {
  id: string
  name: string
  description: string
}

// 可用索引接口
export interface AvailableIndex {
  key: string
  id: string
  name: string
  description: string
  displayText: string
}

// 会话信息接口
export interface SessionInfo {
  sessionId: string
  userId: string
  time?: string
}

// 应用名称模式接口
export interface AppNamePattern {
  pattern: RegExp
  index: string
}

// 时间配置接口
export interface TimeConfig {
  sessionTimeRange: number
  defaultTimeRange: string
}

// Kibana配置接口
export interface KibanaConfig {
  baseUrl: string
  fieldMapping: {
    sessionId: string
    userId: string
  }
}

// 工具配置接口
export interface Tool517Config {
  indexes: Record<string, IndexConfig>
  appDefaultIndexes: Record<string, string> & {
    urlPatterns: Record<string, string>
  }
  timeConfig: TimeConfig
  kibana: KibanaConfig
  getCurrentDefaultIndex(): string
  getApplicationName(retryCount?: number): string | null
  getIndexByApplicationName(appName: string): string | null
  getIndex(indexKey: string): IndexConfig
  getAvailableIndexes(): AvailableIndex[]
  validateConfig(): { isValid: boolean; issues: string[] }
}

// 消息类型
export interface MessageData {
  type: string
  source?: string
  appInfo?: AppInfo
}

// Chrome扩展API相关类型扩展
declare global {
  interface Window {
    Tool517Config?: Tool517Config
    tool517DebugApp?: () => void
    tool517RefreshApp?: () => void
    tool517CheckFunctions?: () => void
    tool517FullTest?: () => void
    tool517GetAppInfo?: () => AppInfo | null
  }
} 