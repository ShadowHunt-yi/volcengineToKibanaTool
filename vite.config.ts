import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import webExtension from 'vite-plugin-web-extension'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs'
import { join, relative, dirname } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    webExtension({
      browser: 'chrome',
      manifest: './src/manifest.json',
      watchFilePaths: ['src/**/*'],
              additionalInputs: [
          'src/content/inject.ts',
          'src/pages/JsonFormatter.html'
        ]
    }),
    // 自定义插件：复制图标文件、修复manifest.json和重命名下划线文件
    {
      name: 'copy-icons-and-fix-manifest',
      writeBundle() {
        const iconsDir = resolve(__dirname, 'dist/icons')
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true })
        }
        
        // 复制图标文件
        const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png', 'icon.svg']
        iconFiles.forEach(iconFile => {
          const src = resolve(__dirname, 'icons', iconFile)
          const dest = resolve(__dirname, 'dist/icons', iconFile)
          if (existsSync(src)) {
            copyFileSync(src, dest)
            console.log(`Copied ${iconFile} to dist/icons/`)
          }
        })
        
        // 复制config.js文件
        const configSrc = resolve(__dirname, 'src/config.js')
        const configDest = resolve(__dirname, 'dist/src/config.js')
        if (existsSync(configSrc)) {
          copyFileSync(configSrc, configDest)
          console.log('Copied config.js to dist/src/')
        }

        // 修复manifest.json中的inject.ts路径
        const manifestPath = resolve(__dirname, 'dist/manifest.json')
        if (existsSync(manifestPath)) {
          let manifest = readFileSync(manifestPath, 'utf8')
          // 替换inject.ts为inject.js
          manifest = manifest.replace(/src\/content\/inject\.ts/g, 'src/content/inject.js')
          writeFileSync(manifestPath, manifest)
          console.log('Fixed manifest.json: inject.ts -> inject.js')
        }

        // 修复HTML文件中的路径为相对路径
        const fixHtmlPaths = (dir: string) => {
          if (!existsSync(dir)) return
          
          const files = readdirSync(dir)
          for (const file of files) {
            const fullPath = join(dir, file)
            const stat = statSync(fullPath)
            
            if (stat.isDirectory()) {
              fixHtmlPaths(fullPath)
            } else if (file.endsWith('.html')) {
              let content = readFileSync(fullPath, 'utf8')
              let updated = false
              
              // 针对popup.html的特殊处理
              if (fullPath.includes('popup.html')) {
                content = content.replace(/src="\/src\/popup\/popup\.js"/g, 'src="./popup.js"')
                content = content.replace(/href="\/([^"]+)"/g, 'href="../../$1"')
                updated = true
              }
              // 针对JsonFormatter.html的特殊处理  
              else if (fullPath.includes('JsonFormatter.html')) {
                content = content.replace(/src="\/src\/pages\/JsonFormatter\.js"/g, 'src="./JsonFormatter.js"')
                content = content.replace(/href="\/([^"]+)"/g, 'href="../../$1"')
                updated = true
              }
              // 针对devtools.html的特殊处理
              else if (fullPath.includes('devtools.html')) {
                content = content.replace(/src="\/src\/devtools\/devtools\.js"/g, 'src="./devtools.js"')
                content = content.replace(/href="\/([^"]+)"/g, 'href="../../$1"')
                updated = true
              }
              
              if (updated) {
                writeFileSync(fullPath, content)
                console.log(`Fixed paths in ${file}`)
              }
            }
          }
        }

        // 重命名所有以下划线开头的文件
        const distDir = resolve(__dirname, 'dist')
        const renameUnderscoreFiles = (dir: string) => {
          if (!existsSync(dir)) return
          
          const files = readdirSync(dir)
          for (const file of files) {
            const fullPath = join(dir, file)
            const stat = statSync(fullPath)
            
            if (stat.isDirectory()) {
              renameUnderscoreFiles(fullPath)
            } else if (file.startsWith('_')) {
              const newName = file.replace(/^_+/, '') // 移除开头的所有下划线
              const newPath = join(dir, newName)
              renameSync(fullPath, newPath)
              console.log(`Renamed ${file} to ${newName}`)
              
              // 更新HTML文件中的引用
              updateHtmlReferences(distDir, file, newName)
            }
          }
        }

        const updateHtmlReferences = (dir: string, oldName: string, newName: string) => {
          const updateFiles = (currentDir: string) => {
            const files = readdirSync(currentDir)
            for (const file of files) {
              const fullPath = join(currentDir, file)
              const stat = statSync(fullPath)
              
              if (stat.isDirectory()) {
                updateFiles(fullPath)
              } else if (file.endsWith('.html')) {
                let content = readFileSync(fullPath, 'utf8')
                let updated = false
                
                // 更新各种可能的引用格式
                const patterns = [
                  `./${oldName}`,
                  `/${oldName}`,
                  `"/${oldName}"`,
                  `'/${oldName}'`,
                  `href="/${oldName}"`,
                  `src="/${oldName}"`,
                  `href='/${oldName}'`,
                  `src='/${oldName}'`
                ]
                
                patterns.forEach(pattern => {
                  const newPattern = pattern.replace(oldName, newName)
                  if (content.includes(pattern)) {
                    content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern)
                    updated = true
                  }
                })
                
                if (updated) {
                  writeFileSync(fullPath, content)
                  console.log(`Updated reference in ${file}: ${oldName} -> ${newName}`)
                }
              }
            }
          }
          updateFiles(dir)
        }

        renameUnderscoreFiles(distDir)
        fixHtmlPaths(distDir)
      }
    },
    // 额外的清理插件，在所有构建完成后执行
    {
      name: 'final-cleanup',
      closeBundle() {
        // 延迟执行以确保在所有其他插件完成后运行
        setTimeout(() => {
          const distDir = resolve(__dirname, 'dist')
          const finalCleanup = (dir: string) => {
            if (!existsSync(dir)) return
            
            const files = readdirSync(dir)
            for (const file of files) {
              const fullPath = join(dir, file)
              const stat = statSync(fullPath)
              
              if (stat.isDirectory()) {
                finalCleanup(fullPath)
              } else if (file.startsWith('_')) {
                const newName = file.replace(/^_+/, '')
                const newPath = join(dir, newName)
                renameSync(fullPath, newPath)
                console.log(`Final cleanup: Renamed ${file} to ${newName}`)
                
                // 更新HTML文件引用
                const updateAllHtmlFiles = (searchDir: string) => {
                  const files = readdirSync(searchDir)
                  for (const f of files) {
                    const fp = join(searchDir, f)
                    const st = statSync(fp)
                    if (st.isDirectory()) {
                      updateAllHtmlFiles(fp)
                    } else if (f.endsWith('.html')) {
                      let content = readFileSync(fp, 'utf8')
                      const patterns = [`/${file}`, `"/${file}"`, `'/${file}'`]
                      let updated = false
                      patterns.forEach(pattern => {
                        const newPattern = pattern.replace(file, newName)
                        if (content.includes(pattern)) {
                          content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern)
                          updated = true
                        }
                      })
                      if (updated) {
                        writeFileSync(fp, content)
                        console.log(`Final cleanup: Updated HTML references in ${f}`)
                      }
                    }
                  }
                }
                updateAllHtmlFiles(distDir)
              }
            }
          }
          finalCleanup(distDir)
        }, 1000)
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 避免文件名以下划线开头，Chrome扩展不允许这种文件名
        chunkFileNames: (chunkInfo) => {
          // 处理特殊的插件文件
          if (chunkInfo.name?.includes('plugin-vue_export-helper')) {
            return 'assets/vue-export-helper-[hash].js'
          }
          return 'assets/chunk-[name]-[hash].js'
        },
        entryFileNames: (chunkInfo) => {
          // 保持extension入口文件的路径结构
          if (chunkInfo.name === 'background') {
            return 'src/background/background.js'
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/content.js'
          }
          if (chunkInfo.name === 'inject') {
            return 'src/content/inject.js'
          }
          return 'assets/entry-[name]-[hash].js'
        },
        assetFileNames: (assetInfo) => {
          // 确保CSS和其他资源文件也不以下划线开头
          const extType = assetInfo.name?.split('.').pop() || ''
          if (['css'].includes(extType)) {
            return `assets/style-[name]-[hash].${extType}`
          }
          return `assets/asset-[name]-[hash].${extType}`
        }
      }
    }
  }
}) 