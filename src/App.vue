<template>
  <div class="tool517-app">
    <!-- 索引选择模态框 -->
    <IndexSelectModal
      v-if="showModal"
      :visible="showModal"
      :session-info="currentSession"
      :available-indexes="availableIndexes"
      :current-app-name="currentAppName"
      :default-index-key="defaultIndexKey"
      @close="closeModal"
      @jump="handleJump"
      @copy="handleCopy"
    />
    
    <!-- 应用状态指示器 -->
    <AppStatusIndicator
      v-if="showStatusIndicator"
      :app-info="currentApp"
      :is-loading="isLoading"
      :error="error"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/appStore'
import IndexSelectModal from '@/components/IndexSelectModal.vue'
import AppStatusIndicator from '@/components/AppStatusIndicator.vue'
import type { SessionInfo } from '@/types'

// 使用store
const appStore = useAppStore()

// 响应式数据
const showModal = ref(false)
const showStatusIndicator = ref(false)
const currentSession = ref<SessionInfo | null>(null)

// 计算属性
const currentApp = computed(() => appStore.currentApp)
const currentAppName = computed(() => currentApp.value?.name || '未检测到')
const availableIndexes = computed(() => appStore.availableIndexes)
const defaultIndexKey = computed(() => appStore.defaultIndexKey)
const isLoading = computed(() => appStore.isLoading)
const error = computed(() => appStore.error)

// 方法
const openModal = (sessionInfo: SessionInfo) => {
  currentSession.value = sessionInfo
  showModal.value = true
  appStore.refreshAppInfo()
}

const closeModal = () => {
  showModal.value = false
  currentSession.value = null
}

const handleJump = (url: string) => {
  window.open(url, '_blank')
  closeModal()
}

const handleCopy = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    console.log('517工具 - URL已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 暴露方法给全局使用
const tool517VueApp = {
  openModal,
  closeModal,
  toggleStatusIndicator: () => {
    showStatusIndicator.value = !showStatusIndicator.value
  },
  refreshApp: () => {
    appStore.refreshAppInfo()
  }
}

// 挂载到window对象供content script调用
if (typeof window !== 'undefined') {
  ;(window as any).tool517VueApp = tool517VueApp
}

// 组件挂载时初始化
onMounted(() => {
  // 初始化应用信息
  appStore.refreshAppInfo()
  
  // 监听来自content script的消息
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'TOOL517_OPEN_MODAL' && event.data.sessionInfo) {
      openModal(event.data.sessionInfo)
    }
  })
  
  console.log('517工具 - Vue应用已初始化')
})
</script>

<style scoped>
.tool517-app {
  /* 基础样式 */
}
</style> 