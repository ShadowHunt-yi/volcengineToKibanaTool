<template>
  <div class="json-formatter" :class="{ 'dark-mode': isDarkMode }">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-actions">
        <button @click="clearInput" class="btn btn-secondary">清空</button>
        <button @click="pasteFromClipboard" class="btn btn-secondary">粘贴</button>
        <button @click="copyToClipboard" class="btn btn-secondary" :disabled="!formattedJson">复制</button>
        <button @click="toggleCollapse" class="btn btn-secondary" :disabled="!formattedJson">
          {{ isCollapsed ? '全部展开' : '全部折叠' }}
        </button>
        <label class="checkbox-label">
          <input
            type="checkbox"
            v-model="showQuotes"
            @change="updateDisplay"
            :disabled="!formattedJson"
          />
          显示引号
        </label>
        <button @click="toggleUrlDecodeMode" class="btn" :class="{ 'btn-active': isUrlDecodeMode }" title="URL解码模式">
          🔗
        </button>
        <button @click="toggleDarkMode" class="btn btn-theme" :title="isDarkMode ? '切换到亮色模式' : '切换到暗夜模式'">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>

      </div>
      
      <!-- 统计信息 -->
      <div class="stats" v-if="stats">
        <span class="stat-item">对象: {{ stats.objects }}</span>
        <span class="stat-item">数组: {{ stats.arrays }}</span>
        <span class="stat-item">字符串: {{ stats.strings }}</span>
        <span class="stat-item">数字: {{ stats.numbers }}</span>
      </div>
    </div>

    <!-- 主体内容区域 - 左右布局 -->
    <div class="main-content">
      <!-- 左侧输入区域 -->
      <div class="input-panel" :style="inputPanelStyle">
        <div class="panel-header">
          <h3>{{ isUrlDecodeMode ? '输入 URL' : '输入 JSON' }}</h3>
        </div>
        <textarea
          v-model="inputJson"
          class="json-input"
          :placeholder="isUrlDecodeMode ? '请输入或粘贴需要解码的URL...' : '请输入或粘贴JSON数据...'"
          @input="onInputChange"
        ></textarea>
        <div v-if="error" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ error }}
        </div>
      </div>

      <!-- 可拖动分割线 -->
      <div 
        class="divider resizable"
        @mousedown="startResize"
        :title="'拖动调整面板大小'"
      >
        <div class="divider-handle">
          <div class="divider-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <!-- 右侧输出区域 -->
      <div class="output-panel">
        <div class="panel-header">
          <h3>{{ isUrlDecodeMode ? '解码结果' : '格式化结果' }}</h3>
        </div>
        <div class="json-output-container">
          <div 
            v-if="isUrlDecodeMode ? decodedResult : formattedJson"
            ref="jsonOutput"
            class="json-output"
            :class="{ 'url-decode-output': isUrlDecodeMode }"
          >
            <div v-if="isUrlDecodeMode" class="url-decode-content">
              {{ decodedResult }}
            </div>
            <div v-else v-html="formattedHtml" @click="handleClick"></div>
          </div>
          <div v-else class="placeholder">
            {{ isUrlDecodeMode ? '解码的URL将在此处显示...' : '格式化的JSON将在此处显示...' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

// 响应式数据
const inputJson = ref('')
const error = ref('')
const formattedJson = ref<any>(null)
const formattedHtml = ref('')
const showQuotes = ref(false)
const isCollapsed = ref(false)
const jsonOutput = ref<HTMLElement>()

// 暗夜模式和面板大小
const isDarkMode = ref(false)
const leftPanelWidth = ref(500) // 默认左侧面板宽度，给拖拽留出更多空间
const isResizing = ref(false)

// URL解码模式
const isUrlDecodeMode = ref(false)
const decodedResult = ref('')

// 性能优化：节点折叠状态缓存
const collapsedNodes = new Map<string, boolean>()
const nodeDepth = new Map<string, number>()

// 大数据渲染优化配置
const LARGE_DATA_THRESHOLD = 1000 // 超过这个数量的节点认为是大数据
const MAX_INITIAL_DEPTH = 2 // 大数据时初始展开深度

// 面板样式计算属性
const inputPanelStyle = computed(() => {
  return {
    width: leftPanelWidth.value + 'px'
  }
})

// 统计信息
const stats = computed(() => {
  if (!formattedJson.value) return null
  
  const count = { objects: 0, arrays: 0, strings: 0, numbers: 0 }
  
  function countItems(obj: any): void {
    if (obj === null || obj === undefined) return
    
    if (Array.isArray(obj)) {
      count.arrays++
      obj.forEach(item => countItems(item))
    } else if (typeof obj === 'object') {
      count.objects++
      Object.values(obj).forEach(value => countItems(value))
    } else if (typeof obj === 'string') {
      count.strings++
    } else if (typeof obj === 'number') {
      count.numbers++
    }
  }
  
  countItems(formattedJson.value)
  return count
})

// 检查是否为对象或数组
function isComplex(obj: any): boolean {
  return obj !== null && typeof obj === 'object'
}

// 检查URL
function isUrl(str: string): boolean {
  const urlRegex = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
  return urlRegex.test(str)
}

// 计算JSON节点总数（用于判断是否为大数据）
function countNodes(obj: any, depth: number = 0): number {
  // 防止无限递归（虽然JSON不应该有循环引用，但安全起见）
  if (depth > 100) return 1
  
  if (obj === null || typeof obj !== 'object') return 1
  
  let count = 1
  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += countNodes(item, depth + 1)
    }
  } else {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        count += countNodes(obj[key], depth + 1)
      }
    }
  }
  return count
}

