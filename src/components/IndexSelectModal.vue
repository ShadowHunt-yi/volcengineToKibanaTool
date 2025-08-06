<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>跳转到后端日志</h3>
      
      <!-- 会话信息 -->
      <div class="session-info">
        <div class="label">会话信息:</div>
        <div class="info-box">
          <div><strong>session_id:</strong> {{ sessionInfo?.sessionId || 'N/A' }} → 筛选字段: origin</div>
          <div><strong>user_id:</strong> {{ sessionInfo?.userId || 'N/A' }} → 筛选字段: staffID</div>
          <div><strong>时间范围:</strong> {{ timeRangeText }}</div>
          <div><strong>当前应用:</strong> {{ currentAppName }}</div>
        </div>
      </div>
      
      <!-- 索引选择 -->
      <div class="index-selection">
        <label class="label">选择索引 (可多选):</label>
        <select 
          v-model="selectedIndexes" 
          multiple 
          class="index-select"
        >
          <option 
            v-for="index in availableIndexes" 
            :key="index.key"
            :value="index.key"
            :selected="index.key === defaultIndexKey"
          >
            {{ index.displayText }}
          </option>
        </select>
      </div>
      
      <!-- 按钮组 -->
      <div class="button-group">
        <button @click="$emit('close')" class="btn btn-cancel">
          取消
        </button>
        <button @click="copyUrl" class="btn btn-copy">
          复制URL
        </button>
        <button @click="jumpToKibana" class="btn btn-primary">
          跳转
        </button>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SessionInfo, AvailableIndex } from '@/types'

interface Props {
  visible: boolean
  sessionInfo: SessionInfo | null
  availableIndexes: AvailableIndex[]
  currentAppName: string
  defaultIndexKey: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  jump: [url: string]
  copy: [url: string]
}>()

const selectedIndexes = ref<string[]>([])
const error = ref<string | null>(null)

// 计算时间范围文本
const timeRangeText = computed(() => {
  if (props.sessionInfo?.time) {
    return `${props.sessionInfo.time} 前后各1小时`
  }
  return '默认前4小时到现在'
})

// 监听默认索引变化，自动选中
watch(() => props.defaultIndexKey, (newKey) => {
  if (newKey && !selectedIndexes.value.includes(newKey)) {
    selectedIndexes.value = [newKey]
  }
}, { immediate: true })

// 复制URL到剪贴板
const copyUrl = async () => {
  try {
    const url = generateKibanaUrl()
    emit('copy', url)
    error.value = null
  } catch (err) {
    error.value = '复制失败，请手动复制'
    console.error('复制失败:', err)
  }
}

// 跳转到Kibana
const jumpToKibana = () => {
  try {
    const url = generateKibanaUrl()
    emit('jump', url)
    error.value = null
  } catch (err) {
    error.value = '生成URL失败'
    console.error('跳转失败:', err)
  }
}

