# 517工具 Vue重构版

这是517工具的Vue TypeScript重构版本，提供现代化的开发体验和更好的代码组织。

## 🚀 特性

- **Vue 3** + **TypeScript** + **Vite** 现代化技术栈
- **Pinia** 状态管理
- **Chrome扩展V3** 支持
- **完整的类型定义** 和 **智能提示**
- **组件化开发** 和 **响应式设计**
- **热更新** 开发体验

## 📦 项目结构

```
vueDir/
├── src/
│   ├── types/           # TypeScript类型定义
│   ├── config/          # 配置文件
│   ├── stores/          # Pinia状态管理
│   ├── components/      # Vue组件
│   ├── content/         # Content Scripts
│   ├── background/      # Background Script
│   ├── popup/           # 扩展弹窗
│   ├── panel/           # DevTools面板
│   └── manifest.json    # 扩展清单
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🛠️ 开发环境设置

### 前置要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
cd vueDir
npm install
```

### 开发模式

```bash
# 启动开发服务器（热更新）
npm run dev

# 构建扩展
npm run build:extension
```

### 加载扩展

1. 构建项目：`npm run build:extension`
2. 打开Chrome扩展管理页面：`chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `vueDir/dist` 目录

## 🔧 核心功能

### 1. 应用检测
- 自动检测火山引擎控制台中的当前应用
- 支持"酒店_H5"、"机票_H5"等应用识别
- 实时更新应用状态

### 2. 索引映射
- 根据应用名称自动匹配对应的Kibana索引
- 支持7种索引类型：Hotel、JP、Middle、Train、Gateway、Nginx、CLYH
- 可配置的映射规则

### 3. 会话跳转
- 从会话详情页面一键跳转到后端日志
- 自动提取session_id和user_id
- 智能时间范围计算

### 4. Vue组件化
- `IndexSelectModal.vue` - 索引选择模态框
- 响应式设计，支持多选索引
- 优雅的错误处理和用户反馈

## 📋 开发指南

### 添加新索引

在 `src/config.js` 中添加新的索引配置：

```javascript
indexes: {
  newIndex: {
    id: "your-index-id",
    name: "新索引",
    description: "new-index-*"
  }
}
```

### 添加应用映射

在 `getIndexByApplicationName` 方法中添加新的映射规则：

```javascript
const appNamePatterns = [
  { pattern: /新应用|newapp/i, index: 'newIndex' }
]
```

### 修改UI组件

所有Vue组件都在 `src/components/` 目录下，支持：
- TypeScript类型检查
- Vue 3 Composition API
- 响应式数据绑定
- 组件化CSS样式

## 🔍 调试工具

在浏览器控制台中可以使用以下调试命令：

```javascript
// 检查应用检测状态
tool517CheckFunctions()

// 完整流程测试
tool517FullTest()

// 手动刷新应用信息
tool517RefreshApp()
```

## 🚀 部署

### 构建生产版本

```bash
npm run build:extension
```

构建产物在 `dist/` 目录中，包含：
- `manifest.json` - 扩展清单
- `content.js` - 内容脚本
- `background.js` - 后台脚本
- `inject.js` - 注入脚本
- `config.js` - 配置文件
- `assets/` - 资源文件

### 自动发布 (GitHub Actions)

本项目配置了 GitHub Actions 自动发布工作流：

1. **创建并推送标签**：
   ```bash
   git tag v2.4.0
   git push origin v2.4.0
   ```

2. **自动触发构建**：
   - GitHub Actions 自动运行构建流程
   - 自动打包 `dist/` 目录为 ZIP 文件
   - 自动创建 GitHub Release 并上传产物

3. **下载安装**：
   - 前往 [Releases](../../releases) 页面下载最新版本
   - 解压后在 Chrome 中加载扩展

### Chrome Web Store发布

1. 将 `dist/` 目录打包为 `.zip` 文件
2. 在Chrome Web Store开发者控制台上传
3. 填写扩展信息和描述
4. 提交审核

## 🔄 从旧版本迁移

本Vue版本完全重构，采用现代化Vue组件架构：

- ✅ **Vue组件化**: 完全摒弃手写DOM，使用Vue组件
- ✅ **TypeScript类型安全**: 全面的类型定义和检查
- ✅ **Pinia状态管理**: 响应式状态管理和数据流
- ✅ **组件化UI**: 模态框、状态指示器等全部Vue组件化
- ✅ **增强的用户体验**: 动画过渡、加载状态、错误处理
- ✅ **现代化架构**: 完全脱离jQuery思维，拥抱现代前端开发

### 重构亮点

1. **完全组件化**: 
   - `IndexSelectModal.vue` - 索引选择模态框
   - `AppStatusIndicator.vue` - 应用状态指示器
   - `PopupApp.vue` - 扩展弹窗

2. **Vue化的Content Script**:
   - 不再手写DOM字符串
   - 使用Vue组件管理UI状态
   - 响应式数据绑定

3. **现代化工具链**:
   - Vite构建工具
   - Vue 3 Composition API
   - TypeScript类型检查
   - 热更新开发体验

## 📝 更新日志

### v2.4.0 (UI增强版)
- 🎨 **悬浮球工具栏**: 工具栏支持收起为悬浮球，节省屏幕空间
- 🖤 **黑客主题**: 新增黑客风格主题（深色背景 + 绿色文字）
- 🎭 **三主题切换**: 亮色/暗夜/黑客 三种主题循环切换
- 🔧 **布局优化**: 修复JSON解析后页面高度溢出问题
- 💾 **状态持久化**: 工具栏折叠状态和主题设置自动保存

### v2.3.2
- 🚀 修复大数据JSON解析卡顿问题

### v2.3.1
- 🔧 修复问题

### v2.3.0
- ⏱️ 增加跳转网关耗时统计

### v2.2.1
- 🔍 TrackId筛选功能

### v2.2.0
- 📋 增加HTTP请求中提取TrackId

### v2.1.1
- 🔧 修复gateway筛选字段

### v2.1.0
- 🔧 修复DOM变化问题，精简打印信息

### v2.0.0 (Vue重构版)
- 🎉 完全使用Vue 3 + TypeScript重构
- 🔧 引入Pinia状态管理
- 🎨 组件化UI设计
- 🚀 Vite构建工具
- 💪 完整的类型定义
- 🔍 增强的调试功能

### v1.x (原版本)
- 基础的应用检测和索引跳转功能
- JavaScript实现

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 📄 许可证

MIT License

## 🙋‍♂️ 支持

如有问题或建议，请在项目中提交Issue。 