// 生成节点路径（用于折叠状态追踪）
function getNodePath(path: string[], index: string | number): string {
  return [...path, index].join('.')
}

// 优化的HTML生成函数，支持懒加载和深度限制
function generateHtml(obj: any, depth: number = 0, path: string[] = [], totalNodes: number = 0): string {
  let html = ''
  
  // 判断是否为大数据集（只在顶层计算一次）
  const isLargeData = totalNodes > LARGE_DATA_THRESHOLD
  const shouldAutoCollapse = isLargeData && depth >= MAX_INITIAL_DEPTH
  
  if (typeof obj === 'string') {
    const escaped = obj.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
    
    if (isUrl(obj)) {
      html += `<a href="${obj}" class="json-literal-url" target="_blank">"${escaped}"</a>`
    } else {
      html += `<span class="json-literal-string">"${escaped}"</span>`
    }
  } else if (typeof obj === 'number') {
    html += `<span class="json-literal-numeric">${obj}</span>`
  } else if (typeof obj === 'boolean') {
    html += `<span class="json-literal-boolean">${obj}</span>`
  } else if (obj === null) {
    html += `<span class="json-literal">null</span>`
  } else if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const arrayLength = obj.length
      html += `[<span class="json-count">${arrayLength} items</span><ol class="json-array"${shouldAutoCollapse ? ' style="display: none;"' : ''}>`
      
      // 对于大数组，使用分批渲染
      const batchSize = isLargeData ? 100 : obj.length
      const shouldBatch = obj.length > batchSize && isLargeData
      
      for (let i = 0; i < Math.min(obj.length, shouldBatch ? batchSize : obj.length); i++) {
        const nodePath = getNodePath(path, i)
        html += '<li>'
        if (isComplex(obj[i])) {
          const toggleClass = shouldAutoCollapse ? 'collapsed' : ''
          html += `<a href="#" class="json-toggle ${toggleClass}" data-action="toggle" data-path="${nodePath}"></a>`
        }
        html += generateHtml(obj[i], depth + 1, [...path, String(i)], totalNodes)
        if (i < obj.length - 1) {
          html += ','
        }
        html += '</li>'
      }
      
      // 如果有更多项，添加"加载更多"按钮
      if (shouldBatch && obj.length > batchSize) {
        html += `<li class="load-more" data-path="${getNodePath(path, 'more')}" data-start="${batchSize}" data-total="${obj.length}">
          <button class="btn-load-more">加载更多 (${obj.length - batchSize} 项)</button>
        </li>`
      }
      
      html += '</ol>]'
    } else {
      html += '[]'
    }
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj)
    if (keys.length > 0) {
      html += `{<span class="json-count">${keys.length} keys</span><ul class="json-dict"${shouldAutoCollapse ? ' style="display: none;"' : ''}>`
      
      // 对于大对象，使用分批渲染
      const batchSize = isLargeData ? 50 : keys.length
      const shouldBatch = keys.length > batchSize && isLargeData
      
      keys.slice(0, shouldBatch ? batchSize : keys.length).forEach((key, index) => {
        const nodePath = getNodePath(path, key)
        html += '<li>'
        const keyDisplay = showQuotes.value ? `"${key}"` : key
        
        if (isComplex(obj[key])) {
          const toggleClass = shouldAutoCollapse ? 'collapsed' : ''
          html += `<a href="#" class="json-toggle ${toggleClass}" data-action="toggle" data-path="${nodePath}">${keyDisplay}</a>`
        } else {
          html += `<span class="property">${keyDisplay}</span>`
        }
        
        html += ': ' + generateHtml(obj[key], depth + 1, [...path, key], totalNodes)
        
        if (index < (shouldBatch ? batchSize : keys.length) - 1 || (shouldBatch && keys.length > batchSize)) {
          html += ','
        }
        html += '</li>'
      })
      
      // 如果有更多键，添加"加载更多"按钮
      if (shouldBatch && keys.length > batchSize) {
        html += `<li class="load-more" data-path="${getNodePath(path, 'more')}" data-start="${batchSize}" data-total="${keys.length}">
          <button class="btn-load-more">加载更多 (${keys.length - batchSize} 项)</button>
        </li>`
      }
      
      html += '</ul>}'
    } else {
      html += '{}'
    }
  }
  
  return html
}

