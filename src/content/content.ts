// 517工具 - 内容脚本 (Vue TypeScript 版本)
import type { SessionInfo, AppInfo } from '@/types'

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
  
  // 会话信息提取函数（支持两种调用方式）
  function extractSessionInfo(element: Element, specItems?: Element): SessionInfo | null {
    try {
      // 如果提供了specItems，从specItems中提取
      const targetElement = specItems || element
      const text = targetElement.textContent || ''
      
      // 查找session_id
      const sessionMatch = text.match(/session[_\s]*id[:\s]*([a-zA-Z0-9\-_]+)/i)
      const sessionId = sessionMatch ? sessionMatch[1] : ''
      
      // 查找user_id  
      const userMatch = text.match(/user[_\s]*id[:\s]*([a-zA-Z0-9\-_]+)/i)
      const userId = userMatch ? userMatch[1] : ''
      
      if (sessionId && userId) {
        return { sessionId, userId }
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

    // 使用原版本的特定选择器来定位正确位置
    const detailHeaderRoot = target.querySelector('.DetailHeader__DetailHeaderRoot-fMWUme.bzFdck') ||
                           document.querySelector('.DetailHeader__DetailHeaderRoot-fMWUme.bzFdck')
    const defaultItems = target.querySelector('.DetailItems__Root-frzUaJ.jYzHps.default-items') ||
                        document.querySelector('.DetailItems__Root-frzUaJ.jYzHps.default-items')
    const specItems = target.querySelector('.DetailItems__Root-frzUaJ.jYzHps.spec-items') ||
                     document.querySelector('.DetailItems__Root-frzUaJ.jYzHps.spec-items')
    
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
    if (document.querySelector('.tool517-jump-btn')) return
    
    const sessionInfo = extractSessionInfo(detailsPanel, specItems)
    
    if (sessionInfo && sessionInfo.sessionId) {
      const button = document.createElement('button')
      button.className = 'arco-btn arco-btn-secondary arco-btn-size-default arco-btn-shape-square tool517-jump-btn'
      button.innerHTML = '<span>跳转到后端日志</span>'
      button.style.marginRight = '12px'
      
      button.onclick = async () => {
        await createIndexSelectionModal(sessionInfo)
      }
      
      const targetPanel = specItems || detailsPanel
      targetPanel.appendChild(button)
      console.log('517工具 - 已在正确位置创建跳转按钮')
    }
  }



  // 创建模态框
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

    // 创建模态框
    const modal = document.createElement('div')
    modal.className = 'tool517-modal'
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          border-radius: 8px;
          padding: 24px;
          min-width: 400px;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        ">
          <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">跳转到后端日志</h3>
          
          <div style="margin-bottom: 16px;">
            <div style="color: #666; font-size: 14px; margin-bottom: 8px;">会话信息:</div>
            <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 13px;">
              • session_id: <strong>${sessionInfo.sessionId}</strong><br>
              • user_id: <strong>${sessionInfo.userId}</strong><br>
              • 当前应用: <strong>${currentAppInfo?.name || '未检测到'}</strong>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; color: #666; font-size: 14px; margin-bottom: 8px;">选择索引:</label>
            <select id="indexSelect" style="
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            ">
              <option value="hotel">Hotel索引 (clyh-hotel-*)</option>
              <option value="jp">JP索引 (clyh-jp-*)</option>
              <option value="middle" selected>Middle索引 (clyh-middle-*)</option>
              <option value="train">Train索引 (clyh-train-*)</option>
              <option value="gateway">Gateway索引 (gateway-*)</option>
              <option value="nginx">Nginx索引 (nginx*)</option>
            </select>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelBtn" style="
              padding: 8px 16px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">取消</button>
            <button id="jumpBtn" style="
              padding: 8px 16px;
              border: none;
              background: #1890ff;
              color: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">跳转</button>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // 设置默认索引
    const select = modal.querySelector('#indexSelect') as HTMLSelectElement
    if (currentAppInfo?.name) {
      const appName = currentAppInfo.name
      if (/酒店|hotel/i.test(appName)) {
        select.value = 'hotel'
      } else if (/机票|flight|jp/i.test(appName)) {
        select.value = 'jp'
      } else if (/火车|train/i.test(appName)) {
        select.value = 'train'
      }
    }
    
    // 绑定事件
    const cancelBtn = modal.querySelector('#cancelBtn')
    const jumpBtn = modal.querySelector('#jumpBtn')
    
    const closeModal = () => modal.remove()
    
    cancelBtn?.addEventListener('click', closeModal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })
    
    jumpBtn?.addEventListener('click', () => {
      const selectedIndex = select.value
      const url = generateKibanaUrl(sessionInfo, selectedIndex)
      window.open(url, '_blank')
      closeModal()
    })
  }

  // 生成Kibana URL
  function generateKibanaUrl(sessionInfo: SessionInfo, indexKey: string): string {
    const indexIds: Record<string, string> = {
      hotel: "12f35f00-04e7-11ee-8cc6-c323e0969251",
      jp: "4be5d210-a8e3-11ef-8767-8dbabe23815c",
      middle: "00db24f0-0f56-11ee-8720-5bf2036a9e1a",
      train: "68deb330-aab2-11ee-9729-87586cd9b207",
      gateway: "acb91290-eba6-11ea-9f34-0d8763467285",
      nginx: "4d2fda50-df0e-11eb-bea5-cb68c938a0cc"
    }

    const indexId = indexIds[indexKey] || indexIds.middle
    const baseUrl = 'https://pallognew.517la.com/s/517na/app/kibana#/discover'
    const filters = [
      `origin:"${sessionInfo.sessionId}"`,
      `staffID:"${sessionInfo.userId}"`
    ]
    
    const query = encodeURIComponent(filters.join(' AND '))
    return `${baseUrl}?_g=(time:(from:'now-4h',to:'now'))&_a=(index:'${indexId}',query:(query_string:(query:'${query}')))`
  }

  // DOM监听器
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
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
    } else {
      setTimeout(startDOMObserver, 100)
    }
  }

  // 请求应用信息
  function requestAppInfo() {
    console.log('517工具 - Content Script请求应用信息')
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
      console.log('517工具 - 已获取到应用信息，停止定期请求:', appInfo.name)
      clearInterval(appInfoInterval)
    } else {
      console.log('517工具 - 尚未获取到应用信息，继续请求')
      requestAppInfo()
    }
  }, 5000)

  // 10次尝试后停止
  setTimeout(() => {
    clearInterval(appInfoInterval)
    console.log('517工具 - 停止定期请求应用信息')
  }, 50000)

  console.log('517工具 - Content Script (Vue TypeScript版) 已加载')
} 