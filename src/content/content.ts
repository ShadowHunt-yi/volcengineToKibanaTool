// 517工具 - 内容脚本 (Vue TypeScript 版本)
import type { SessionInfo, AppInfo } from '@/types'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import IndexSelectModal from '@/components/IndexSelectModal.vue'

// 检查是否在目标网站
if (window.location.hostname === "console.volcengine.com") {
  
  // 注入配置文件
  const configScript = document.createElement('script')
  configScript.src = chrome.runtime.getURL('src/config.js')
  configScript.onload = function() { (this as HTMLElement).remove() }
  ;(document.head || document.documentElement).appendChild(configScript)
  
  // 注入功能脚本
  const injectScript = document.createElement('script')
  injectScript.src = chrome.runtime.getURL('src/content/inject.js')
  injectScript.onload = function() { (this as HTMLElement).remove() }
  ;(document.head || document.documentElement).appendChild(injectScript)
  
  // 切换到JSON标签页并提取trackId
  async function switchToJsonTabAndExtractTrackId(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        console.log('517工具 - 开始查找JSON标签页')
        
        // 查找JSON标签页文本元素
        const tabTexts = document.querySelectorAll('.arco-tabs-header-title-text')
        console.log('517工具 - 找到标签页文本元素数量:', tabTexts.length)
        
        let jsonTabText: HTMLElement | null = null
        let jsonTabHeader: HTMLElement | null = null
        
        for (const text of tabTexts) {
          const textContent = text.textContent?.trim()
          console.log('517工具 - 检查标签页文本:', textContent)
          
          if (textContent === 'JSON') {
            jsonTabText = text as HTMLElement
            // 获取父元素（标签页容器）
            jsonTabHeader = text.closest('.arco-tabs-header-title') as HTMLElement
            console.log('517工具 - 找到JSON标签页，父元素:', jsonTabHeader)
            break
          }
        }
        
        if (!jsonTabText || !jsonTabHeader) {
          console.log('517工具 - 未找到JSON标签页')
          resolve(null)
          return
        }
        
        // 检查是否已经选中
        const isSelected = jsonTabHeader.getAttribute('aria-selected') === 'true'
        const hasActiveClass = jsonTabHeader.classList.contains('arco-tabs-header-title-active')
        console.log('517工具 - JSON标签页状态:', { 
          ariaSelected: isSelected, 
          hasActiveClass: hasActiveClass 
        })
        
        // 无论是否已选中，都点击一次确保内容加载
        console.log('517工具 - 点击JSON标签页确保内容加载')
        jsonTabText.click()
        console.log('517工具 - 已点击JSON标签页，等待DOM更新...')
        
        // 等待更长时间确保DOM完全渲染
        setTimeout(() => {
          console.log('517工具 - DOM更新完成，开始提取trackId')
          const trackId = extractTrackIdFromJson()
          console.log('517工具 - 提取结果:', trackId)
          resolve(trackId)
        }, 800)
      } catch (e) {
        console.log('517工具 - 切换JSON标签页失败:', e)
        resolve(null)
      }
    })
  }
  
  // 从JSON内容中提取trackId
  function extractTrackIdFromJson(): string | null {
    try {
      console.log('517工具 - 开始从JSON提取trackId')
      
      // 尝试多种方式查找JSON内容区域
      let jsonDiv = document.querySelector('.json')
      console.log('517工具 - 直接查找.json:', jsonDiv)
      
      if (!jsonDiv) {
        const tabsPane = document.querySelector('.arco-tabs-pane')
        console.log('517工具 - tabsPane:', tabsPane)
        
        if (tabsPane) {
          jsonDiv = tabsPane.querySelector('.json')
          console.log('517工具 - tabsPane中的.json:', jsonDiv)
        }
      }
      
      if (!jsonDiv) {
        // 尝试查找激活的面板
        const activePanel = document.querySelector('[role="tabpanel"][aria-hidden="false"]')
        console.log('517工具 - activePanel:', activePanel)
        if (activePanel) {
          jsonDiv = activePanel.querySelector('.json')
          console.log('517工具 - activePanel中的.json:', jsonDiv)
        }
      }
      
      if (jsonDiv) {
        const variableRows = jsonDiv.querySelectorAll('.variable-row')
        console.log('517工具 - variable-row数量:', variableRows.length)
        
        for (const row of variableRows) {
          const objectKey = row.querySelector('.object-key')
          const keyText = objectKey?.textContent?.trim()
          
          if (objectKey && keyText?.includes('517trackid')) {
            console.log('517工具 - 找到517trackid，key文本:', keyText)
            
            const stringValue = row.querySelector('.string-value')
            console.log('517工具 - stringValue元素:', stringValue)
            
            if (stringValue) {
              const rawText = stringValue.textContent?.trim()
              console.log('517工具 - 原始文本:', rawText)
              
              const trackId = rawText?.replace(/^"|"$/g, '')
              console.log('517工具 - 清理后的trackId:', trackId)
              
              if (trackId) {
                console.log('517工具 - 成功提取到trackId:', trackId)
                return trackId
              }
            }
          }
        }
        
        console.log('517工具 - 未找到517trackid字段')
      } else {
        console.log('517工具 - 所有方式都未找到.json元素')
      }
    } catch (e) {
      console.log('517工具 - 提取trackId异常:', e)
    }
    
    return null
  }

  // 从HTTP请求URL中提取API接口名
  function extractApiPathFromUrl(url: string): string | null {
    try {
      // 从URL中提取最后一个路径段作为API接口名
      // 例如: hotelgateaway.517la.com/h5/HOTELSTANDARDBUSSINESSSERVICE/api/queryStandardInfo
      // 提取: queryStandardInfo
      const urlParts = url.split('/')
      const lastSegment = urlParts[urlParts.length - 1]
      
      // 移除可能的查询参数
      const apiPath = lastSegment.split('?')[0]
      
      // 验证提取的接口名是否合法(至少2个字符)
      if (apiPath && apiPath.length >= 2) {
        return apiPath
      }
    } catch (error) {
      console.error('517工具 - 提取API路径失败:', error)
    }
    return null
  }

  // 会话信息提取函数（参照非Vue版本的DOM结构提取方式，包含时间提取）
  function extractSessionInfo(element: Element, specItems?: Element): SessionInfo | null {
    try {
      const info: { sessionId: string, userId: string, time?: string, trackId?: string, isHttpRequest?: boolean, apiPath?: string } = { 
        sessionId: '', 
        userId: '' 
      }
      
      // 检查是否是HTTP请求（通过查找 key 为 HTTP 的元素）
      const keyElement = document.querySelector('[class*="DetailHeader__LabelValueTag"] .key')
      if (keyElement && keyElement.textContent?.trim() === 'HTTP') {
        info.isHttpRequest = true
        // trackId将在点击按钮时切换到JSON标签页后提取
        
        // 尝试从event-brief中提取API路径
        const eventBrief = document.querySelector('.event-brief [class*="DetailHeader__LabelValueTag"] .value')
        if (eventBrief) {
          const urlText = eventBrief.textContent?.trim()
          if (urlText) {
            const apiPath = extractApiPathFromUrl(urlText)
            if (apiPath) {
              info.apiPath = apiPath
              console.log('517工具 - 提取到API路径:', apiPath)
            }
          }
        }
      }
      
      // 优先使用specItems进行结构化提取（参照非Vue版本）
      if (specItems) {
        const items = specItems.querySelectorAll('.item')
        items.forEach(item => {
          const label = item.querySelector('.label')?.textContent?.trim()
          const value = item.querySelector('.value')?.textContent?.trim()
          
          if (label === 'session_id' && value) info.sessionId = value
          if (label === 'user_id' && value) info.userId = value
        })
      }
      
      // 如果结构化提取失败，回退到正则表达式（改进版）
      if (!info.sessionId || !info.userId) {
        const targetElement = specItems || element
        const text = targetElement.textContent || ''
        
        // 改进的正则表达式，限制匹配长度，避免过度贪婪匹配
        if (!info.sessionId) {
          const sessionMatch = text.match(/session[_\s]*id[:\s]*([a-zA-Z0-9\-_]{8,64})/i)
          if (sessionMatch) info.sessionId = sessionMatch[1]
        }
        
        if (!info.userId) {
          const userMatch = text.match(/user[_\s]*id[:\s]*([a-zA-Z0-9\-_]{8,64})/i)
          if (userMatch) info.userId = userMatch[1]
        }
      }
      
      // 获取时间信息 - 多种方式尝试（完全按照非Vue版本）
      let timeValue: string | null = null
      
      // 方式1: 从SESSION标签获取
      const sessionTag = document.querySelector('.DetailHeader__LabelValueTag-cTgEKZ.gZzsWB.session .value')
      if (sessionTag) {
        timeValue = sessionTag.textContent?.trim() || null
      }
      
      // 方式2: 从详情面板的第一个时间元素获取
      if (!timeValue && element) {
        const timeElement = element.querySelector('.item .value')
        if (timeElement) {
          const potentialTime = timeElement.textContent?.trim()
          // 简单验证是否是时间格式 (包含日期和时间)
          if (potentialTime && (potentialTime.includes('-') || potentialTime.includes('/')) && potentialTime.includes(':')) {
            timeValue = potentialTime
          }
        }
      }
      
      // 方式3: 从default-items中查找时间
      if (!timeValue) {
        const defaultItems = document.querySelector('.DetailItems__Root-frzUaJ.jYzHps.default-items')
        if (defaultItems) {
          const timeItems = defaultItems.querySelectorAll('.item .value')
          for (const item of timeItems) {
            const text = item.textContent?.trim()
            if (text && (text.includes('-') || text.includes('/')) && text.includes(':')) {
              timeValue = text
              break
            }
          }
        }
      }
      
      info.time = timeValue || undefined
      
      if (info.sessionId && info.userId) {
        const result: SessionInfo = { 
          sessionId: info.sessionId, 
          userId: info.userId, 
          time: info.time
        }
        
        console.log('517工具 - 提取到的info信息:', info)
        
        // 如果是HTTP请求，设置标记
        if (info.isHttpRequest) {
          result.isHttpRequest = true
          // 如果已经有trackId，也添加进去
          if (info.trackId) {
            result.trackId = info.trackId
          }
          // 如果提取到apiPath，也添加进去
          if (info.apiPath) {
            result.apiPath = info.apiPath
          }
        }
        
        console.log('517工具 - 提取到的会话信息:', result)
        return result
      }
    } catch (error) {
      console.error('517工具 - 提取会话信息出错:', error)
    }
    
    return null
  }

  // 从页面上下文读取应用信息
  function getAppInfoFromPageContext(): AppInfo | null {
    const appInfoElement = document.getElementById('tool517-app-info')
    if (appInfoElement && appInfoElement.textContent) {
      try {
        return JSON.parse(appInfoElement.textContent)
      } catch (e) {
        console.error('517工具 - 解析应用信息失败:', e)
      }
    }
    return null
  }

  // 检查会话详情
  function checkForSessionDetails(target: Element | Document = document) {
    if (!target || typeof target.querySelector !== 'function') return

    // 使用更灵活的选择器来定位正确位置（支持类名变化）
    // 查找以 DetailHeader__DetailHeaderRoot 开头的元素
    let detailHeaderRoot: Element | null = null
    const allElements = (target === document ? document : target).querySelectorAll('[class*="DetailHeader__DetailHeaderRoot"]')
    if (allElements.length > 0) {
      detailHeaderRoot = allElements[0]
    }
    if (!detailHeaderRoot) {
      detailHeaderRoot = document.querySelector('[class*="DetailHeader__DetailHeaderRoot"]')
    }
    
    // 查找以 DetailItems__Root 开头且包含 default-items 的元素
    const defaultItems = target.querySelector('[class*="DetailItems__Root"].default-items') ||
                        document.querySelector('[class*="DetailItems__Root"].default-items')
    
    // 查找以 DetailItems__Root 开头且包含 spec-items 的元素
    const specItems = target.querySelector('[class*="DetailItems__Root"].spec-items') ||
                     document.querySelector('[class*="DetailItems__Root"].spec-items')
    
    if ((detailHeaderRoot || defaultItems) && specItems) {
      const panelElement = detailHeaderRoot || defaultItems
      if (panelElement) {
        addLogJumpButton(panelElement, specItems)
      }
    }
  }

  // 添加跳转日志按钮（使用原版本的精确逻辑）
  function addLogJumpButton(detailsPanel: Element, specItems: Element) {
    // 防止重复添加按钮
    const existingButton = document.querySelector('.tool517-jump-btn')
    if (existingButton) return
    
    const sessionInfo = extractSessionInfo(detailsPanel, specItems)
    
    if (sessionInfo && sessionInfo.sessionId) {
      const button = document.createElement('button')
      button.className = 'arco-btn arco-btn-secondary arco-btn-size-default arco-btn-shape-square tool517-jump-btn'
      button.innerHTML = '<span>跳转到后端日志</span>'
      button.style.marginRight = '12px'
      
      button.onclick = async () => {
        console.log('517工具 - 按钮被点击，sessionInfo:', sessionInfo)
        
        // 如果是HTTP请求，先切换到JSON标签页并提取trackId
        if (sessionInfo.isHttpRequest) {
          console.log('517工具 - 检测到HTTP请求，准备切换JSON标签页')
          const trackId = await switchToJsonTabAndExtractTrackId()
          console.log('517工具 - 切换完成，trackId:', trackId)
          if (trackId) {
            sessionInfo.trackId = trackId
            console.log('517工具 - trackId已更新到sessionInfo')
          }
        } else {
          console.log('517工具 - 非HTTP请求，跳过trackId提取')
        }
        
        await createIndexSelectionModal(sessionInfo)
      }
      
      // 尝试多个可能的插入位置
      let inserted = false
      
      // 方式1: 尝试插入到 spec-items
      if (specItems && !inserted) {
        try {
          specItems.appendChild(button)
          inserted = true
          console.log('517工具 - 按钮已插入到 spec-items')
        } catch (e) {
          console.log('517工具 - 插入spec-items失败:', e)
        }
      }
      
      // 方式2: 尝试插入到 detailsPanel
      if (!inserted && detailsPanel) {
        try {
          detailsPanel.appendChild(button)
          inserted = true
          console.log('517工具 - 按钮已插入到 detailsPanel')
        } catch (e) {
          console.log('517工具 - 插入detailsPanel失败:', e)
        }
      }
      
      // 方式3: 尝试查找并插入到按钮容器（支持类名变化）
      if (!inserted) {
        const buttonContainer = document.querySelector('[class*="DetailHeader__ButtonGroup"], .detail-header-button-group')
        if (buttonContainer) {
          try {
            buttonContainer.appendChild(button)
            inserted = true
            console.log('517工具 - 按钮已插入到按钮容器')
          } catch (e) {
            console.log('517工具 - 插入按钮容器失败:', e)
          }
        }
      }
      
      if (!inserted) {
        console.error('517工具 - 按钮插入失败，未找到合适位置')
      }
    }
  }



  // 创建索引选择模态框（使用Vue h函数和IndexSelectModal组件）
  async function createIndexSelectionModal(sessionInfo: SessionInfo) {
    console.log('517工具 - 创建模态框:', sessionInfo)
    
    // 刷新应用信息
    window.postMessage({ 
      type: 'TOOL517_REFRESH_APP',
      source: 'content-script'
    }, '*')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const currentAppInfo = getAppInfoFromPageContext()
    
    // 移除已存在的模态框
    const existingModal = document.querySelector('.tool517-modal')
    if (existingModal) {
      existingModal.remove()
    }

    // 创建模态框容器
    const modalContainer = document.createElement('div')
    modalContainer.className = 'tool517-modal'
    modalContainer.id = 'tool517-modal-container'
    
    // 添加基础样式，确保模态框在最上层
    modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      pointer-events: auto;
    `
    
    document.body.appendChild(modalContainer)
    
    // 创建Pinia实例
    const pinia = createPinia()
    
    // 准备可用索引数据
    const availableIndexes = getAvailableIndexes()
    
    // 使用h函数创建Vue应用
    const app = createApp({
      render() {
        return h(IndexSelectModal, {
          visible: true,
          sessionInfo: sessionInfo,
          availableIndexes: availableIndexes,
          currentAppName: currentAppInfo?.name || '未检测到',
          defaultIndexKey: getDefaultIndexForApp(currentAppInfo?.name || ''),
          onClose: () => {
            console.log('517工具 - 关闭模态框')
            app.unmount()
            modalContainer.remove()
          },
          onJump: (url: string) => {
            console.log('517工具 - 跳转URL:', url)
            window.open(url, '_blank')
            app.unmount()
            modalContainer.remove()
          },
          onCopy: (text: string) => {
            console.log('517工具 - 复制文本')
            navigator.clipboard.writeText(text).then(() => {
              alert('已复制到剪贴板！')
              app.unmount()
              modalContainer.remove()
            }).catch(() => {
              prompt('请手动复制:', text)
            })
          }
        })
      }
    })
    
    // 使用Pinia
    app.use(pinia)
    
    // 挂载到容器
    app.mount(modalContainer)
  }
  
  // 获取可用索引（符合AvailableIndex接口）
  function getAvailableIndexes() {
    return [
      { 
        key: 'hotel', 
        id: '12f35f00-04e7-11ee-8cc6-c323e0969251', 
        name: 'Hotel索引', 
        description: 'clyh-hotel-*', 
        displayText: 'Hotel索引 (clyh-hotel-*)',
        fieldMapping: { sessionId: 'origin', userId: 'staffID', trackId: 'trackID' }
      },
      { 
        key: 'jp', 
        id: '4be5d210-a8e3-11ef-8767-8dbabe23815c', 
        name: 'JP索引', 
        description: 'clyh-jp-*', 
        displayText: 'JP索引 (clyh-jp-*)',
        fieldMapping: { sessionId: 'origin', userId: 'staffID', trackId: 'trackID' }
      },
      { 
        key: 'middle', 
        id: '00db24f0-0f56-11ee-8720-5bf2036a9e1a', 
        name: 'Middle索引', 
        description: 'clyh-middle-*', 
        displayText: 'Middle索引 (clyh-middle-*)',
        fieldMapping: { sessionId: 'origin', userId: 'staffID', trackId: 'trackID' }
      },
      { 
        key: 'train', 
        id: '68deb330-aab2-11ee-9729-87586cd9b207', 
        name: 'Train索引', 
        description: 'clyh-train-*', 
        displayText: 'Train索引 (clyh-train-*)',
        fieldMapping: { sessionId: 'origin', userId: 'staffID', trackId: 'trackID' }
      },
      { 
        key: 'gateway', 
        id: 'acb91290-eba6-11ea-9f34-0d8763467285', 
        name: 'Gateway索引', 
        description: 'gateway-*', 
        displayText: 'Gateway索引 (gateway-*)',
        fieldMapping: { sessionId: 'RequestHeader.la517-session-id', userId: null, trackId: 'RequestHeader.517trackID' }
      },
      { 
        key: 'apiservice', 
        id: 'acb91290-eba6-11ea-9f34-0d8763467285', 
        name: 'APIService索引', 
        description: 'gateway-*', 
        displayText: 'Gateway索引 (gateway-*)',
        fieldMapping: { InPath: 'InPath',  TimePeriod: 'TimePeriod' }
      },
      { 
        key: 'nginx', 
        id: '4d2fda50-df0e-11eb-bea5-cb68c938a0cc', 
        name: 'Nginx索引', 
        description: 'nginx*', 
        displayText: 'Nginx索引 (nginx*)',
        fieldMapping: { sessionId: 'origin', userId: 'staffID', trackId: 'trackID' }
      },
      { 
        key: 'clyh', 
        id: '11a318b0-fd26-11ee-b9c9-1770fb731a66', 
        name: 'CLYH索引', 
        description: 'clyh-*', 
        displayText: 'CLYH索引 (clyh-*)',
        fieldMapping: { sessionId: 'origin', userId: 'staffID', trackId: 'trackID' }
      }
    ]
  }
  
  // 根据应用名称获取默认索引
  function getDefaultIndexForApp(appName: string): string {
    if (/酒店|hotel/i.test(appName)) {
      return 'hotel'
    } else if (/机票|flight|jp/i.test(appName)) {
      return 'jp'
    } else if (/火车|train/i.test(appName)) {
      return 'train'
    }
    return 'middle'
  }
  
  // DOM监听器
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkForSessionDetails(node as Element)
          }
        })
      }
    })
  })

  // 监听应用信息更新
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'TOOL517_APP_INFO_RESPONSE') {
      console.log('517工具 - Content Script收到应用信息更新:', event.data.appInfo)
    }
  })

  // 启动DOM观察
  function startDOMObserver() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
      checkForSessionDetails(document.body)
      console.log('517工具 - DOM观察器已启动')
    } else {
      setTimeout(startDOMObserver, 100)
    }
  }

  // 请求应用信息
  function requestAppInfo() {
    window.postMessage({
      type: 'TOOL517_GET_APP_INFO'
    }, '*')
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startDOMObserver()
      // 页面加载完成后请求应用信息
      setTimeout(requestAppInfo, 3000)
    })
  } else {
    startDOMObserver()
    // 立即请求应用信息
    setTimeout(requestAppInfo, 3000)
  }

  // 定期请求应用信息，直到获取到
  const appInfoInterval = setInterval(() => {
    const appInfo = getAppInfoFromPageContext()
    if (appInfo && appInfo.name) {
      console.log('517工具 - 已获取应用信息:', appInfo.name)
      clearInterval(appInfoInterval)
    } else {
      requestAppInfo()
    }
  }, 5000)

  // 10次尝试后停止
  setTimeout(() => {
    clearInterval(appInfoInterval)
  }, 50000)

  console.log('517工具 - Content Script (Vue TypeScript版) 已加载')
} 