// 输入变化处理 - 实时格式化或URL解码
function onInputChange() {
  error.value = ''
  if (!inputJson.value.trim()) {
    if (isUrlDecodeMode.value) {
      decodedResult.value = ''
    } else {
      formattedJson.value = null
      formattedHtml.value = ''
    }
    return
  }
  
  if (isUrlDecodeMode.value) {
    // URL解码模式
    try {
      decodedResult.value = decodeURIComponent(inputJson.value)
    } catch (e) {
      decodedResult.value = inputJson.value // 如果解码失败，显示原始内容
    }
  } else {
    // JSON格式化模式
    try {
      const parsed = JSON.parse(inputJson.value)
      formattedJson.value = parsed
      error.value = '' // 清除之前的错误
      updateDisplay()
    } catch (e) {
      // 如果JSON格式错误，显示错误信息
      const errorMessage = e instanceof Error ? e.message : String(e)
      // 只在输入完整时才显示错误（避免输入过程中频繁显示错误）
      if (inputJson.value.trim().length > 0) {
        // 检查是否是JSON不完整（缺少引号、括号等）
        const trimmed = inputJson.value.trim()
        const isIncomplete = !trimmed.endsWith('}') && !trimmed.endsWith(']') && !trimmed.endsWith('"') && !trimmed.match(/^["\d\[\{]/)
        if (!isIncomplete) {
          error.value = `JSON格式错误: ${errorMessage}`
        } else {
          error.value = '' // 输入不完整时不显示错误
        }
      }
      formattedJson.value = null
      formattedHtml.value = ''
    }
  }
}

// 格式化JSON（保留以供未来使用）
// function formatJson() {
//   error.value = ''
//   
//   if (!inputJson.value.trim()) {
//     error.value = '请输入JSON数据'
//     return
//   }
//   
//   try {
//     const parsed = JSON.parse(inputJson.value)
//     formattedJson.value = parsed
//     updateDisplay()
//   } catch (e) {
//     error.value = `JSON格式错误: ${(e as Error).message}`
//     formattedJson.value = null
//     formattedHtml.value = ''
//   }
// }

// 更新显示
function updateDisplay() {
  if (formattedJson.value !== null) {
    // 预先计算节点总数，避免在递归中重复计算
    const totalNodes = countNodes(formattedJson.value)
    const html = generateHtml(formattedJson.value, 0, [], totalNodes)
    if (isComplex(formattedJson.value)) {
      formattedHtml.value = '<a href="#" class="json-toggle" data-action="toggle"></a>' + html
    } else {
      formattedHtml.value = html
    }
  }
}

// 点击处理 - 优化版，使用事件委托和requestAnimationFrame
function handleClick(event: Event) {
  const target = event.target as HTMLElement
  
  // 处理折叠/展开
  if (target.classList.contains('json-toggle')) {
    event.preventDefault()
    
    // 使用requestAnimationFrame优化性能
    requestAnimationFrame(() => {
      const li = target.closest('li') || target.closest('div')
      if (li) {
        const childList = li.querySelector('ul, ol') as HTMLElement
        if (childList) {
          const isCollapsed = childList.style.display === 'none'
          childList.style.display = isCollapsed ? 'block' : 'none'
          
          if (isCollapsed) {
            target.classList.remove('collapsed')
          } else {
            target.classList.add('collapsed')
          }
          
          // 缓存折叠状态
          const path = target.getAttribute('data-path')
          if (path) {
            collapsedNodes.set(path, !isCollapsed)
          }
        }
      }
    })
  }
  
  // 处理"加载更多"按钮
  if (target.classList.contains('btn-load-more')) {
    event.preventDefault()
    const loadMoreLi = target.closest('li.load-more')
    if (loadMoreLi) {
      // 这里可以实现加载更多逻辑
      // 暂时隐藏按钮，提示用户数据已加载
      (loadMoreLi as HTMLElement).style.display = 'none'
    }
  }
  
  // 处理属性点击选择
  if (target.classList.contains('property')) {
    // 清除之前的选择
    document.querySelectorAll('li.copyable').forEach(el => {
      el.classList.remove('copyable')
    })
    // 添加新的选择
    const li = target.closest('li')
    if (li) {
      li.classList.add('copyable')
    }
  }
}

// 全部折叠/展开 - 优化版，使用分批处理避免卡顿
function toggleCollapse() {
  if (!jsonOutput.value) return
  
  const toggles = Array.from(jsonOutput.value.querySelectorAll('.json-toggle')) as Element[]
  const lists = Array.from(jsonOutput.value.querySelectorAll('ul, ol')) as Element[]
  
  const batchSize = 50 // 每批处理50个元素
  const targetState = !isCollapsed.value
  
  // 分批处理函数
  function processBatch(items: Element[], startIndex: number, processor: (item: Element) => void) {
    const endIndex = Math.min(startIndex + batchSize, items.length)
    
    for (let i = startIndex; i < endIndex; i++) {
      processor(items[i])
    }
    
    if (endIndex < items.length) {
      // 使用requestAnimationFrame继续处理下一批
      requestAnimationFrame(() => processBatch(items, endIndex, processor))
    }
  }
  
  if (targetState) {
    // 折叠全部
    processBatch(lists, 0, (list) => {
      (list as HTMLElement).style.display = 'none'
    })
    processBatch(toggles, 0, (toggle) => {
      toggle.classList.add('collapsed')
    })
  } else {
    // 展开全部
    processBatch(lists, 0, (list) => {
      (list as HTMLElement).style.display = 'block'
    })
    processBatch(toggles, 0, (toggle) => {
      toggle.classList.remove('collapsed')
    })
  }
  
  isCollapsed.value = targetState
}

// 清空输入
function clearInput() {
  inputJson.value = ''
  error.value = ''
  formattedJson.value = null
  formattedHtml.value = ''
  decodedResult.value = ''
  
  // 清理性能优化缓存
  collapsedNodes.clear()
  nodeDepth.clear()
}

// 复制到剪贴板
async function copyToClipboard() {
  let textToCopy = ''
  
  if (isUrlDecodeMode.value) {
    if (!decodedResult.value) return
    textToCopy = decodedResult.value
  } else {
    if (!formattedJson.value) return
    textToCopy = JSON.stringify(formattedJson.value, null, 2)
  }
  
  try {
    await navigator.clipboard.writeText(textToCopy)
    // 这里可以添加提示消息
  } catch (e) {
    console.error('复制失败:', e)
  }
}

// 从剪贴板粘贴
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    inputJson.value = text
    await nextTick()
  } catch (e) {
    console.error('粘贴失败:', e)
  }
}

