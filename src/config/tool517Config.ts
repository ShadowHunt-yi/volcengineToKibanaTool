import type { Tool517Config, IndexConfig, AvailableIndex, AppNamePattern } from '@/types'

const indexes: Record<string, IndexConfig> = {
  hotel: {
    id: "12f35f00-04e7-11ee-8cc6-c323e0969251",
    name: "Hotel索引",
    description: "clyh-hotel-*"
  },
  jp: {
    id: "4be5d210-a8e3-11ef-8767-8dbabe23815c",
    name: "JP索引", 
    description: "clyh-jp-*"
  },
  middle: {
    id: "00db24f0-0f56-11ee-8720-5bf2036a9e1a",
    name: "Middle索引",
    description: "clyh-middle-*"
  }
}

export class Tool517ConfigClass implements Tool517Config {
  indexes = indexes
  
  appDefaultIndexes = {
    "console.volcengine.com": "clyh",
    urlPatterns: {
      "/hotel/": "hotel"
    }
  }

  timeConfig = {
    sessionTimeRange: 1,
    defaultTimeRange: "now-4h,now"
  }

  kibana = {
    baseUrl: "https://pallognew.517la.com/s/517na/app/kibana#/discover",
    fieldMapping: {
      sessionId: "origin",
      userId: "staffID"
    }
  }

  getCurrentDefaultIndex(): string {
    return "middle"
  }

  getApplicationName(): string | null {
    return null
  }

  getIndexByApplicationName(appName: string): string | null {
    if (!appName) return null
    if (/酒店|hotel/i.test(appName)) return 'hotel'
    return 'middle'
  }

  getIndex(indexKey: string): IndexConfig {
    return this.indexes[indexKey] || this.indexes.hotel
  }

  getAvailableIndexes(): AvailableIndex[] {
    return Object.entries(this.indexes).map(([key, config]) => ({
      key,
      id: config.id,
      name: config.name,
      description: config.description,
      displayText: `${config.name} (${config.description})`
    }))
  }

  validateConfig() {
    return { isValid: true, issues: [] }
  }
}