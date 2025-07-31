import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppInfo, SessionInfo, AvailableIndex } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 状态
  const currentApp = ref<AppInfo | null>(null)
  const currentSession = ref<SessionInfo | null>(null)
  const availableIndexes = ref<AvailableIndex[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const hasValidApp = computed(() => 
    currentApp.value && currentApp.value.name && currentApp.value.name.trim() !== ''
  )

  const defaultIndexKey = computed(() => {
    if (!hasValidApp.value) return 'middle'
    
    const appName = currentApp.value!.name
    if (/酒店|hotel/i.test(appName)) return 'hotel'
    if (/机票|flight|jp/i.test(appName)) return 'jp'
    if (/火车|train/i.test(appName)) return 'train'
    
    return 'middle'
  })

  const defaultIndex = computed(() => 
    availableIndexes.value.find((idx: AvailableIndex) => idx.key === defaultIndexKey.value)
  )

  // 动作
  const setCurrentApp = (app: AppInfo | null) => {
    currentApp.value = app
    error.value = null
  }

  const setCurrentSession = (session: SessionInfo | null) => {
    currentSession.value = session
  }

  const setAvailableIndexes = (indexes: AvailableIndex[]) => {
    availableIndexes.value = indexes
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const refreshAppInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      // 发送消息给content script请求应用信息
      if (typeof window !== 'undefined' && window.postMessage) {
        window.postMessage({ 
          type: 'TOOL517_REFRESH_APP',
          source: 'vue-app'
        }, '*')
      }

      // 等待应用信息更新
      await new Promise(resolve => setTimeout(resolve, 500))

      // 尝试从DOM读取应用信息
      const appInfoElement = document.getElementById('tool517-app-info')
      if (appInfoElement && appInfoElement.textContent) {
        try {
          const appInfo = JSON.parse(appInfoElement.textContent)
          setCurrentApp(appInfo)
        } catch (e) {
          setError('解析应用信息失败')
        }
      } else {
        setError('未找到应用信息')
      }
      
      // 更新可用索引
      updateAvailableIndexes()
    } catch (e) {
      setError('刷新应用信息失败')
    } finally {
      setLoading(false)
    }
  }

  const updateAvailableIndexes = () => {
    // 从全局配置获取索引
    const config = (window as any).Tool517Config
    if (config && typeof config.getAvailableIndexes === 'function') {
      try {
        const indexes = config.getAvailableIndexes()
        setAvailableIndexes(indexes)
      } catch (e) {
        // 使用默认索引配置
        setAvailableIndexes(getDefaultIndexes())
      }
    } else {
      setAvailableIndexes(getDefaultIndexes())
    }
  }

  const getDefaultIndexes = (): AvailableIndex[] => {
    return [
      { key: 'hotel', id: '12f35f00-04e7-11ee-8cc6-c323e0969251', name: 'Hotel索引', description: 'clyh-hotel-*', displayText: 'Hotel索引 (clyh-hotel-*)' },
      { key: 'jp', id: '4be5d210-a8e3-11ef-8767-8dbabe23815c', name: 'JP索引', description: 'clyh-jp-*', displayText: 'JP索引 (clyh-jp-*)' },
      { key: 'middle', id: '00db24f0-0f56-11ee-8720-5bf2036a9e1a', name: 'Middle索引', description: 'clyh-middle-*', displayText: 'Middle索引 (clyh-middle-*)' },
      { key: 'train', id: '68deb330-aab2-11ee-9729-87586cd9b207', name: 'Train索引', description: 'clyh-train-*', displayText: 'Train索引 (clyh-train-*)' },
      { key: 'gateway', id: 'acb91290-eba6-11ea-9f34-0d8763467285', name: 'Gateway索引', description: 'gateway-*', displayText: 'Gateway索引 (gateway-*)' },
      { key: 'nginx', id: '4d2fda50-df0e-11eb-bea5-cb68c938a0cc', name: 'Nginx索引', description: 'nginx*', displayText: 'Nginx索引 (nginx*)' },
      { key: 'clyh', id: '11a318b0-fd26-11ee-b9c9-1770fb731a66', name: 'CLYH索引', description: 'clyh-*', displayText: 'CLYH索引 (clyh-*)' }
    ]
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // 状态
    currentApp,
    currentSession,
    availableIndexes,
    isLoading,
    error,
    
    // 计算属性
    hasValidApp,
    defaultIndexKey,
    defaultIndex,
    
    // 动作
    setCurrentApp,
    setCurrentSession,
    setAvailableIndexes,
    setLoading,
    setError,
    refreshAppInfo,
    updateAvailableIndexes,
    clearError
  }
}) 