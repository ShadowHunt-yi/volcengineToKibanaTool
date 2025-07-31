# 🚀 快速开始

## 10秒快速体验

```bash
# 1. 进入项目目录
cd vueDir

# 2. 安装依赖
npm install

# 3. 构建扩展
npm run build

# 4. 安装扩展到Chrome
# 打开 chrome://extensions/ -> 开发者模式 -> 加载已解压的扩展程序 -> 选择 dist 文件夹
```

## ✨ 主要变化

### 🔥 全面Vue化
- ❌ **原版**: 手写DOM字符串 `innerHTML = "<div>..."`
- ✅ **Vue版**: 组件化开发 `<IndexSelectModal />`

### 🎯 架构对比

| 原版本 | Vue版本 |
|--------|---------|
| 手写DOM | Vue组件 |
| 硬编码配置 | 动态配置 |
| 原生JS | TypeScript |
| 无状态管理 | Pinia状态管理 |
| 内联样式 | Vue单文件组件 |

### 📁 文件结构

```
vueDir/
├── src/
│   ├── App.vue                 # 主应用组件
│   ├── main.ts                 # Vue应用入口
│   ├── components/             # Vue组件
│   │   ├── IndexSelectModal.vue    # 索引选择模态框
│   │   └── AppStatusIndicator.vue  # 状态指示器
│   ├── stores/                 # Pinia状态管理
│   │   └── appStore.ts
│   ├── content/                # 内容脚本
│   │   ├── content.ts              # Vue化的内容脚本
│   │   └── inject.ts               # 注入脚本
│   ├── popup/                  # 扩展弹窗
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── PopupApp.vue
│   └── types/                  # TypeScript类型
│       └── index.ts
├── dist/                       # 构建输出
├── package.json               
├── vite.config.ts             # Vite配置
└── README.md                  # 详细文档
```

## 💡 使用示例

### 1. 模态框组件使用

```vue
<template>
  <IndexSelectModal
    :visible="showModal"
    :session-info="{ sessionId: 'xxx', userId: 'yyy' }"
    :available-indexes="indexes"
    :current-app-name="'酒店_H5'"
    :default-index-key="'hotel'"
    @close="showModal = false"
    @jump="handleJump"
    @copy="handleCopy"
  />
</template>
```

### 2. 状态管理使用

```typescript
import { useAppStore } from '@/stores/appStore'

const appStore = useAppStore()

// 获取当前应用
const currentApp = appStore.currentApp

// 刷新应用信息
await appStore.refreshAppInfo()

// 设置默认索引
const defaultIndex = appStore.defaultIndexKey
```

### 3. 全局调试函数

```javascript
// 浏览器控制台中使用
tool517DebugApp()    // 调试应用检测
tool517RefreshApp()  // 刷新应用信息
tool517FullTest()    // 完整功能测试
```

## 🎨 开发体验提升

### TypeScript类型安全
```typescript
interface SessionInfo {
  sessionId: string
  userId: string
  time?: string
}

interface AppInfo {
  name: string
  indexType: string
}
```

### 响应式数据
```typescript
const appStore = useAppStore()

// 自动响应数据变化
const isLoading = computed(() => appStore.isLoading)
const hasError = computed(() => !!appStore.error)
```

### 组件化UI
```vue
<template>
  <!-- 自动显示/隐藏，响应式更新 -->
  <div v-if="isLoading" class="loading">
    检测中...
  </div>
  
  <!-- 状态驱动的UI -->
  <button 
    :disabled="!canSubmit"
    @click="handleSubmit"
  >
    {{ submitText }}
  </button>
</template>
```

## 🔧 开发命令

```bash
# 开发模式（热更新）
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 构建开发版本
npm run build:dev

# 预览构建结果
npm run preview
```

## 🎯 核心优势

1. **开发体验**: Vite热更新 + TypeScript + Vue DevTools
2. **代码质量**: 组件化 + 类型安全 + 状态管理
3. **用户体验**: 动画过渡 + 响应式UI + 错误处理
4. **维护性**: 模块化架构 + 清晰的职责分离

---

> 💡 这个Vue版本代表了从传统DOM操作到现代前端框架的完全转变，提供了更好的开发体验和用户体验。 