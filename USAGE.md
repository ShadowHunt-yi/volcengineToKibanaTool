# 517工具Vue版 - 使用指南

## 🚀 开始使用

### 1. 安装依赖

```bash
cd vueDir
npm install
```

### 2. 开发模式

```bash
# 启动开发服务器（热更新）
npm run dev

# 构建开发版本
npm run build:dev
```

### 3. 生产构建

```bash
# 构建生产版本
npm run buildon

# 预览构建结果
npm run preview
```

### 4. 安装扩展

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `vueDir/dist` 文件夹

## 📖 功能使用

### 主要功能

#### 1. 自动应用检测
- 插件会自动检测当前页面的应用名称
- 支持酒店、机票、火车票等不同业务线
- 实时显示检测状态和结果

#### 2. 索引选择模态框
![模态框示例](docs/modal-demo.png)

**使用步骤：**
1. 在火山引擎控制台页面，查找带有session_id和user_id的元素
2. 插件会自动创建"跳转到后端日志"按钮
3. 点击按钮打开索引选择模态框
4. 选择合适的索引（自动根据应用预选）
5. 点击"跳转"或"复制URL"

#### 3. 应用状态指示器
- 实时显示当前应用检测状态
- 可手动刷新应用信息
- 支持错误状态显示和重试

#### 4. 扩展弹窗
点击扩展图标查看：
- 当前页面状态
- 工具激活状态
- 调试信息（开启调试模式）

### Vue组件化特性

#### 响应式UI
- 所有界面元素都是Vue组件
- 支持动画过渡效果
- 自动响应数据变化

#### 状态管理
- 使用Pinia进行全局状态管理
- 应用信息、会话信息统一管理
- 支持状态持久化

#### 类型安全
- 完整的TypeScript类型定义
- 编译时类型检查
- 更好的开发体验

## 🔧 调试功能

### 全局调试函数
在控制台中可以使用以下调试函数：

```javascript
// 调试应用检测
tool517DebugApp()

// 刷新应用信息
tool517RefreshApp()

// 检查函数状态
tool517CheckFunctions()

// 完整测试
tool517FullTest()
```

### Vue开发工具
1. 安装Vue DevTools浏览器扩展
2. 在开发模式下可以查看组件状态
3. 实时调试Pinia store数据

### 调试模式
1. 点击扩展弹窗中的"开启调试模式"
2. 查看详细的运行状态信息
3. 获取更多调试输出

## 📱 界面说明

### 1. 索引选择模态框

```vue
<IndexSelectModal
  :visible="true"
  :session-info="sessionInfo"
  :available-indexes="indexes"
  :current-app-name="appName"
  :default-index-key="defaultIndex"
  @close="closeModal"
  @jump="handleJump"
  @copy="handleCopy"
/>
```

**功能：**
- 会话信息展示
- 多索引选择（支持Ctrl+多选）
- 自动预选默认索引
- 复制URL到剪贴板
- 直接跳转到Kibana

### 2. 应用状态指示器

```vue
<AppStatusIndicator
  :app-info="currentApp"
  :is-loading="loading"
  :error="errorMessage"
  @refresh="refreshApp"
  @close="closeIndicator"
/>
```

**功能：**
- 应用名称显示
- 检测状态指示
- 错误信息提示
- 手动刷新按钮

### 3. 扩展弹窗

**功能：**
- 当前页面信息
- 工具状态显示
- 快捷操作按钮
- 调试信息面板

## 🎯 使用场景

### 场景1：日常问题排查
1. 用户反馈问题，提供session_id
2. 打开对应的火山引擎控制台页面
3. 插件自动检测应用并创建按钮
4. 点击按钮，选择合适索引
5. 跳转到Kibana查看日志

### 场景2：开发调试
1. 开启调试模式查看应用检测过程
2. 使用`tool517DebugApp()`排查检测问题
3. 手动刷新应用信息测试不同页面

### 场景3：跨团队协作
1. 复制Kibana URL分享给其他同事
2. 确保索引选择正确，避免权限问题
3. 利用时间范围筛选精确定位问题

## ⚙️ 配置说明

### 索引配置
插件从 `config.js` 读取索引配置：

```javascript
Tool517Config = {
  indexes: {
    hotel: {
      id: "12f35f00-04e7-11ee-8cc6-c323e0969251",
      name: "Hotel索引",
      description: "clyh-hotel-*"
    },
    // ... 其他索引
  },
  
  // 应用到索引的映射
  appDefaultIndexes: {
    "酒店_H5": "hotel",
    "机票_H5": "jp",
    // ... 其他映射
  }
}
```

### 自定义配置
可以修改 `src/config.js` 来：
- 添加新的索引类型
- 调整应用检测规则
- 修改默认时间范围
- 更新Kibana基础URL

## ❓ 常见问题

### Q: 插件没有检测到应用怎么办？
A: 
1. 检查页面是否为火山引擎控制台
2. 使用 `tool517DebugApp()` 查看检测过程
3. 手动点击 `tool517RefreshApp()` 重新检测

### Q: 模态框没有显示怎么办？
A: 
1. 确认页面有session_id和user_id信息
2. 检查控制台是否有错误信息
3. 尝试刷新页面重新加载插件

### Q: 跳转的Kibana链接访问不了？
A: 
1. 检查网络连接和VPN
2. 确认选择的索引有访问权限
3. 验证时间范围设置是否合理

### Q: 开发时热更新不生效？
A: 
1. 确认运行了 `npm run dev`
2. 在Chrome扩展页面点击刷新按钮
3. 重新加载目标页面

## 🔄 版本更新

### 更新扩展
1. 拉取最新代码
2. 运行 `npm run build`
3. 在Chrome扩展页面点击刷新

### 开发新功能
1. 在对应的Vue组件中添加功能
2. 更新TypeScript类型定义
3. 测试功能正常后构建部署

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 编写Vue组件和测试
4. 提交Pull Request

---

> 💡 **提示**: 这个Vue版本完全摒弃了原版本的手写DOM方式，采用现代化的Vue组件架构，提供更好的开发体验和用户体验。 