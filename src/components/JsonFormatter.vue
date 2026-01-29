<template>
  <div class="json-formatter" :class="themeClass">
    <!-- 悬浮球 - 工具栏收起时显示 -->
    <div
      v-if="isToolbarCollapsed"
      class="floating-ball"
      @click="toggleToolbar"
      title="展开工具栏"
    >
      <span class="ball-icon">⚙️</span>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar" :class="{ 'toolbar-hidden': isToolbarCollapsed }">
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
        <button @click="toggleBase64Mode" class="btn" :class="{ 'btn-active': isBase64Mode }" title="Base64编解码模式">
          🔐
        </button>
        <button @click="toggleFlattenMode" class="btn" :class="{ 'btn-active': isFlattenMode }" :disabled="isUrlDecodeMode || isBase64Mode" title="扁平化模式：将嵌套结构转为键值对形式（默认已自动深度解析嵌套JSON）">
          ⬇️
        </button>
        <button @click="cycleTheme" class="btn btn-theme" :title="themeTitle">
          {{ themeIcon }}
        </button>
        <button @click="toggleToolbar" class="btn btn-collapse" title="收起工具栏">
          📌
        </button>

        <!-- 搜索框 -->
        <div class="search-box" v-if="formattedJson && !isUrlDecodeMode && !isBase64Mode">
          <input
            type="text"
            v-model="searchQuery"
            @input="performSearch"
            placeholder="搜索字段名或值..."
            class="search-input"
          />
          <span v-if="searchMatchCount > 0" class="search-count">
            {{ currentMatchIndex + 1 }}/{{ searchMatchCount }}
          </span>
          <button @click="navigateSearch(-1)" class="btn-search-nav" :disabled="searchMatchCount === 0" title="上一个">▲</button>
          <button @click="navigateSearch(1)" class="btn-search-nav" :disabled="searchMatchCount === 0" title="下一个">▼</button>
          <button @click="clearSearch" class="btn-search-clear" v-if="searchQuery" title="清除搜索">✕</button>
        </div>

      </div>
      
      <!-- 统计信息 -->
      <div class="stats" v-if="stats">
        <span class="stat-item">对象: {{ stats.objects }}</span>
        <span class="stat-item">数组: {{ stats.arrays }}</span>
        <span class="stat-item">字符串: {{ stats.strings }}</span>
        <span class="stat-item">数字: {{ stats.numbers }}</span>
        <span v-if="flattenStats" class="stat-item stat-flatten">
          扁平化: {{ flattenStats.original }} → {{ flattenStats.flattened }} 节点
        </span>
      </div>
    </div>

    <!-- 主体内容区域 - 左右布局 -->
    <div class="main-content">
      <!-- 左侧输入区域 -->
      <div class="input-panel" :style="inputPanelStyle">
        <div class="panel-header">
          <h3>{{ inputPanelTitle }}</h3>
          <!-- Base64模式下显示编码/解码切换 -->
          <div v-if="isBase64Mode" class="base64-switch">
            <button
              @click="base64Operation = 'decode'"
              class="btn btn-small"
              :class="{ 'btn-active': base64Operation === 'decode' }"
            >解码</button>
            <button
              @click="base64Operation = 'encode'"
              class="btn btn-small"
              :class="{ 'btn-active': base64Operation === 'encode' }"
            >编码</button>
          </div>
        </div>
        <textarea
          v-model="inputJson"
          class="json-input"
          :placeholder="inputPlaceholder"
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
          <h3>{{ outputPanelTitle }}</h3>
        </div>
        <div class="json-output-container">
          <div
            v-if="hasOutput"
            ref="jsonOutput"
            class="json-output"
            :class="{ 'url-decode-output': isUrlDecodeMode || isBase64Mode }"
          >
            <div v-if="isUrlDecodeMode" class="url-decode-content">
              {{ decodedResult }}
            </div>
            <div v-else-if="isBase64Mode" class="url-decode-content base64-content">
              {{ base64Result }}
            </div>
            <div v-else v-html="formattedHtml" @click="handleClick"></div>
          </div>
          <div v-else class="placeholder">
            {{ outputPlaceholder }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'

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
const currentTheme = ref<'light' | 'dark' | 'hacker'>('light') // 三种主题
const isToolbarCollapsed = ref(false) // 工具栏折叠状态
const leftPanelWidth = ref(500) // 默认左侧面板宽度，给拖拽留出更多空间
const isResizing = ref(false)

// 主题相关计算属性
const themeClass = computed(() => {
  return {
    'dark-mode': currentTheme.value === 'dark',
    'hacker-mode': currentTheme.value === 'hacker'
  }
})

const themeIcon = computed(() => {
  switch (currentTheme.value) {
    case 'light': return '🌙'
    case 'dark': return '💚'
    case 'hacker': return '☀️'
    default: return '🌙'
  }
})

const themeTitle = computed(() => {
  switch (currentTheme.value) {
    case 'light': return '切换到暗夜模式'
    case 'dark': return '切换到黑客模式'
    case 'hacker': return '切换到亮色模式'
    default: return '切换主题'
  }
})

// URL解码模式
const isUrlDecodeMode = ref(false)
const decodedResult = ref('')

// Base64编解码模式
const isBase64Mode = ref(false)
const base64Result = ref('')
const base64Operation = ref<'encode' | 'decode'>('decode') // 默认解码

// 扁平化模式
const isFlattenMode = ref(false)
const flattenStats = ref<{ original: number; flattened: number } | null>(null)

// 搜索功能
const searchQuery = ref('')
const searchMatchCount = ref(0)
const currentMatchIndex = ref(0)

// 性能优化：节点折叠状态缓存
const collapsedNodes = new Map<string, boolean>()
const nodeDepth = new Map<string, number>()

// 大数据渲染优化配置
const LARGE_DATA_THRESHOLD = 1000 // 超过这个数量的节点认为是大数据
const MAX_INITIAL_DEPTH = 2 // 大数据时初始展开深度

// 扁平化优化配置
const MAX_FLATTEN_DEPTH = 20 // 最大扁平化深度,防止无限递归
const MAX_FLATTEN_NODES = 50000 // 最大扁平化节点数,防止性能问题

// 面板样式计算属性
const inputPanelStyle = computed(() => {
  return {
    width: leftPanelWidth.value + 'px'
  }
})

// 输入面板标题
const inputPanelTitle = computed(() => {
  if (isBase64Mode.value) {
    return base64Operation.value === 'encode' ? '输入文本' : '输入 Base64'
  }
  if (isUrlDecodeMode.value) {
    return '输入 URL'
  }
  return '输入 JSON'
})

// 输入面板占位符
const inputPlaceholder = computed(() => {
  if (isBase64Mode.value) {
    return base64Operation.value === 'encode'
      ? '请输入需要编码为Base64的文本...'
      : '请输入需要解码的Base64字符串...'
  }
  if (isUrlDecodeMode.value) {
    return '请输入或粘贴需要解码的URL...'
  }
  return '请输入或粘贴JSON数据...'
})

// 输出面板标题
const outputPanelTitle = computed(() => {
  if (isBase64Mode.value) {
    return base64Operation.value === 'encode' ? 'Base64编码结果' : '解码结果'
  }
  if (isUrlDecodeMode.value) {
    return '解码结果'
  }
  return '格式化结果'
})

// 输出面板占位符
const outputPlaceholder = computed(() => {
  if (isBase64Mode.value) {
    return base64Operation.value === 'encode'
      ? 'Base64编码结果将在此处显示...'
      : '解码结果将在此处显示...'
  }
  if (isUrlDecodeMode.value) {
    return '解码的URL将在此处显示...'
  }
  return '格式化的JSON将在此处显示...'
})

// 是否有输出内容
const hasOutput = computed(() => {
  if (isBase64Mode.value) {
    return !!base64Result.value
  }
  if (isUrlDecodeMode.value) {
    return !!decodedResult.value
  }
  return !!formattedJson.value
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

// 检测字符串是否是JSON格式
function isJsonString(str: string): boolean {
  if (typeof str !== 'string') return false
  const trimmed = str.trim()
  // 必须以 { 或 [ 开头
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  // 简单长度检查,避免解析过长的非JSON字符串
  if (trimmed.length > 10000000) return false // 10MB限制
  return true
}

// 深度解析嵌套JSON - 递归解析所有JSON字符串，保持树形结构
function deepParseJSON(data: any, depth = 0, seen = new WeakSet()): any {
  // 防止无限递归
  if (depth > MAX_FLATTEN_DEPTH) return data

  // 处理null和undefined
  if (data === null || data === undefined) return data

  // 处理字符串 - 尝试解析JSON
  if (typeof data === 'string') {
    if (isJsonString(data)) {
      try {
        const parsed = JSON.parse(data)
        // 如果解析成功且是对象或数组，继续递归解析
        if (typeof parsed === 'object' && parsed !== null) {
          return deepParseJSON(parsed, depth + 1, seen)
        }
        return parsed
      } catch (e) {
        // 解析失败，返回原始字符串
        return data
      }
    }
    return data
  }

  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => deepParseJSON(item, depth + 1, seen))
  }

  // 处理对象
  if (typeof data === 'object') {
    // 循环引用检测
    if (seen.has(data)) return '[Circular Reference]'
    seen.add(data)

    const result: Record<string, any> = {}
    for (const key of Object.keys(data)) {
      result[key] = deepParseJSON(data[key], depth + 1, seen)
    }
    return result
  }

  // 其他基本类型直接返回
  return data
}

// 扁平化嵌套JSON - 性能优化版本（保留旧功能）
function parseNestedJSON(data: any, prefix = '', depth = 0): Record<string, any> {
  const result: Record<string, any> = {}
  let nodeCount = 0

  // 循环引用检测
  const seen = new WeakSet()

  function flatten(obj: any, path: string, currentDepth: number): void {
    // 性能保护: 深度限制
    if (currentDepth > MAX_FLATTEN_DEPTH) {
      result[path] = '[Max depth reached]'
      return
    }

    // 性能保护: 节点数量限制
    if (nodeCount > MAX_FLATTEN_NODES) {
      result[path] = '[Max nodes limit reached]'
      return
    }

    // 处理null和undefined
    if (obj === null || obj === undefined) {
      result[path] = obj
      nodeCount++
      return
    }

    // 处理字符串类型 - 检测是否是JSON字符串
    if (typeof obj === 'string') {
      // 尝试检测并解析JSON字符串
      if (isJsonString(obj)) {
        try {
          const parsed = JSON.parse(obj)
          // 如果解析成功且是对象或数组,继续递归扁平化
          if (typeof parsed === 'object' && parsed !== null) {
            flatten(parsed, path, currentDepth + 1)
            return
          }
        } catch (e) {
          // 解析失败,当作普通字符串处理
        }
      }
      // 普通字符串直接赋值
      result[path] = obj
      nodeCount++
      return
    }

    // 处理数组
    if (Array.isArray(obj)) {
      // 空数组直接赋值
      if (obj.length === 0) {
        result[path] = []
        nodeCount++
        return
      }

      // 遍历数组元素
      obj.forEach((item, index) => {
        const arrayPath = `${path}[${index}]`

        if (item === null || item === undefined) {
          result[arrayPath] = item
          nodeCount++
        } else if (typeof item === 'string') {
          // 字符串类型需要检测是否是JSON字符串
          if (isJsonString(item)) {
            try {
              const parsed = JSON.parse(item)
              if (typeof parsed === 'object' && parsed !== null) {
                flatten(parsed, arrayPath, currentDepth + 1)
                return
              }
            } catch (e) {
              // 解析失败,当作普通字符串
            }
          }
          // 普通字符串直接赋值
          result[arrayPath] = item
          nodeCount++
        } else if (typeof item === 'object') {
          // 循环引用检测
          if (seen.has(item)) {
            result[arrayPath] = '[Circular Reference]'
            nodeCount++
            return
          }
          seen.add(item)

          // 递归处理对象或数组
          flatten(item, arrayPath, currentDepth + 1)
        } else {
          // 其他基本类型直接赋值
          result[arrayPath] = item
          nodeCount++
        }
      })
    }
    // 处理对象
    else if (typeof obj === 'object') {
      // 循环引用检测
      if (seen.has(obj)) {
        result[path] = '[Circular Reference]'
        nodeCount++
        return
      }
      seen.add(obj)

      const keys = Object.keys(obj)

      // 空对象直接赋值
      if (keys.length === 0) {
        result[path] = {}
        nodeCount++
        return
      }

      // 遍历对象属性
      keys.forEach(key => {
        const newPath = path ? `${path}.${key}` : key
        const value = obj[key]

        if (value === null || value === undefined) {
          result[newPath] = value
          nodeCount++
        } else if (typeof value === 'string') {
          // 字符串类型需要检测是否是JSON字符串
          if (isJsonString(value)) {
            try {
              const parsed = JSON.parse(value)
              if (typeof parsed === 'object' && parsed !== null) {
                flatten(parsed, newPath, currentDepth + 1)
                return
              }
            } catch (e) {
              // 解析失败,当作普通字符串
            }
          }
          // 普通字符串直接赋值
          result[newPath] = value
          nodeCount++
        } else if (typeof value === 'object') {
          // 递归处理嵌套对象或数组
          flatten(value, newPath, currentDepth + 1)
        } else {
          // 其他基本类型直接赋值
          result[newPath] = value
          nodeCount++
        }
      })
    }
    // 其他基本类型 (number, boolean等)
    else {
      result[path] = obj
      nodeCount++
    }
  }

  flatten(data, prefix, depth)

  return result
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

// 优化的HTML生成函数，默认全部展开
function generateHtml(obj: any, depth: number = 0, path: string[] = [], totalNodes: number = 0): string {
  let html = ''

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
      // 默认展开，不设置 display: none
      html += `[<span class="json-count">${arrayLength} items</span><ol class="json-array">`

      for (let i = 0; i < obj.length; i++) {
        const nodePath = getNodePath(path, i)
        html += '<li>'
        if (isComplex(obj[i])) {
          // 默认展开状态，不添加 collapsed 类
          html += `<a href="#" class="json-toggle" data-action="toggle" data-path="${nodePath}"></a>`
        }
        html += generateHtml(obj[i], depth + 1, [...path, String(i)], totalNodes)
        if (i < obj.length - 1) {
          html += ','
        }
        html += '</li>'
      }
      
      html += '</ol>]'
    } else {
      html += '[]'
    }
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj)
    if (keys.length > 0) {
      // 默认展开，不设置 display: none
      html += `{<span class="json-count">${keys.length} keys</span><ul class="json-dict">`

      keys.forEach((key, index) => {
        const nodePath = getNodePath(path, key)
        html += '<li>'
        const keyDisplay = showQuotes.value ? `"${key}"` : key

        if (isComplex(obj[key])) {
          // 默认展开状态，不添加 collapsed 类
          html += `<a href="#" class="json-toggle" data-action="toggle" data-path="${nodePath}">${keyDisplay}</a>`
        } else {
          html += `<span class="property">${keyDisplay}</span>`
        }

        html += ': ' + generateHtml(obj[key], depth + 1, [...path, key], totalNodes)

        if (index < keys.length - 1) {
          html += ','
        }
        html += '</li>'
      })

      html += '</ul>}'
    } else {
      html += '{}'
    }
  }

  return html
}