// RISON编码器（完全按照非Vue版本实现）
const risonEncode = (obj: any): string => {
  if (obj === null || obj === undefined) return '!n'
  if (obj === true) return '!t'
  if (obj === false) return '!f'
  if (typeof obj === 'number') {
    if (isNaN(obj) || !isFinite(obj)) return '!n'
    return String(obj)
  }
  if (typeof obj === 'string') {
    if (obj === '') return "''"
    if (obj.startsWith('now') || obj === 'appState' || obj === 'phrase' || obj === 'kuery' || obj === 'auto' || obj === 'desc') {
      return obj
    }
    if (/^[A-Za-z_$][A-Za-z0-9_$\-@]*$/.test(obj)) {
      return obj
    }
    return "'" + obj.replace(/[!']/g, '!$&') + "'"
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '!()'
    return '!(' + obj.map(item => risonEncode(item)).join(',') + ')'
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj)
    if (keys.length === 0) return '()'
    
    const pairs = keys.map(key => {
      let encodedKey = key
      if (key === '$state') {
        encodedKey = "'$state'"
      } else if (key === '@timestamp') {
        encodedKey = "'@timestamp'"
      } else if (/^[A-Za-z_$][A-Za-z0-9_$\-]*$/.test(key)) {
        encodedKey = key
      } else {
        encodedKey = "'" + key.replace(/[!']/g, '!$&') + "'"
      }
      return encodedKey + ':' + risonEncode(obj[key])
    })
    
    return '(' + pairs.join(',') + ')'
  }
  return '!n'
}

// 生成Kibana URL（完全按照非Vue版本的逻辑）
const generateKibanaUrl = (): string => {
  if (!props.sessionInfo) {
    throw new Error('缺少会话信息')
  }
  
  if (selectedIndexes.value.length === 0) {
    throw new Error('请选择至少一个索引')
  }
  
  // 获取选中索引的ID
  const selectedIndexIds = selectedIndexes.value
    .map(key => props.availableIndexes.find(idx => idx.key === key)?.id)
    .filter(Boolean)
  
  if (selectedIndexIds.length === 0) {
    throw new Error('选中的索引无效')
  }
  
  // 使用第一个索引
  const indexId = selectedIndexIds[0]
  
  // 构建filters（完全按照非Vue版本）
  const filters = [
    {
      meta: {
        alias: null,
        disabled: false,
        key: "origin",
        negate: false,
        params: { query: props.sessionInfo.sessionId },
        type: "phrase"
      },
      query: { match_phrase: { origin: props.sessionInfo.sessionId } },
      "$state": { store: "appState" }
    },
    {
      meta: {
        alias: null,
        disabled: false,
        key: "staffID", 
        negate: false,
        params: { query: props.sessionInfo.userId },
        type: "phrase"
      },
      query: { match_phrase: { staffID: props.sessionInfo.userId } },
      "$state": { store: "appState" }
    }
  ]
  
  // 时间配置（按照非Vue版本的逻辑）
  let timeConfig
  if (props.sessionInfo.time) {
    try {
      const sessionTime = new Date(props.sessionInfo.time)
      if (!isNaN(sessionTime.getTime())) {
        // 使用1小时范围（前后各1小时）
        const timeRange = 1
        const startTime = new Date(sessionTime.getTime() - timeRange * 60 * 60 * 1000)
        const endTime = new Date(sessionTime.getTime() + timeRange * 60 * 60 * 1000)
        
        timeConfig = {
          refreshInterval: { pause: true, value: 0 },
          time: { 
            from: startTime.toISOString(), 
            to: endTime.toISOString() 
          }
        }
      } else {
        throw new Error('Invalid date')
      }
    } catch (error) {
      // 如果时间解析失败，使用默认时间范围
      timeConfig = {
        refreshInterval: { pause: true, value: 0 },
        time: { from: "now-4h", to: "now" }
      }
    }
  } else {
    // 没有时间信息时使用默认时间范围
    timeConfig = {
      refreshInterval: { pause: true, value: 0 },
      time: { from: "now-4h", to: "now" }
    }
  }
  
  const appConfig = {
    columns: ["_source"],
    index: indexId,
    interval: "auto",
    query: { language: "kuery", query: "" },
    filters: filters,
    sort: [["@timestamp", "desc"]]
  }
  
  // 使用正确的RISON编码
  const encodedTimeConfig = risonEncode(timeConfig)
  const encodedAppConfig = risonEncode(appConfig)
  
  return `https://pallognew.517la.com/s/517na/app/kibana#/discover?_g=${encodedTimeConfig}&_a=${encodedAppConfig}`
}
</script>

<style scoped>
.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.session-info {
  margin-bottom: 16px;
}

.label {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
}

.info-box {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.index-selection {
  margin-bottom: 20px;
}

.index-select {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  border: 1px solid #ddd;
}

.btn-cancel {
  background: white;
  color: #333;
}

.btn-copy {
  background: white;
  color: #1890ff;
  border-color: #1890ff;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn:hover {
  opacity: 0.8;
}

.error-message {
  margin-top: 12px;
  padding: 8px;
  background: #fee;
  color: #c33;
  border-radius: 4px;
  font-size: 13px;
}
</style> 