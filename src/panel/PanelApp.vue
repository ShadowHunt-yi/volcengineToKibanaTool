<template>
  <div class="panel-container">
    <div class="header">
      <div class="logo">🔧</div>
      <div class="title">517工具 - DevTools面板</div>
    </div>
    
    <div class="content">
      <div class="section">
        <h3>应用检测状态</h3>
        <div class="status-card">
          <div class="status-item">
            <span class="label">当前应用:</span>
            <span class="value">{{ currentApp || '未检测到' }}</span>
          </div>
          <div class="status-item">
            <span class="label">索引类型:</span>
            <span class="value">{{ indexType || '未知' }}</span>
          </div>
          <div class="status-item">
            <span class="label">检测状态:</span>
            <span class="value" :class="statusClass">{{ statusText }}</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h3>调试工具</h3>
        <div class="debug-tools">
          <button @click="debugApp" class="debug-btn">
            🔍 调试应用检测
          </button>
          <button @click="refreshApp" class="debug-btn">
            🔄 刷新应用信息
          </button>
          <button @click="fullTest" class="debug-btn">
            🧪 完整功能测试
          </button>
          <button @click="checkFunctions" class="debug-btn">
            ⚙️ 检查函数状态
          </button>
        </div>
      </div>
      
      <div class="section">
        <h3>日志输出</h3>
        <div class="log-container">
          <div v-for="(log, index) in logs" :key="index" class="log-item">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="no-logs">
            暂无日志信息
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 响应式数据
const currentApp = ref('')
const indexType = ref('')
const statusText = ref('未知')
const logs = ref<Array<{time: string, message: string}>>([])

// 计算属性
const statusClass = computed(() => ({
  'status-success': statusText.value === '正常',
  'status-error': statusText.value === '错误',
  'status-unknown': statusText.value === '未知'
}))

// 方法
const addLog = (message: string) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message: message
  })
  
  // 保持最多100条日志
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

const debugApp = () => {
  addLog('执行应用检测调试...')
  // 向content script发送调试命令
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'DEBUG_APP'})
    }
  })
}

const refreshApp = () => {
  addLog('刷新应用信息...')
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'REFRESH_APP'})
    }
  })
}

const fullTest = () => {
  addLog('执行完整功能测试...')
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'FULL_TEST'})
    }
  })
}

const checkFunctions = () => {
  addLog('检查函数状态...')
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'CHECK_FUNCTIONS'})
    }
  })
}

// 生命周期
onMounted(() => {
  addLog('DevTools面板已加载')
  
  // 监听来自content script的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'APP_INFO_UPDATE') {
      currentApp.value = message.appName || '未检测到'
      indexType.value = message.indexType || '未知'
      statusText.value = message.status || '未知'
      addLog(`应用信息更新: ${message.appName} -> ${message.indexType}`)
    }
    
    if (message.type === 'DEBUG_LOG') {
      addLog(message.message)
    }
  })
})
</script>

<style scoped>
.panel-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f0f2f5;
  border-bottom: 1px solid #d9d9d9;
}

.logo {
  font-size: 18px;
  margin-right: 8px;
}

.title {
  font-weight: 600;
  color: #333;
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.status-card {
  background: #f9f9f9;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
}

.status-success {
  color: #52c41a;
}

.status-error {
  color: #ff4d4f;
}

.status-unknown {
  color: #faad14;
}

.debug-tools {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.debug-btn {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.debug-btn:hover {
  background: #f0f2f5;
  border-color: #1890ff;
}

.log-container {
  background: #1e1e1e;
  border-radius: 4px;
  padding: 8px;
  height: 200px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
}

.log-item {
  display: block;
  margin-bottom: 4px;
  color: #e8e8e8;
  line-height: 1.4;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-message {
  color: #e8e8e8;
}

.no-logs {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 20px;
}
</style> 