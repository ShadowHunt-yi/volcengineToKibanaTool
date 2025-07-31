<template>
  <div class="app-status-indicator" :class="statusClass">
    <div class="indicator-icon">
      <div v-if="isLoading" class="loading-spinner"></div>
      <div v-else-if="hasError" class="error-icon">⚠️</div>
      <div v-else-if="hasValidApp" class="success-icon">✅</div>
      <div v-else class="unknown-icon">❓</div>
    </div>
    
    <div class="indicator-content">
      <div class="app-name">
        {{ displayAppName }}
      </div>
      <div class="status-text">
        {{ statusText }}
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
    
    <div class="indicator-actions">
      <button @click="refresh" class="refresh-btn" :disabled="isLoading">
        🔄
      </button>
      <button @click="$emit('close')" class="close-btn">
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppInfo } from '@/types'

interface Props {
  appInfo: AppInfo | null
  isLoading: boolean
  error: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  refresh: []
}>()

// 计算属性
const hasValidApp = computed(() => 
  props.appInfo && props.appInfo.name && props.appInfo.name.trim() !== ''
)

const hasError = computed(() => !!props.error)

const displayAppName = computed(() => {
  if (props.isLoading) return '检测中...'
  if (hasValidApp.value) return props.appInfo!.name
  return '未检测到应用'
})

const statusText = computed(() => {
  if (props.isLoading) return '正在检测应用信息'
  if (hasError.value) return '检测失败'
  if (hasValidApp.value) return `索引类型: ${props.appInfo!.indexType || '未知'}`
  return '请刷新或检查页面'
})

const statusClass = computed(() => ({
  'status-loading': props.isLoading,
  'status-error': hasError.value,
  'status-success': hasValidApp.value && !hasError.value,
  'status-unknown': !hasValidApp.value && !hasError.value && !props.isLoading
}))

// 方法
const refresh = () => {
  emit('refresh')
}
</script>

<style scoped>
.app-status-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  z-index: 9999;
  border-left: 4px solid #ccc;
  transition: all 0.3s ease;
}

.status-loading {
  border-left-color: #1890ff;
}

.status-success {
  border-left-color: #52c41a;
}

.status-error {
  border-left-color: #ff4d4f;
}

.status-unknown {
  border-left-color: #faad14;
}

.indicator-icon {
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f0f0f0;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.indicator-content {
  flex: 1;
}

.app-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.status-text {
  font-size: 12px;
  color: #666;
}

.error-message {
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 4px;
}

.indicator-actions {
  display: flex;
  gap: 4px;
}

.refresh-btn, .close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background-color 0.2s;
}

.refresh-btn:hover, .close-btn:hover {
  background: #f0f0f0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn:disabled:hover {
  background: transparent;
}
</style> 