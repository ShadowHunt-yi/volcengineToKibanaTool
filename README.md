# 517工具 Vue重构版

基于 Vue 3 + TypeScript + Vite 构建的 Chrome 扩展，用于火山引擎控制台日志快速跳转和 JSON 格式化工具。

## 特性

### 日志跳转

- **应用自动检测** - 自动识别火山引擎控制台中的当前应用（酒店_H5、机票_H5 等）
- **索引映射** - 根据应用名称自动匹配 Kibana 索引（Hotel / JP / Middle / Train / Gateway / Nginx / CLYH 共 7 种）
- **会话跳转** - 从会话详情页一键跳转到 Kibana 后端日志，自动提取 session_id / user_id / trackId
- **时间范围计算** - 根据会话时间自动计算日志查询的时间区间
- **多索引查询** - 支持同时选择多个索引进行日志查询

### JSON 格式化工具

- **实时格式化** - 输入即解析，支持语法错误提示
- **深度解析** - 自动递归展开嵌套的 JSON 字符串（如接口返回的转义 JSON），支持最大 10MB
- **三种主题** - 亮色 / 暗夜 / 黑客（绿色终端风格）主题切换
- **URL 解码** - 一键解码 URL 编码字符串
- **Base64 编解码** - 支持 UTF-8 中文的 Base64 编码与解码
- **扁平化模式** - 将嵌套 JSON 结构展平为键值对形式
- **搜索定位** - 在格式化结果中搜索字段名或值，支持上下导航
- **节点折叠** - 可逐个或全部折叠/展开 JSON 节点
- **面板拖拽** - 左右面板可拖动分界线调整宽度，大数据量下做了防卡顿优化
- **悬浮球** - 工具栏可收起为悬浮球，节省屏幕空间
- **状态持久化** - 主题、面板宽度、工具栏状态等自动保存到 localStorage

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| 语言 | TypeScript 5.2+ |
| 构建 | Vite 5 + vite-plugin-web-extension |
| 状态管理 | Pinia |
| 扩展标准 | Chrome Extension Manifest V3 |
| 包管理 | pnpm |

## 项目结构

```
src/
├── components/
│   ├── IndexSelectModal.vue      # 索引选择模态框（RISON 编码、Kibana URL 生成）
│   └── JsonFormatter.vue         # JSON 格式化工具（主体组件）
├── content/
│   ├── content.ts                # Content Script（Vue 驱动，DOM 监听与会话提取）
│   └── inject.ts                 # 注入脚本（页面上下文通信）
├── background/
│   └── background.ts             # Service Worker（消息分发、扩展图标点击处理）
├── devtools/
│   ├── devtools.html             # DevTools 面板入口
│   └── devtools.ts               # DevTools 集成
├── pages/
│   ├── JsonFormatter.html        # JSON 格式化工具 HTML 入口
│   ├── JsonFormatter.ts          # Vue 应用挂载点
│   └── JsonFormatter.vue         # 格式化页面包装组件
├── types/
│   └── index.ts                  # 类型定义（SessionInfo / AppInfo / FieldMapping）
├── config.js                     # 配置文件（索引定义、Kibana URL、应用映射规则）
└── manifest.json                 # Chrome Extension Manifest V3
```

## 开发

### 前置要求

- Node.js >= 18
- pnpm >= 8

### 安装与运行

```bash
# 安装依赖
pnpm install

# 开发模式（热更新）
pnpm dev

# 构建扩展
pnpm build:extension

# 类型检查
pnpm type-check
```

### 加载到 Chrome

1. 运行 `pnpm build:extension`
2. 打开 `chrome://extensions/`，开启开发者模式
3. 点击"加载已解压的扩展程序"，选择 `dist/` 目录

## 配置

### 索引配置

在 `src/config.js` 中管理索引定义：

```javascript
indexes: {
  hotel: {
    id: "hotel-index-id",
    name: "酒店",
    description: "clyh-hotel-*"
  }
}
```

### 应用映射

通过正则匹配应用名称到索引：

```javascript
const appNamePatterns = [
  { pattern: /酒店|hotel/i, index: 'hotel' },
  { pattern: /机票|flight|jp/i, index: 'jp' },
  { pattern: /火车|train/i, index: 'train' }
]
```

默认使用 Middle 索引。

### Kibana 地址

```
https://pallognew.517la.com/s/517na/app/kibana#/discover
```

## 调试

在火山引擎控制台页面的浏览器 DevTools Console 中可使用：

```javascript
tool517CheckFunctions()   // 检查应用检测状态
tool517FullTest()         // 完整流程测试
tool517RefreshApp()       // 手动刷新应用信息
```

## 发布

### 自动发布（GitHub Actions）

推送版本标签即可触发自动构建和发布：

```bash
git tag -a v2.5.1 -m "版本描述"
git push origin v2.5.1
```

GitHub Actions 会自动：
1. 构建扩展
2. 打包 `dist/` 为 ZIP
3. 创建 GitHub Release 并上传产物

前往 [Releases](../../releases) 页面下载最新版本。

### 手动发布

```bash
pnpm build:extension
# 将 dist/ 目录打包为 ZIP 上传到 Chrome Web Store
```

## 更新日志

### v2.5.1
- 修复大型嵌套 JSON 解析失败（将嵌套字符串长度限制从 1MB 提升至 10MB）
- 修复粘贴内容后不自动触发解析的问题
- 优化拖动分界线在大数据量下的卡顿（requestAnimationFrame 节流 + CSS contain 隔离重排）

### v2.5.0
- 新增 Base64 编解码功能，支持 UTF-8 中文
- 黑客主题属性名颜色调整为青色（#4fdee5）
- URL 解码、Base64、扁平化模式自动互斥切换

### v2.4.0
- 悬浮球工具栏（可收起/展开）
- 新增黑客主题（深色背景 + 绿色文字）
- 三主题循环切换（亮色 / 暗夜 / 黑客）
- 修复 JSON 解析后页面高度溢出问题
- 工具栏折叠状态和主题设置持久化

### v2.3.2
- 修复大数据 JSON 解析卡顿问题

### v2.3.1
- Bug 修复

### v2.3.0
- 增加跳转网关耗时统计

### v2.2.1
- TrackId 筛选功能

### v2.2.0
- 增加 HTTP 请求中提取 TrackId

### v2.1.1
- 修复 gateway 筛选字段

### v2.1.0
- 修复 DOM 变化问题，精简打印信息

### v2.0.0
- 完全使用 Vue 3 + TypeScript 重构
- 引入 Pinia 状态管理
- 组件化 UI 设计
- Vite 构建工具

### v1.x
- 基础的应用检测和索引跳转功能（原生 JavaScript）

## 贡献

1. Fork 项目
2. 创建分支：`git checkout -b feature/xxx`
3. 提交更改：`git commit -am 'feat: 描述'`
4. 推送：`git push origin feature/xxx`
5. 提交 Pull Request

## 许可证

MIT License
