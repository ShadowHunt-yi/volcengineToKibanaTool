 // 517工具配置文件 (Vue版本)
window.Tool517Config = {
    // 索引配置 - 枚举值到索引ID的映射
    indexes: {
      hotel: {
        id: "12f35f00-04e7-11ee-8cc6-c323e0969251",
        name: "Hotel索引",
        description: "clyh-hotel-*",
        fieldMapping: {
          sessionId: "origin",
          userId: "staffID",
          trackId: "trackID"
        }
      },
      jp: {
        id: "4be5d210-a8e3-11ef-8767-8dbabe23815c",
        name: "JP索引",
        description: "clyh-jp-*",
        fieldMapping: {
          sessionId: "origin",
          userId: "staffID",
          trackId: "trackID"
        }
      },
      middle: {
        id: "00db24f0-0f56-11ee-8720-5bf2036a9e1a",
        name: "Middle索引",
        description: "clyh-middle-*",
        fieldMapping: {
          sessionId: "origin",
          userId: "staffID",
          trackId: "trackID"
        }
      },
      train: {
        id: "68deb330-aab2-11ee-9729-87586cd9b207",
        name: "Train索引",
        description: "clyh-train-*",
        fieldMapping: {
          sessionId: "origin",
          userId: "staffID",
          trackId: "trackID"
        }
      },
      gateway: {
        id: "acb91290-eba6-11ea-9f34-0d8763467285",
        name: "Gateway索引",
        description: "gateway-*",
        fieldMapping: {
          sessionId: "RequestHeader.la517-session-id",
          userId: null,  // Gateway不筛选user_id
          trackId: "RequestHeader.517trackID"
        }
      },
      nginx: {
        id: "4d2fda50-df0e-11eb-bea5-cb68c938a0cc",
        name: "Nginx索引",
        description: "nginx*",
        fieldMapping: {
          sessionId: "origin",
          userId: "staffID",
          trackId: "trackID"
        }
      },
      clyh: {
        id: "11a318b0-fd26-11ee-b9c9-1770fb731a66",
        name: "CLYH索引",
        description: "clyh-*",
        fieldMapping: {
          sessionId: "origin",
          userId: "staffID",
          trackId: "trackID"
        }
      }
    },
  
    // 监控应用对应的默认索引配置
    appDefaultIndexes: {
      "console.volcengine.com": "clyh",
      urlPatterns: {
        "/hotel/": "hotel",
        "/acc/": "acc"
      }
    },
  
    // 时间配置
    timeConfig: {
      sessionTimeRange: 1,
      defaultTimeRange: "now-4h,now"
    },
  
    // Kibana配置
    kibana: {
      baseUrl: "https://pallognew.517la.com/s/517na/app/kibana#/discover",
      fieldMapping: {
        sessionId: "origin",
        userId: "staffID"
      }
    },
  
    // 获取当前页面的默认索引
    getCurrentDefaultIndex() {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      const appName = this.getApplicationName();
      if (appName) {
        const indexByApp = this.getIndexByApplicationName(appName);
        if (indexByApp) {
          return indexByApp;
        }
      }
      
      for (const [pattern, indexKey] of Object.entries(this.appDefaultIndexes.urlPatterns)) {
        if (pathname.includes(pattern)) {
          return indexKey;
        }
      }
      
      return this.appDefaultIndexes[hostname] || "clyh";
    },
  
    // 获取应用名称
    getApplicationName() {
      // 1. 先通过特定的容器类名定位应用选择器
      const appContainers = [
        '.HeaderProductSelect__Root-dllHHe',
        '.header-product-select'
      ];
      
      for (const containerSelector of appContainers) {
        const container = document.querySelector(containerSelector);
        if (container) {
          // 查找包含flex布局的div
          const valueContainer = container.querySelector('.arco-select-view-value');
          if (valueContainer) {
            // 查找flex布局容器
            const flexDiv = valueContainer.querySelector('div[style*="display: flex"]');
            if (flexDiv && flexDiv.children.length >= 2) {
              // 第一个子元素是蓝色标签（包含"应用"文本）
              const labelDiv = flexDiv.children[0];
              // 第二个子元素是应用名称
              const appNameDiv = flexDiv.children[1];
              
              // 验证第一个元素包含"应用"文本
              if (labelDiv && labelDiv.textContent?.trim() === '应用') {
                const appName = appNameDiv?.textContent?.trim();
                if (appName && appName.length > 1 && !appName.includes('请选择')) {
                  return appName;
                }
              }
            }
          }
        }
      }
      
      // 2. 备用方案：查找所有包含"应用"标签的flex布局
      const allFlexDivs = document.querySelectorAll('.arco-select-view-value div[style*="display: flex"]');
      for (const flexDiv of allFlexDivs) {
        if (flexDiv.children.length >= 2) {
          const labelDiv = flexDiv.children[0];
          const appNameDiv = flexDiv.children[1];
          
          const labelText = labelDiv?.textContent?.trim();
          if (labelText === '应用') {
            const appName = appNameDiv?.textContent?.trim();
            if (appName && appName.length > 1 && !appName.includes('请选择') && !appName.includes('北京')) {
              return appName;
            }
          }
        }
      }
      
      return null;
    },
  
    // 根据应用名称获取对应的索引
    getIndexByApplicationName(appName) {
      if (!appName) return null;
      
      const appNamePatterns = [
        { pattern: /酒店|hotel/i, index: 'hotel' },
        { pattern: /机票|flight|jp/i, index: 'jp' },
        { pattern: /火车|train/i, index: 'train' }
      ];
      
      for (const rule of appNamePatterns) {
        if (rule.pattern.test(appName)) {
          return rule.index;
        }
      }
      
      return 'middle';
    },
  
    // 获取索引配置
    getIndex(indexKey) {
      return this.indexes[indexKey] || this.indexes.hotel;
    },
  
    // 获取所有可用的索引选项
    getAvailableIndexes() {
      return Object.entries(this.indexes).map(([key, config]) => ({
        key: key,
        id: config.id,
        name: config.name,
        description: config.description,
        displayText: `${config.name} (${config.description})`
      }));
    },
  
    // 验证索引配置
    validateConfig() {
      const issues = [];
      
      for (const [key, config] of Object.entries(this.indexes)) {
        if (!config.id || !config.name) {
          issues.push(`索引 ${key} 缺少必要的配置项`);
        }
        if (config.id.includes("HERE")) {
          issues.push(`索引 ${key} 的ID需要配置实际值: ${config.id}`);
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues: issues
      };
    }
  };