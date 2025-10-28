// 517工具 - 注入脚本 (Vue TypeScript 版本)
import type { AppInfo } from '@/types'

(function() {
  'use strict'

  // 页面上下文中的应用缓存
  let pageContextAppCache: AppInfo | null = null
  let appCheckCount = 0
  const maxAppChecks = 10 // 增加检测次数

  // 执行应用检测
  function detectApplication(): { app: string; indexType: string } | null {
    const config = (window as any).Tool517Config
    if (config && config.getApplicationName) {
      const appName = config.getApplicationName()
      
      if (appName) {
        const indexType = config.getIndexByApplicationName(appName)
        console.log('517工具 - 检测到应用:', appName, '索引:', indexType)
        
        pageContextAppCache = {
          name: appName,
          indexType: indexType,
          detectedAt: new Date().toISOString()
        }
        
        updateAppInfoInDOM()
        return { app: appName, indexType: indexType }
      }
    }
    return null
  }

  // 更新DOM中的应用信息
  function updateAppInfoInDOM() {
    // 移除旧的应用信息元素
    const oldElement = document.getElementById('tool517-app-info')
    if (oldElement) {
      oldElement.remove()
    }
    
    // 创建新的应用信息元素
    if (pageContextAppCache) {
      const element = document.createElement('div')
      element.id = 'tool517-app-info'
      element.style.display = 'none'
      element.textContent = JSON.stringify(pageContextAppCache)
      document.body.appendChild(element)
    }
  }

  // 初始应用检查
  function performInitialAppCheck(): boolean {
    const result = detectApplication()
    return !!result
  }

  // 定期应用检查
  function startPeriodicAppCheck() {
    const checkInterval = setInterval(() => {
      appCheckCount++
      
      if (pageContextAppCache) {
        clearInterval(checkInterval)
        return
      }
      
      const result = detectApplication()
      if (result || appCheckCount >= maxAppChecks) {
        clearInterval(checkInterval)
      }
    }, 2000)
  }

  // 手动刷新应用信息
  ;(window as any).tool517RefreshApp = function() {
    pageContextAppCache = null
    const result = detectApplication()
    if (result) {
      updateAppInfoInDOM()
    }
  }

  // 获取当前应用信息（供外部调用）
  ;(window as any).tool517GetAppInfo = function() {
    return pageContextAppCache
  }

  // 检查工具函数状态
  ;(window as any).tool517CheckFunctions = function() {
    console.log('517工具 - 函数状态检查:')
    console.log('- tool517DebugApp:', typeof (window as any).tool517DebugApp)
    console.log('- tool517RefreshApp:', typeof (window as any).tool517RefreshApp)
    console.log('- tool517GetAppInfo:', typeof (window as any).tool517GetAppInfo)
    console.log('- Tool517Config:', typeof (window as any).Tool517Config)
    console.log('- 缓存的应用信息:', pageContextAppCache)
    
    const config = (window as any).Tool517Config
    if (config && config.getApplicationName) {
      const app = config.getApplicationName()
      console.log('- 当前检测到的应用:', app || '未检测到')
      
      if (app) {
        const indexType = config.getIndexByApplicationName(app)
        console.log('- 应用对应的索引类型:', indexType)
      }
    }
    
    // 检查DOM中的应用信息
    const domElement = document.getElementById('tool517-app-info')
    if (domElement) {
      console.log('- DOM中的应用信息:', domElement.textContent)
    } else {
      console.log('- DOM中没有应用信息元素')
    }
  }

  // 完整流程测试
  ;(window as any).tool517FullTest = function() {
    console.log('517工具 - === 完整流程测试 ===')
    
    // 1. 测试应用检测
    console.log('1. 测试应用检测...')
    const result = detectApplication()
    console.log('   检测结果:', result)
    
    // 2. 测试DOM更新
    console.log('2. 检查DOM元素...')
    const domElement = document.getElementById('tool517-app-info')
    if (domElement) {
      console.log('   DOM元素存在，内容:', domElement.textContent)
      try {
        const parsed = JSON.parse(domElement.textContent || '{}')
        console.log('   解析后的内容:', parsed)
      } catch (e) {
        console.log('   解析失败:', e)
      }
    } else {
      console.log('   DOM元素不存在')
    }
    
    // 3. 测试索引映射
    if (result && result.app) {
      console.log('3. 测试索引映射...')
      const config = (window as any).Tool517Config
      if (config) {
        const indexType = config.getIndexByApplicationName(result.app)
        console.log('   应用名称:', result.app)
        console.log('   映射的索引:', indexType)
        
        // 测试所有模式
        const patterns = [
          { pattern: /酒店|hotel/i, index: 'hotel' },
          { pattern: /机票|flight|jp/i, index: 'jp' },
          { pattern: /火车|train/i, index: 'train' }
        ]
        
        console.log('   模式匹配测试:')
        patterns.forEach(rule => {
          const matches = rule.pattern.test(result.app)
          console.log(`     ${rule.pattern} -> ${rule.index}: ${matches}`)
        })
      }
    }
    
    // 4. 测试配置读取
    console.log('4. 测试配置读取...')
    const config = (window as any).Tool517Config
    console.log('   Tool517Config存在:', !!config)
    console.log('   indexes配置存在:', !!(config && config.indexes))
    
    if (config && config.indexes) {
      const indexes = config.indexes
      console.log('   配置中的索引数量:', Object.keys(indexes).length)
      console.log('   索引列表:')
      Object.entries(indexes).forEach(([key, indexConfig]: [string, any]) => {
        console.log(`     ${key}: ${indexConfig.name} (${indexConfig.description})`)
      })
    }
    
    // 5. 测试getAvailableIndexes方法
    console.log('5. 测试getAvailableIndexes方法...')
    if (config && typeof config.getAvailableIndexes === 'function') {
      try {
        const availableIndexes = config.getAvailableIndexes()
        console.log('   getAvailableIndexes返回数量:', availableIndexes.length)
        console.log('   返回的索引:')
        availableIndexes.forEach((idx: any) => {
          console.log(`     ${idx.key}: ${idx.displayText}`)
        })
      } catch (e) {
        console.log('   getAvailableIndexes调用失败:', e)
      }
    } else {
      console.log('   getAvailableIndexes方法不存在')
    }
  }

  // 监听来自内容脚本的消息
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOOL517_GET_APP_INFO') {
      const appInfo = {
        name: (window as any).Tool517Config?.getApplicationName(),
        indexType: (window as any).Tool517Config?.getIndexByApplicationName(
          (window as any).Tool517Config?.getApplicationName()
        )
      }
      
      window.postMessage({
        type: 'TOOL517_APP_INFO_RESPONSE',
        appInfo: appInfo
      }, '*')
    }
    
    // 监听刷新应用请求
    if (event.data && event.data.type === 'TOOL517_REFRESH_APP' && event.data.source === 'content-script') {
      if (typeof (window as any).tool517RefreshApp === 'function') {
        ;(window as any).tool517RefreshApp()
      }
    }
  })

  // 启动应用检测 - 多重保障
  setTimeout(() => {
    if (!performInitialAppCheck()) {
      startPeriodicAppCheck()
    }
  }, 2000)

  // 额外的检测时机 - 页面完全加载后
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (!pageContextAppCache) {
          detectApplication()
        }
      }, 1000)
    })
  }

  // 页面完全加载后的检测
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!pageContextAppCache) {
        detectApplication()
      }
    }, 1000)
  })

  console.log('517工具 - 注入脚本已加载')
})() 