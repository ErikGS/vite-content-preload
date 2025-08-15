import type { IndexHtmlTransformContext, Plugin } from 'vite'
import type { OutputChunk, OutputAsset } from 'rollup'
import { createLogger } from 'vite'

/**
 * Customizable options for the vite-auto-preload plugin.
 * @property **maxSizeKB** - Maximum asset size in KB to preload. _(**Default:** 200. Beware to not overload the network!)._
 * @property **extensions** - RegExp to match asset file extensions for preloading. _(**Default:** woff2? | ttf | otf | midi? | ogg | mp3 | png | jpe?g | gif | svg | webp | mp4 | webm)._
 * @property **verbose** - Enable detailed logging for debugging. _(**Default:** false)._
 */
export interface AutoPreloadOptions {
  maxSizeKB?: number
  extensions?: RegExp
  verbose?: boolean
}

/**
 * Vite plugin to automatically inject \<link rel="preload"> tags for assets
 * referenced in initial chunks and CSS, optimizing page load performance.
 *
 * @param options - Plugin customizable options, like asset size and file extensions.
 * @returns Vite Plugin object.
 */
export default function autoPreload(
  options: AutoPreloadOptions = {}
): Plugin {
  const {
    maxSizeKB = 200,
    extensions = /\.(woff2?|ttf|otf|midi?|ogg|mp3|png|jpe?g|gif|svg|webp|mp4|webm)$/i,
    verbose = false
  } = options

  const logger = createLogger()

  const log = (...args: any[]) => {
    if (verbose) console.info('[preload]', ...args)
  }

  const warn = (...args: any[]) => {
    console.warn('[preload]', ...args)
  }

  return {
    name: 'vite-content-preload',
    enforce: 'post',
    apply: 'build',

    transformIndexHtml(html?: string, ctx?: IndexHtmlTransformContext) {
      if (!ctx?.bundle) {
        warn('❌ No bundle available.')
        return html
      }
      if (!html) {
        warn('❌ Undefined HTML.')
        return undefined
      }

      logger.info('\n')

      const usedAssets = new Set<string>()
      const bundle = ctx.bundle as Record<string, OutputChunk | OutputAsset>

      const initialFiles = Object.values(bundle)
        .filter((file) => {
          if (file.type === 'chunk' && html.includes(file.fileName)) return true
          if (file.type === 'asset' && file.fileName.endsWith('.css') && html.includes(file.fileName)) return true
          return false
        })
        .map((file) => file.fileName)

      const findBundleAsset = (name: string) => {
        // Normalize asset name by removing potential path prefixes
        const normalizedName = name.replace(/^\.\.?\//, '')
        return Object.entries(bundle).find(([_, f]) =>
          f.type === 'asset' && f.fileName.endsWith(normalizedName)
        )?.[1] as OutputAsset | undefined
      }
      
      log('⚙️  Initial files:', initialFiles)

      // Looks for assets in bundle
      initialFiles.forEach((fileName) => {
        const file = bundle[fileName]
        if (!file) return

        // Collect JS assets
        if (file.type === 'chunk') {
          const chunk = file as OutputChunk & { importedAssets?: Set<string> }
          log('🔍 Chunk:', fileName, 'importedAssets:', chunk.importedAssets ? Array.from(chunk.importedAssets) : 'none')
          
          // Collect JS bundled assets (e.g., import img from './img.png')
          chunk.importedAssets?.forEach((assetFileName: string) => {
            const asset = findBundleAsset(assetFileName)
            log('🔍 Imported asset:', assetFileName, 'bundled:', !!asset, 'fileName:', asset?.fileName)
            if (extensions.test(assetFileName) && asset) {
              usedAssets.add(asset.fileName)
            }
          })

          // Collect JS raw url() assets (e.g., url('./img.png'))
          if (typeof file.code === 'string') {
            const urlRegex = /url\((['"]?)([^'")]+)\1\)/g
            let match
            while ((match = urlRegex.exec(file.code)) !== null) {
              const assetUrl = match[2]
              const assetName = assetUrl.replace(/^\//, '')
              const asset = findBundleAsset(assetName)
              log('🔍 JS url():', assetName, 'bundled:', !!asset, 'fileName:', asset?.fileName)
              if (extensions.test(assetName) && asset) {
                usedAssets.add(asset.fileName)
              }
            }
          }
        }

        // Collect CSS assets
        if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
          const urlRegex = /url\((['"]?)([^'")]+)\1\)/g
          let match
          while ((match = urlRegex.exec(file.source)) !== null) {
            const assetUrl = match[2]
            const assetName = assetUrl.replace(/^\//, '')
            const asset = findBundleAsset(assetName)
            log('🔍 CSS url():', assetName, 'bundled:', !!asset, 'fileName:', asset?.fileName)
            if (extensions.test(assetName) && asset) {
              usedAssets.add(asset.fileName)
            }
          }
        }
      })

      // Additional lookup for assets in bundle
      Object.entries(bundle).forEach(([fileName, file]) => {
        if (file.type === 'asset' && extensions.test(fileName)) {
          log('🔍 Bundle asset:', fileName)
          usedAssets.add(fileName)
        }
      })

      // Looks for assets in HTML
      const htmlAssetRegex = /<(?:img|source|link)[^>]+(?:src|href)=["']([^"']+)["']/g
      let htmlMatch
      while ((htmlMatch = htmlAssetRegex.exec(html)) !== null) {
        const assetPath = htmlMatch[1].replace(/^\//, '')
        const asset = findBundleAsset(assetPath)
        log('🔍 HTML asset:', assetPath, 'bundled:', !!asset, 'fileName:', asset?.fileName)
        if (extensions.test(assetPath) && asset) {
          usedAssets.add(asset.fileName)
        }
      }

      // Builds preload links for collected assets
      const preloadLinks = Array.from(usedAssets)
        .filter((fileName) => {
          const asset = findBundleAsset(fileName) || (bundle[fileName] as OutputAsset | undefined)
          if (!asset || !asset.source) {
            warn('⚠️ Skipping, not found in bundle:', fileName)
            return false
          }
          const sizeKB = asset.source.length / 1024
          const ok = sizeKB <= maxSizeKB
            warn(`📦 ${fileName}: ${sizeKB.toFixed(1)} KB`, ok ? '(✅ Collected)' : '(❌ Skipped, too large)')
          return ok
        })
        .map((fileName) => {
          let asType = 'fetch'
          if (/\.(woff2?|ttf|otf)$/i.test(fileName)) asType = 'font'
          if (/\.(png|jpe?g|gif|svg|webp)$/i.test(fileName)) asType = 'image'
          if (/\.(mp4|webm)$/i.test(fileName)) asType = 'video'
          const crossorigin = asType === 'font' ? ' crossorigin' : ''
          return `<link rel="preload" href="${fileName.startsWith('..') ? fileName : `/${fileName}`}" as="${asType}"${crossorigin}>`
        })
        .join('\n')

      log('✅ Final assets:', Array.from(usedAssets))
    
      if (!preloadLinks.trim()) {
        warn('❌ No preload was injected.')
        return html
      }
      log('✅ Preloads injected:', preloadLinks.split('\n'))
      
      logger.info('')

      return html.replace('</head>', `${preloadLinks}\n</head>`)
    }
  }
}