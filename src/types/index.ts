// 应用信息接口
export interface AppInfo {
  name: string
  indexType: string
  detectedAt: string
}

// 字段映射接口
export interface FieldMapping {
  sessionId: string
  userId: string | null
}

// 可用索引接口
export interface AvailableIndex {
  key: string
  id: string
  name: string
  description: string
  displayText: string
  fieldMapping: FieldMapping
}

// 会话信息接口
export interface SessionInfo {
  sessionId: string
  userId: string
  time?: string
}

// Chrome扩展API相关类型扩展
declare global {
  interface Window {
    Tool517Config?: any
    tool517DebugApp?: () => void
    tool517RefreshApp?: () => void
    tool517CheckFunctions?: () => void
    tool517FullTest?: () => void
    tool517GetAppInfo?: () => AppInfo | null
  }
} 