// 暗夜模式切换
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  // 保存到localStorage
  localStorage.setItem('jsonFormatter-darkMode', isDarkMode.value.toString())
}

// URL解码模式切换
function toggleUrlDecodeMode() {
  isUrlDecodeMode.value = !isUrlDecodeMode.value
  // 切换模式时清空内容和结果
  inputJson.value = ''
  formattedJson.value = null
  formattedHtml.value = ''
  decodedResult.value = ''
  error.value = ''
  // 保存到localStorage
  localStorage.setItem('jsonFormatter-urlDecodeMode', isUrlDecodeMode.value.toString())
}

// 开始拖拽调整
function startResize(event: MouseEvent) {
  isResizing.value = true
  event.preventDefault()
  event.stopPropagation()
  
  const startX = event.clientX
  const startWidth = leftPanelWidth.value
  
  // 禁用文本选择
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  
  function doResize(e: MouseEvent) {
    if (!isResizing.value) return
    e.preventDefault()
    
    const deltaX = e.clientX - startX
    const minWidth = 200 // 最小宽度
    const maxWidth = window.innerWidth - 300 // 留出空间给右侧
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    leftPanelWidth.value = newWidth
  }
  
  function stopResize() {
    isResizing.value = false
    
    // 恢复文本选择和光标
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    document.removeEventListener('mousemove', doResize)
    document.removeEventListener('mouseup', stopResize)
    // 保存到localStorage
    localStorage.setItem('jsonFormatter-panelWidth', leftPanelWidth.value.toString())
  }
  
  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
}



