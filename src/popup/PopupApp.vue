<template>
  <div class="popup-container">
    <div class="header">
      <div class="logo">🔧</div>
      <div class="title">517工具Vue版</div>
      <div class="version">v2.0.0</div>
    </div>
    
    <div class="content">
      <div class="current-tab">
        <div class="label">当前标签页:</div>
        <div class="tab-info">{{ currentTabInfo }}</div>
      </div>
      
      <div class="status-section">
        <div class="label">工具状态:</div>
        <div class="status" :class="statusClass">
          <div class="status-icon">{{ statusIcon }}</div>
          <div class="status-text">{{ statusText }}</div>
        </div>
      </div>
      
      <div class="actions">
        <button 
          @click="openTargetSite" 
          class="action-btn primary"
          :disabled="!canOpenSite"
        >
          打开火山引擎控制台
        </button>
        
        <button 
          @click="refreshCurrentTab" 
          class="action-btn secondary"
          :disabled="!isOnTargetSite"
        >
          刷新当前页面
        </button>
        
        <button 
          @click="toggleDebugMode" 
          class="action-btn"
          :class="{ active: debugMode }"
        >
          {{ debugMode ? '关闭' : '开启' }}调试模式
        </button>
        
        <button 
          @click="openJsonFormatter" 
          class="action-btn tool"
        >
          📄 JSON格式化器
        </button>
        
        <button 
          @click="openControlPanel" 
          class="action-btn info"
        >
          ⚙️ 打开控制面板
        </button>
      </div>
      
      <div class="debug-info" v-if="debugMode">
        <div class="label">调试信息:</div>
        <div class="debug-content">
          <div>URL: {{ currentUrl }}</div>
          <div>扩展状态: {{ extensionStatus }}</div>
          <div>Vue版本: {{ vueVersion }}</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="links">
        <a href="#" @click="openHelp">使用帮助</a>
        <a href="#" @click="openSettings">设置</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 响应式数据
const currentUrl = ref('')
const debugMode = ref(false)
const extensionStatus = ref('正常')
const vueVersion = ref('3.4.0')

// 计算属性
const currentTabInfo = computed(() => {
  if (!currentUrl.value) return '获取中...'
  const url = new URL(currentUrl.value)
  return url.hostname
})

const isOnTargetSite = computed(() => 
  currentUrl.value.includes('console.volcengine.com')
)

const canOpenSite = computed(() => 
  !isOnTargetSite.value
)

const statusClass = computed(() => ({
  'status-active': isOnTargetSite.value,
  'status-inactive': !isOnTargetSite.value
}))

const statusIcon = computed(() => 
  isOnTargetSite.value ? '🟢' : '🔴'
)

const statusText = computed(() => 
  isOnTargetSite.value ? '已激活' : '未激活'
)

// 方法
const getCurrentTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      currentUrl.value = tab.url
    }
  } catch (error) {
    console.error('获取当前标签页失败:', error)
  }
}

const openTargetSite = async () => {
  try {
    await chrome.tabs.create({ 
      url: 'https://console.volcengine.com' 
    })
    window.close()
  } catch (error) {
    console.error('打开目标网站失败:', error)
  }
}

const refreshCurrentTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.tabs.reload(tab.id)
      window.close()
    }
  } catch (error) {
    console.error('刷新页面失败:', error)
  }
}

const toggleDebugMode = () => {
  debugMode.value = !debugMode.value
}

const openHelp = () => {
  chrome.tabs.create({ url: 'https://github.com/your-repo/help' })
}

const openSettings = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
}

const openJsonFormatter = () => {
  chrome.tabs.create({ 
    url: chrome.runtime.getURL('src/pages/JsonFormatter.html') 
  })
  window.close()
}

const openControlPanel = () => {
  chrome.tabs.create({ 
    url: chrome.runtime.getURL('src/popup/popup.html') 
  })
  window.close()
}

// 生命周期
onMounted(() => {
  getCurrentTab()
})
</script>

<style scoped>
.popup-container {
  width: 320px;
  background: #fff;
  font-size: 14px;
}

.header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.logo {
  font-size: 20px;
  margin-right: 8px;
}

.title {
  flex: 1;
  font-weight: 600;
  font-size: 16px;
}

.version {
  font-size: 12px;
  opacity: 0.8;
}

.content {
  padding: 16px;
}

.label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.current-tab {
  margin-bottom: 16px;
}

.tab-info {
  font-size: 13px;
  color: #333;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  word-break: break-all;
}

.status-section {
  margin-bottom: 16px;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.status-active {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.status-inactive {
  background: #fff2f0;
  border: 1px solid #ffccc7;
}

.status-text {
  font-size: 13px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #1890ff;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #40a9ff;
}

.action-btn.secondary {
  background: #f0f0f0;
  color: #333;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #d9d9d9;
}

.action-btn.active {
  background: #52c41a;
  color: white;
}

.action-btn.tool {
  background: #722ed1;
  color: white;
}

.action-btn.tool:hover:not(:disabled) {
  background: #9254de;
}

.action-btn.info {
  background: #13c2c2;
  color: white;
}

.action-btn.info:hover:not(:disabled) {
  background: #36cfc9;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.debug-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.debug-content {
  font-size: 12px;
  color: #666;
  background: #fafafa;
  padding: 8px;
  border-radius: 4px;
  line-height: 1.4;
}

.footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.links {
  display: flex;
  justify-content: space-between;
}

.links a {
  font-size: 12px;
  color: #1890ff;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style> 