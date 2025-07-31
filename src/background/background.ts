// 517工具 - 后台脚本 (Vue TypeScript 版本)

console.log('517工具 - Vue版后台脚本已加载')

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('517工具 - 扩展安装/更新:', details.reason)
  
  if (details.reason === 'install') {
    console.log('517工具 - 首次安装，执行初始化...')
    // 可以在这里执行一些初始化操作
  } else if (details.reason === 'update') {
    console.log('517工具 - 扩展更新，版本:', details.previousVersion)
  }
})

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('517工具 - 收到消息:', message, '来自:', sender.tab?.url)
  
  switch (message.type) {
    case 'GET_CONFIG':
      // 返回配置信息
      sendResponse({
        success: true,
        data: {
          version: '2.0.0',
          name: '517工具Vue版'
        }
      })
      break
      
    case 'LOG_EVENT':
      // 记录事件日志
      console.log('517工具 - 事件日志:', message.data)
      sendResponse({ success: true })
      break
      
    default:
      console.log('517工具 - 未知消息类型:', message.type)
      sendResponse({ success: false, error: '未知消息类型' })
  }
  
  return true // 保持消息通道打开
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('console.volcengine.com')) {
    console.log('517工具 - 目标页面加载完成:', tab.url)
    // 可以在这里执行一些页面加载完成后的操作
  }
})

// 处理扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  console.log('517工具 - 扩展图标被点击，当前标签页:', tab.url)
  
  // 打开JSON格式化器页面
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/pages/JsonFormatter.html'),
    active: true
  }).then(() => {
    console.log('517工具 - JSON格式化器页面已打开')
  }).catch(err => {
    console.error('517工具 - 打开JSON格式化器失败:', err)
  })
}) 