// 初始化设置
function initializeSettings() {
  // 读取暗夜模式设置
  const savedDarkMode = localStorage.getItem('jsonFormatter-darkMode')
  if (savedDarkMode !== null) {
    isDarkMode.value = savedDarkMode === 'true'
  }
  
  // 读取面板宽度设置
  const savedWidth = localStorage.getItem('jsonFormatter-panelWidth')
  if (savedWidth !== null) {
    leftPanelWidth.value = parseInt(savedWidth, 10)
  }
  
  // 读取URL解码模式设置
  const savedUrlDecodeMode = localStorage.getItem('jsonFormatter-urlDecodeMode')
  if (savedUrlDecodeMode !== null) {
    isUrlDecodeMode.value = savedUrlDecodeMode === 'true'
  }
}

// 组件挂载时初始化
onMounted(() => {
  initializeSettings()
})
</script>

<style scoped>
.json-formatter {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.main-content {
  flex: 1;
  display: flex;
  min-height: 0; /* 重要：允许flex子项缩小 */
}

.input-panel, .output-panel {
  display: flex;
  flex-direction: column;
  background: white;
  min-height: 0; /* 重要：允许flex子项缩小 */
}

.input-panel {
  flex-shrink: 0; /* 防止收缩，保持设定的宽度 */
}

.output-panel {
  flex: 1; /* 右侧面板自动填充剩余空间 */
}

.panel-header {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.panel-header h3 {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.divider {
  width: 1px;
  background: #e1e5e9;
  flex-shrink: 0;
  position: relative;
}

.divider.resizable {
  width: 8px;
  cursor: col-resize;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  user-select: none; /* 防止选中文本 */
  position: relative;
  z-index: 10; /* 确保在最上层 */
}

.divider.resizable:hover {
  background: rgba(0, 0, 0, 0.08);
}

.divider.resizable:active {
  background: rgba(0, 0, 0, 0.12);
}

.divider-handle {
  width: 1px;
  height: 100%;
  background: #e1e5e9;
  position: relative;
  pointer-events: none; /* 阻止子元素拦截鼠标事件 */
}

.divider-dots {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none; /* 阻止子元素拦截鼠标事件 */
}

.divider-dots span {
  width: 3px;
  height: 3px;
  background: #999;
  border-radius: 50%;
  display: block;
  pointer-events: none; /* 阻止子元素拦截鼠标事件 */
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-theme {
  background: #6f42c1;
  color: white;
  font-size: 16px;
  padding: 6px 12px;
}

.btn-theme:hover {
  background: #5a2d91;
}

.btn-active {
  background: #28a745;
  color: white;
}

.btn-active:hover {
  background: #218838;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.json-input {
  flex: 1;
  border: none;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  background: #fafafa;
}

.json-input:focus {
  background: #fff;
}

.json-output-container {
  flex: 1;
  overflow: auto;
  background: #fafafa;
}

.placeholder {
  padding: 16px;
  color: #999;
  font-style: italic;
  text-align: center;
  margin-top: 50px;
}

.url-decode-output {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
}

.url-decode-content {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
  color: #333;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  font-size: 14px;
}

.error-icon {
  flex-shrink: 0;
}

.json-output {
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #fff;
  height: 100%;
  overflow: auto;
}

.stats {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 12px;
  color: #666;
}

.stat-item {
  color: #666;
  font-size: 12px;
}

/* JSON样式 */
:deep(.json-literal-string) {
  color: #032f62;
}

:deep(.json-literal-numeric) {
  color: #005cc5;
}

:deep(.json-literal-boolean) {
  color: #d73a49;
}

:deep(.json-literal) {
  color: #6f42c1;
}

:deep(.json-literal-url) {
  color: #0366d6;
  text-decoration: none;
}

:deep(.json-literal-url:hover) {
  text-decoration: underline;
}

:deep(.property) {
  color: #e36209;
  font-weight: 600;
}

:deep(.json-toggle) {
  color: #586069;
  text-decoration: none;
  cursor: pointer;
  margin-right: 5px;
}

:deep(.json-toggle:before) {
  content: '▼ ';
  transition: transform 0.2s;
}

:deep(.json-toggle.collapsed:before) {
  content: '▶ ';
}

:deep(.json-toggle:hover) {
  color: #0366d6;
}

:deep(.json-array), :deep(.json-dict) {
  margin: 0;
  padding-left: 20px;
}

:deep(.json-array li), :deep(.json-dict li) {
  list-style: none;
  margin: 2px 0;
}

:deep(li.copyable) {
  background-color: #fff3cd;
  border-radius: 3px;
  padding: 2px 4px;
}

/* 节点计数样式 */
:deep(.json-count) {
  color: #6a737d;
  font-size: 11px;
  margin-left: 4px;
  opacity: 0.7;
}

/* 加载更多按钮样式 */
:deep(.load-more) {
  margin: 8px 0;
}

:deep(.btn-load-more) {
  background: #f1f3f5;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 12px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
}

:deep(.btn-load-more:hover) {
  background: #e9ecef;
  border-color: #adb5bd;
}

/* 暗夜模式样式 */
.json-formatter.dark-mode {
  background: #1e1e1e;
  color: #d4d4d4;
}

.json-formatter.dark-mode .toolbar {
  background: #2d2d2d;
  border-bottom-color: #3e3e3e;
}

.json-formatter.dark-mode .panel-header {
  background: #2d2d2d;
  border-bottom-color: #3e3e3e;
  color: #d4d4d4;
}

.json-formatter.dark-mode .input-panel,
.json-formatter.dark-mode .output-panel {
  background: #1e1e1e;
}

.json-formatter.dark-mode .json-input {
  background: #1e1e1e;
  color: #d4d4d4;
}

.json-formatter.dark-mode .json-input:focus {
  background: #252526;
}

.json-formatter.dark-mode .json-output-container {
  background: #1e1e1e;
}

.json-formatter.dark-mode .json-output {
  background: #1e1e1e;
  color: #d4d4d4;
}

.json-formatter.dark-mode .placeholder {
  color: #6a6a6a;
}

.json-formatter.dark-mode .divider-handle {
  background: #3e3e3e;
}

.json-formatter.dark-mode .divider.resizable:hover {
  background: rgba(255, 255, 255, 0.05);
}

.json-formatter.dark-mode .divider-dots span {
  background: #6a6a6a;
}

.json-formatter.dark-mode .btn {
  background: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #4a4a4a;
}

.json-formatter.dark-mode .btn:hover:not(:disabled) {
  background: #484848;
}

.json-formatter.dark-mode .btn-theme {
  background: #8b5cf6;
  border: none;
}

.json-formatter.dark-mode .btn-theme:hover {
  background: #7c3aed;
}

.json-formatter.dark-mode .btn-active {
  background: #10b981;
  border: none;
}

.json-formatter.dark-mode .btn-active:hover {
  background: #059669;
}

.json-formatter.dark-mode .url-decode-content {
  color: #d4d4d4;
}

.json-formatter.dark-mode .stats {
  color: #9ca3af;
}

/* 暗夜模式下的JSON语法高亮 */
.json-formatter.dark-mode :deep(.json-literal-string) {
  color: #ce9178;
}

.json-formatter.dark-mode :deep(.json-literal-numeric) {
  color: #b5cea8;
}

.json-formatter.dark-mode :deep(.json-literal-boolean) {
  color: #569cd6;
}

.json-formatter.dark-mode :deep(.json-literal) {
  color: #569cd6;
}

.json-formatter.dark-mode :deep(.json-literal-url) {
  color: #4fc3f7;
}

.json-formatter.dark-mode :deep(.property) {
  color: #9cdcfe;
}

.json-formatter.dark-mode :deep(.json-toggle) {
  color: #d4d4d4;
}

.json-formatter.dark-mode :deep(.json-toggle:hover) {
  color: #4fc3f7;
}

.json-formatter.dark-mode :deep(li.copyable) {
  background-color: #3a3a2a;
}

/* 暗夜模式下的节点计数 */
.json-formatter.dark-mode :deep(.json-count) {
  color: #9ca3af;
}

/* 暗夜模式下的加载更多按钮 */
.json-formatter.dark-mode :deep(.btn-load-more) {
  background: #3c3c3c;
  border-color: #4a4a4a;
  color: #d4d4d4;
}

.json-formatter.dark-mode :deep(.btn-load-more:hover) {
  background: #484848;
  border-color: #5a5a5a;
}

@media (max-width: 768px) {
  .toolbar-actions {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .stats {
    flex-direction: column;
    gap: 4px;
  }
  
  .main-content {
    flex-direction: column;
  }
  
  .input-panel {
    width: 100% !important;
    max-height: 40vh;
  }
  
  .divider.resizable {
    width: 100% !important;
    height: 8px !important;
    cursor: row-resize !important;
  }
  
  .divider-handle {
    width: 100% !important;
    height: 1px !important;
  }
  
  .divider-dots {
    flex-direction: row !important;
  }
}
</style>