// 输入变化处理 - 实时格式化或URL解码或Base64编解码
function onInputChange() {
  error.value = ''
  if (!inputJson.value.trim()) {
    if (isUrlDecodeMode.value) {
      decodedResult.value = ''
    } else if (isBase64Mode.value) {
      base64Result.value = ''
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
  } else if (isBase64Mode.value) {
    // Base64编解码模式
    try {
      if (base64Operation.value === 'encode') {
        // 编码：文本 -> Base64 (支持UTF-8)
        const encoder = new TextEncoder()
        const data = encoder.encode(inputJson.value)
        const binaryStr = Array.from(data).map(byte => String.fromCharCode(byte)).join('')
        base64Result.value = btoa(binaryStr)
        error.value = ''
      } else {
        // 解码：Base64 -> 文本 (支持UTF-8)
        const binaryStr = atob(inputJson.value)
        const bytes = Uint8Array.from(binaryStr, char => char.charCodeAt(0))
        const decoder = new TextDecoder()
        base64Result.value = decoder.decode(bytes)
        error.value = ''
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      if (base64Operation.value === 'decode') {
        error.value = `Base64解码失败: ${errorMessage}`
      } else {
        error.value = `Base64编码失败: ${errorMessage}`
      }
      base64Result.value = ''
    }
  } else {
    // JSON格式化模式
    try {
      const parsed = JSON.parse(inputJson.value)

      // 如果启用了扁平化模式,进行扁平化处理
      if (isFlattenMode.value) {
        const originalNodeCount = countNodes(parsed)
        const flattened = parseNestedJSON(parsed)
        const flattenedNodeCount = Object.keys(flattened).length

        // 更新统计信息
        flattenStats.value = {
          original: originalNodeCount,
          flattened: flattenedNodeCount
        }

        formattedJson.value = flattened
      } else {
        flattenStats.value = null
        // 默认使用深度解析，递归解析所有嵌套的JSON字符串
        formattedJson.value = deepParseJSON(parsed)
      }

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
      flattenStats.value = null
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
      formattedHtml.value = '<a href="#" class="json-toggle" data-action="toggle" data-path="root"></a>' + html
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
      // 单独展开节点时，移除全部折叠的 CSS class
      if (jsonOutput.value?.classList.contains('all-collapsed')) {
        jsonOutput.value.classList.remove('all-collapsed')
        isCollapsed.value = false
      }

      // 改进的选择器逻辑: 找到toggle后面的ul或ol元素
      const parent = target.parentElement
      if (!parent) return

      // 查找当前li/div下的第一个ul或ol(包括深层嵌套的)
      let childList: HTMLElement | null = null

      // 先尝试找紧邻的兄弟元素中的ul/ol
      let sibling = target.nextSibling
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE) {
          const elem = sibling as HTMLElement
          if (elem.tagName === 'UL' || elem.tagName === 'OL') {
            childList = elem
            break
          }
          // 如果兄弟元素中包含ul/ol,也查找它
          const nested = elem.querySelector('ul, ol') as HTMLElement
          if (nested) {
            childList = nested
            break
          }
        }
        sibling = sibling.nextSibling
      }

      // 如果没找到,从父元素查找(用于顶层的情况)
      if (!childList) {
        childList = parent.querySelector('ul, ol') as HTMLElement
      }

      if (childList) {
        const isNodeCollapsed = childList.style.display === 'none'
        childList.style.display = isNodeCollapsed ? 'block' : 'none'

        if (isNodeCollapsed) {
          target.classList.remove('collapsed')
        } else {
          target.classList.add('collapsed')
        }

        // 缓存折叠状态
        const path = target.getAttribute('data-path')
        if (path) {
          collapsedNodes.set(path, !isNodeCollapsed)
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

// 全部折叠/展开 - 优化版，使用分批处理和 CSS class 避免卡顿
function toggleCollapse() {
  if (!jsonOutput.value) return

  const targetState = !isCollapsed.value

  // 使用 CSS class 批量切换，避免逐个修改 style
  if (targetState) {
    jsonOutput.value.classList.add('all-collapsed')
  } else {
    jsonOutput.value.classList.remove('all-collapsed')
  }

  // 更新 toggle 按钮状态 - 使用分批处理避免卡顿
  const toggles = Array.from(jsonOutput.value.querySelectorAll('.json-toggle')) as Element[]
  const batchSize = 200 // 增加批处理大小

  function processBatch(startIndex: number) {
    const endIndex = Math.min(startIndex + batchSize, toggles.length)

    for (let i = startIndex; i < endIndex; i++) {
      if (targetState) {
        toggles[i].classList.add('collapsed')
      } else {
        toggles[i].classList.remove('collapsed')
      }
    }

    if (endIndex < toggles.length) {
      // 使用 requestIdleCallback 或 requestAnimationFrame
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => processBatch(endIndex), { timeout: 50 })
      } else {
        requestAnimationFrame(() => processBatch(endIndex))
      }
    }
  }

  processBatch(0)
  isCollapsed.value = targetState
}

// 清空输入
function clearInput() {
  inputJson.value = ''
  error.value = ''
  formattedJson.value = null
  formattedHtml.value = ''
  decodedResult.value = ''
  base64Result.value = ''

  // 清理性能优化缓存
  collapsedNodes.clear()
  nodeDepth.clear()
}

// 搜索功能 - 执行搜索
function performSearch() {
  if (!jsonOutput.value || !searchQuery.value.trim()) {
    clearSearchHighlights()
    searchMatchCount.value = 0
    currentMatchIndex.value = 0
    return
  }

  const query = searchQuery.value.toLowerCase()

  // 清除之前的高亮
  clearSearchHighlights()

  // 查找所有匹配的元素
  const allElements = jsonOutput.value.querySelectorAll('.json-toggle, .property, .json-literal-string, .json-literal-numeric, .json-literal-boolean, .json-literal, .json-literal-url')
  const matches: Element[] = []

  allElements.forEach((el: Element) => {
    const text = el.textContent?.toLowerCase() || ''
    if (text.includes(query)) {
      el.classList.add('search-match')
      matches.push(el)
    }
  })

  searchMatchCount.value = matches.length
  currentMatchIndex.value = 0

  // 滚动到第一个匹配项
  if (matches.length > 0) {
    scrollToMatch(matches[0])
    matches[0].classList.add('search-current')
  }
}

// 清除搜索高亮
function clearSearchHighlights() {
  if (!jsonOutput.value) return
  jsonOutput.value.querySelectorAll('.search-match').forEach((el: Element) => {
    el.classList.remove('search-match', 'search-current')
  })
}

// 导航搜索结果
function navigateSearch(direction: number) {
  if (!jsonOutput.value || searchMatchCount.value === 0) return

  const matches = jsonOutput.value.querySelectorAll('.search-match')
  if (matches.length === 0) return

  // 移除当前高亮
  matches[currentMatchIndex.value]?.classList.remove('search-current')

  // 计算新索引
  currentMatchIndex.value = (currentMatchIndex.value + direction + matches.length) % matches.length

  // 添加当前高亮并滚动
  const currentMatch = matches[currentMatchIndex.value]
  currentMatch.classList.add('search-current')
  scrollToMatch(currentMatch)

  // 确保父节点展开
  expandParentNodes(currentMatch)
}

// 滚动到匹配项
function scrollToMatch(element: Element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// 展开匹配项的父节点
function expandParentNodes(element: Element) {
  let parent = element.parentElement
  while (parent && parent !== jsonOutput.value) {
    if (parent.tagName === 'UL' || parent.tagName === 'OL') {
      parent.style.display = 'block'
      // 找到对应的 toggle 按钮并移除 collapsed 类
      const prevSibling = parent.previousElementSibling
      if (prevSibling?.classList.contains('json-toggle')) {
        prevSibling.classList.remove('collapsed')
      }
    }
    parent = parent.parentElement
  }
  // 移除全局折叠状态
  if (jsonOutput.value?.classList.contains('all-collapsed')) {
    jsonOutput.value.classList.remove('all-collapsed')
    isCollapsed.value = false
  }
}

// 清除搜索
function clearSearch() {
  searchQuery.value = ''
  searchMatchCount.value = 0
  currentMatchIndex.value = 0
  clearSearchHighlights()
}

// 复制到剪贴板
async function copyToClipboard() {
  let textToCopy = ''

  if (isUrlDecodeMode.value) {
    if (!decodedResult.value) return
    textToCopy = decodedResult.value
  } else if (isBase64Mode.value) {
    if (!base64Result.value) return
    textToCopy = base64Result.value
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
    onInputChange()
  } catch (e) {
    console.error('粘贴失败:', e)
  }
}

// 主题循环切换
function cycleTheme() {
  const themes: Array<'light' | 'dark' | 'hacker'> = ['light', 'dark', 'hacker']
  const currentIndex = themes.indexOf(currentTheme.value)
  currentTheme.value = themes[(currentIndex + 1) % themes.length]
  // 保持 isDarkMode 兼容性
  isDarkMode.value = currentTheme.value !== 'light'
  // 保存到localStorage
  localStorage.setItem('jsonFormatter-theme', currentTheme.value)
}

// 工具栏折叠切换
function toggleToolbar() {
  isToolbarCollapsed.value = !isToolbarCollapsed.value
  localStorage.setItem('jsonFormatter-toolbarCollapsed', isToolbarCollapsed.value.toString())
}

// URL解码模式切换
function toggleUrlDecodeMode() {
  isUrlDecodeMode.value = !isUrlDecodeMode.value
  // 切换模式时清空内容和结果
  inputJson.value = ''
  formattedJson.value = null
  formattedHtml.value = ''
  decodedResult.value = ''
  base64Result.value = ''
  error.value = ''
  flattenStats.value = null
  // URL解码模式下禁用扁平化和Base64
  if (isUrlDecodeMode.value) {
    isFlattenMode.value = false
    isBase64Mode.value = false
  }
  // 保存到localStorage
  localStorage.setItem('jsonFormatter-urlDecodeMode', isUrlDecodeMode.value.toString())
}

// Base64编解码模式切换
function toggleBase64Mode() {
  isBase64Mode.value = !isBase64Mode.value
  // 切换模式时清空内容和结果
  inputJson.value = ''
  formattedJson.value = null
  formattedHtml.value = ''
  decodedResult.value = ''
  base64Result.value = ''
  error.value = ''
  flattenStats.value = null
  // Base64模式下禁用扁平化和URL解码
  if (isBase64Mode.value) {
    isFlattenMode.value = false
    isUrlDecodeMode.value = false
  }
  // 保存到localStorage
  localStorage.setItem('jsonFormatter-base64Mode', isBase64Mode.value.toString())
}

// 扁平化模式切换
function toggleFlattenMode() {
  isFlattenMode.value = !isFlattenMode.value
  // 保存到localStorage
  localStorage.setItem('jsonFormatter-flattenMode', isFlattenMode.value.toString())
  // 重新处理当前JSON
  if (inputJson.value.trim()) {
    onInputChange()
  }
}

// 开始拖拽调整 - 只在松开时应用宽度，拖动过程中只显示指示线
function startResize(event: MouseEvent) {
  isResizing.value = true
  event.preventDefault()
  event.stopPropagation()

  const startX = event.clientX
  const startWidth = leftPanelWidth.value
  let currentDeltaX = 0

  // 获取分界线元素
  const divider = event.currentTarget as HTMLElement

  // 禁用文本选择
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'

  // 拖动期间给面板加优化class
  document.querySelector('.main-content')?.classList.add('resizing')

  function doResize(e: MouseEvent) {
    if (!isResizing.value) return
    e.preventDefault()

    const deltaX = e.clientX - startX
    const minWidth = 200
    const maxWidth = window.innerWidth - 300
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    currentDeltaX = newWidth - startWidth

    // 只移动分界线位置作为视觉反馈，不触发 Vue 响应式更新
    divider.style.transform = `translateX(${currentDeltaX}px)`
  }

  function stopResize() {
    isResizing.value = false

    // 重置分界线的 transform
    divider.style.transform = ''

    // 计算最终宽度并一次性应用
    const finalWidth = Math.max(200, Math.min(window.innerWidth - 300, startWidth + currentDeltaX))
    leftPanelWidth.value = finalWidth

    // 恢复文本选择和光标
    document.body.style.userSelect = ''
    document.body.style.cursor = ''

    // 移除优化class
    document.querySelector('.main-content')?.classList.remove('resizing')

    document.removeEventListener('mousemove', doResize)
    document.removeEventListener('mouseup', stopResize)

    // 保存到localStorage
    localStorage.setItem('jsonFormatter-panelWidth', finalWidth.toString())
  }

  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
}



// 初始化设置
function initializeSettings() {
  // 读取主题设置
  const savedTheme = localStorage.getItem('jsonFormatter-theme') as 'light' | 'dark' | 'hacker' | null
  if (savedTheme && ['light', 'dark', 'hacker'].includes(savedTheme)) {
    currentTheme.value = savedTheme
    isDarkMode.value = savedTheme !== 'light'
  } else {
    // 兼容旧的 darkMode 设置
    const savedDarkMode = localStorage.getItem('jsonFormatter-darkMode')
    if (savedDarkMode === 'true') {
      currentTheme.value = 'dark'
      isDarkMode.value = true
    }
  }

  // 读取工具栏折叠状态
  const savedToolbarCollapsed = localStorage.getItem('jsonFormatter-toolbarCollapsed')
  if (savedToolbarCollapsed !== null) {
    isToolbarCollapsed.value = savedToolbarCollapsed === 'true'
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

  // 读取Base64模式设置
  const savedBase64Mode = localStorage.getItem('jsonFormatter-base64Mode')
  if (savedBase64Mode !== null) {
    isBase64Mode.value = savedBase64Mode === 'true'
  }

  // 读取扁平化模式设置
  const savedFlattenMode = localStorage.getItem('jsonFormatter-flattenMode')
  if (savedFlattenMode !== null) {
    isFlattenMode.value = savedFlattenMode === 'true'
  }
}

// 监听Base64操作模式变化，重新处理输入
watch(base64Operation, () => {
  if (isBase64Mode.value && inputJson.value.trim()) {
    onInputChange()
  }
})

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
  overflow: hidden; /* 防止内容溢出导致body滚动条 */
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, opacity 0.3s ease;
  flex-shrink: 0; /* 防止工具栏被压缩 */
}

.toolbar-hidden {
  display: none; /* 使用display:none完全移除，避免影响布局 */
}

/* 悬浮球样式 */
.floating-ball {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: float 3s ease-in-out infinite;
}

.floating-ball:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.floating-ball:active {
  transform: scale(0.95);
}

.ball-icon {
  font-size: 24px;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.btn-collapse {
  background: #e9ecef;
  color: #495057;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 搜索框样式 */
.search-box {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid #e1e5e9;
}

.search-input {
  width: 180px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #007bff;
}

.search-count {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: center;
}

.btn-search-nav {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
}

.btn-search-nav:hover:not(:disabled) {
  background: #e9ecef;
}

.btn-search-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-search-clear {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #999;
}

.btn-search-clear:hover {
  color: #333;
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
  flex-shrink: 0; /* 防止被压缩 */
}

.panel-header h3 {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

/* Base64切换按钮组 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.base64-switch {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  background: #e9ecef;
  border: 1px solid #dee2e6;
  color: #495057;
  transition: all 0.2s;
}

.btn-small:hover {
  background: #dee2e6;
}

.btn-small.btn-active {
  background: #007bff;
  border-color: #007bff;
  color: white;
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
  min-height: 0; /* 允许flex子项缩小 */
  box-sizing: border-box;
}

.json-input:focus {
  background: #fff;
}

.json-output-container {
  flex: 1;
  overflow: hidden; /* 改为hidden，让内部json-output处理滚动 */
  background: #fafafa;
  min-height: 0; /* 允许flex子项缩小 */
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
  box-sizing: border-box; /* 确保padding不会增加高度 */
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

.stat-flatten {
  color: #28a745;
  font-weight: 600;
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
  /* 性能优化：使用 contain 限制重绘范围 */
  contain: layout style;
}

/* 全部折叠时使用 CSS 批量隐藏，性能更好 */
.json-output.all-collapsed :deep(.json-array),
.json-output.all-collapsed :deep(.json-dict) {
  display: none !important;
}

:deep(.json-array li), :deep(.json-dict li) {
  list-style: none;
  margin: 2px 0;
  /* 性能优化：使用 contain 限制重绘范围 */
  contain: layout style;
}

:deep(li.copyable) {
  background-color: #fff3cd;
  border-radius: 3px;
  padding: 2px 4px;
}

/* 搜索匹配高亮样式 */
:deep(.search-match) {
  background-color: #ffeb3b;
  border-radius: 2px;
  padding: 1px 2px;
}

:deep(.search-current) {
  background-color: #ff9800;
  color: #fff;
  border-radius: 2px;
  padding: 1px 2px;
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

/* 暗夜模式下的搜索框样式 */
.json-formatter.dark-mode .search-box {
  border-left-color: #4a4a4a;
}

.json-formatter.dark-mode .search-input {
  background: #2d2d2d;
  border-color: #4a4a4a;
  color: #d4d4d4;
}

.json-formatter.dark-mode .search-input:focus {
  border-color: #007bff;
}

.json-formatter.dark-mode .search-count {
  color: #9ca3af;
}

.json-formatter.dark-mode .btn-search-nav {
  background: #3c3c3c;
  border-color: #4a4a4a;
  color: #d4d4d4;
}

.json-formatter.dark-mode .btn-search-nav:hover:not(:disabled) {
  background: #484848;
}

.json-formatter.dark-mode .btn-search-clear {
  color: #6a6a6a;
}

.json-formatter.dark-mode .btn-search-clear:hover {
  color: #d4d4d4;
}

/* 暗夜模式下的搜索高亮 */
.json-formatter.dark-mode :deep(.search-match) {
  background-color: #5c4b00;
  color: #fff;
}

.json-formatter.dark-mode :deep(.search-current) {
  background-color: #ff9800;
  color: #000;
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

.json-formatter.dark-mode .btn-collapse {
  background: #3c3c3c;
  color: #d4d4d4;
}

/* 暗夜模式下的btn-small */
.json-formatter.dark-mode .btn-small {
  background: #3c3c3c;
  border-color: #4a4a4a;
  color: #d4d4d4;
}

.json-formatter.dark-mode .btn-small:hover {
  background: #4a4a4a;
}

.json-formatter.dark-mode .btn-small.btn-active {
  background: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

/* 暗夜模式下的悬浮球 */
.json-formatter.dark-mode .floating-ball {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.json-formatter.dark-mode .floating-ball:hover {
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
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

/* ========== 黑客主题样式 (Hacker Mode) ========== */
.json-formatter.hacker-mode {
  background: #17202a;
  color: #43d397;
}

.json-formatter.hacker-mode .toolbar {
  background: #1a252f;
  border-bottom-color: #2c3e50;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.json-formatter.hacker-mode .panel-header {
  background: #1a252f;
  border-bottom-color: #2c3e50;
  color: #43d397;
}

.json-formatter.hacker-mode .panel-header h3 {
  color: #43d397;
}

.json-formatter.hacker-mode .input-panel,
.json-formatter.hacker-mode .output-panel {
  background: #17202a;
}

.json-formatter.hacker-mode .json-input {
  background: #17202a;
  color: #43d397;
  font-weight: bold;
  line-height: 1.8;
}

.json-formatter.hacker-mode .json-input::placeholder {
  color: #2ecc71;
  opacity: 0.5;
}

.json-formatter.hacker-mode .json-input:focus {
  background: #1a252f;
}

.json-formatter.hacker-mode .json-output-container {
  background: #17202a;
}

.json-formatter.hacker-mode .json-output {
  background: #17202a;
  color: #43d397;
  font-weight: bold;
  line-height: 1.8;
}

.json-formatter.hacker-mode .placeholder {
  color: #2ecc71;
  opacity: 0.6;
}

.json-formatter.hacker-mode .divider-handle {
  background: #2c3e50;
}

.json-formatter.hacker-mode .divider.resizable:hover {
  background: rgba(67, 211, 151, 0.1);
}

.json-formatter.hacker-mode .divider-dots span {
  background: #43d397;
}

.json-formatter.hacker-mode .btn {
  background: #1a252f;
  color: #43d397;
  border: 1px solid #2c3e50;
}

.json-formatter.hacker-mode .btn:hover:not(:disabled) {
  background: #2c3e50;
  border-color: #43d397;
}

.json-formatter.hacker-mode .btn-secondary {
  background: #1a252f;
  color: #43d397;
}

.json-formatter.hacker-mode .btn-secondary:hover {
  background: #2c3e50;
}

.json-formatter.hacker-mode .btn-theme {
  background: #27ae60;
  border: none;
  color: #17202a;
}

.json-formatter.hacker-mode .btn-theme:hover {
  background: #2ecc71;
}

.json-formatter.hacker-mode .btn-active {
  background: #27ae60;
  border: none;
  color: #17202a;
}

.json-formatter.hacker-mode .btn-active:hover {
  background: #2ecc71;
}

.json-formatter.hacker-mode .btn-collapse {
  background: #1a252f;
  color: #43d397;
}

/* 黑客主题下的btn-small */
.json-formatter.hacker-mode .btn-small {
  background: #1a252f;
  border-color: #2c3e50;
  color: #43d397;
}

.json-formatter.hacker-mode .btn-small:hover {
  background: #2c3e50;
}

.json-formatter.hacker-mode .btn-small.btn-active {
  background: #27ae60;
  border-color: #27ae60;
  color: #17202a;
}

.json-formatter.hacker-mode .checkbox-label {
  color: #43d397;
}

/* 黑客主题下的搜索框样式 */
.json-formatter.hacker-mode .search-box {
  border-left-color: #2c3e50;
}

.json-formatter.hacker-mode .search-input {
  background: #1a252f;
  border-color: #2c3e50;
  color: #43d397;
}

.json-formatter.hacker-mode .search-input::placeholder {
  color: #2ecc71;
  opacity: 0.5;
}

.json-formatter.hacker-mode .search-input:focus {
  border-color: #43d397;
}

.json-formatter.hacker-mode .search-count {
  color: #43d397;
}

.json-formatter.hacker-mode .btn-search-nav {
  background: #1a252f;
  border-color: #2c3e50;
  color: #43d397;
}

.json-formatter.hacker-mode .btn-search-nav:hover:not(:disabled) {
  background: #2c3e50;
}

.json-formatter.hacker-mode .btn-search-clear {
  color: #43d397;
  opacity: 0.6;
}

.json-formatter.hacker-mode .btn-search-clear:hover {
  opacity: 1;
}

/* 黑客主题下的搜索高亮 */
.json-formatter.hacker-mode :deep(.search-match) {
  background-color: #27ae60;
  color: #17202a;
}

.json-formatter.hacker-mode :deep(.search-current) {
  background-color: #2ecc71;
  color: #17202a;
}

.json-formatter.hacker-mode .url-decode-content {
  color: #43d397;
}

.json-formatter.hacker-mode .stats {
  color: #43d397;
  opacity: 0.8;
}

.json-formatter.hacker-mode .stat-flatten {
  color: #2ecc71;
}

.json-formatter.hacker-mode .error-message {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
  color: #e74c3c;
}

/* 黑客主题下的JSON语法高亮 */
.json-formatter.hacker-mode :deep(.json-literal-string) {
  color: #58d68d;
}

.json-formatter.hacker-mode :deep(.json-literal-numeric) {
  color: #5dade2;
}

.json-formatter.hacker-mode :deep(.json-literal-boolean) {
  color: #f39c12;
}

.json-formatter.hacker-mode :deep(.json-literal) {
  color: #9b59b6;
}

.json-formatter.hacker-mode :deep(.json-literal-url) {
  color: #3498db;
}

.json-formatter.hacker-mode :deep(.property) {
  color: #4fdee5;
  font-weight: bold;
}

.json-formatter.hacker-mode :deep(.json-toggle) {
  color: #2ecc71;
}

.json-formatter.hacker-mode :deep(.json-toggle:hover) {
  color: #58d68d;
}

.json-formatter.hacker-mode :deep(li.copyable) {
  background-color: rgba(67, 211, 151, 0.15);
}

/* 黑客主题下的节点计数 */
.json-formatter.hacker-mode :deep(.json-count) {
  color: #43d397;
  opacity: 0.6;
}

/* 黑客主题下的加载更多按钮 */
.json-formatter.hacker-mode :deep(.btn-load-more) {
  background: #1a252f;
  border-color: #2c3e50;
  color: #43d397;
}

.json-formatter.hacker-mode :deep(.btn-load-more:hover) {
  background: #2c3e50;
  border-color: #43d397;
}

/* 黑客主题下的悬浮球 */
.json-formatter.hacker-mode .floating-ball {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
}

.json-formatter.hacker-mode .floating-ball:hover {
  box-shadow: 0 6px 20px rgba(46, 204, 113, 0.6);
}

/* 拖动分界线期间的性能优化 */
.main-content.resizing {
  cursor: col-resize;
}

.main-content.resizing .output-panel,
.main-content.resizing .input-panel {
  pointer-events: none;
}

/* 拖动时分界线样式 */
.main-content.resizing .divider.resizable {
  background: rgba(0, 123, 255, 0.3);
  z-index: 100;
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