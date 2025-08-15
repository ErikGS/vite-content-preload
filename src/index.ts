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
  preloadAll?: boolean
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
    preloadAll = false,
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
      //const htmlAssetRegex = /<(?:img|video|source|link)[^>]+(?:src|href)=["']([^"']+)["']/g

      const findBundleAsset = (name: string) => {
        // Normalize asset name by removing potential path prefixes
        const normalizedName = name?.replace(/^\.\.?\//, '')
        return Object.entries(bundle).find(([_, file]) =>
          file.type === 'asset' && file.fileName.endsWith(normalizedName)
        )?.[1] as OutputAsset | undefined
      }

      // Looks for assets in the bundle
      if (preloadAll) {
        // Lookup for all assets in bundle
        log('⚙️  Full-scan: will scan every asset (⚠️ Use ONLY for debugging!)')
        Object.entries(bundle).forEach(([fileName, file]) => {
          if (file.type === 'asset' && extensions.test(fileName)) {
            usedAssets.add(fileName)
            log('🔍 Asset (full-scan):', fileName, '(✅ Collected)')
          } else log('🔍 Asset (full-scan):', fileName, '(❌ Skipped, blacklisted)')
        })
      } else {
        // Lookup for assets in initial chunks only
        const initialChunks = Object.values(bundle)
          .filter((file) => {
            if (file.type === 'chunk' && html.includes(file.fileName)) return true
            if (file.type === 'asset' && file.fileName.endsWith('.css') && html.includes(file.fileName)) return true
            return false
          })
          .map((file) => file.fileName)

        log('⚙️  Initial chunks:', initialChunks)

        initialChunks.forEach((fileName) => {
          const file = bundle[fileName]
          if (!file) return

          // Collect bundled assets from initial JS chunks
          if (file.type === 'chunk') {
            const staticUrlRegex = /\/assets\/[^"']+/g
            const staticAssets = new Set<OutputAsset | undefined>()
            const chunk = file as OutputChunk
            
            // Looks for JS static imported assets
            let match
            while ((match = staticUrlRegex.exec(chunk.code)) !== null) {
              const assetUrl = match[0]
              staticAssets.add(findBundleAsset(assetUrl?.replace(/^.*[\\/]/, '')))
            }

            log(`🔍 Chunk: ${fileName}, dynamic-assets:`, chunk.imports?.length ? chunk.imports : 'none', ', static-assets:', Array.from(Array.from(staticAssets).map(asset => asset?.fileName)) ?? 'none')

            // Collect JS static imported assets
            staticAssets.forEach((asset) => {
              if (asset && extensions.test(asset.fileName)) {
                usedAssets.add(asset.fileName)
                log(`🔍 Asset (${fileName} static):`, asset.fileName, '(✅ Collected)')
              } else log(`🔍 Asset (${fileName} static):`, asset?.fileName, '(❌ Skipped, blacklisted)')
            })

            // Collect JS dynamic imported assets
            chunk.imports?.forEach((assetFileName: string) => {
              const asset = findBundleAsset(assetFileName)
              if (asset && extensions.test(asset.fileName)) {
                usedAssets.add(asset.fileName)
                log(`🔍 Asset (${fileName} dynamic):`, assetFileName, '(✅ Collected)')
              } else log(`🔍 Asset (${fileName} dynamic):`, assetFileName, '(❌ Skipped, blacklisted)')
            })
          }

          // Collect bundled assets from initial CSS chunks
          if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
            log('🔍 Chunk:', fileName)
            const urlRegex = /url\((['"]?)([^'")]+)\1\)/g
            let match
            while ((match = urlRegex.exec(file.source)) !== null) {
              const assetUrl = match[2]
              const asset = findBundleAsset(assetUrl.replace(/^.*[\\/]/, ''))
              if (asset && extensions.test(asset.fileName)) {
                usedAssets.add(asset.fileName)
                log(`🔍 Asset (${fileName}):`, asset.fileName, '(✅ Collected)')
              } else log(`🔍 Asset (${fileName}):`, asset?.fileName ?? assetUrl, '(❌ Skipped, blacklisted)')
            }
          }
        })
      }

      // Builds preload links for the collected assets
      const preloadLinks = Array.from(usedAssets)
        .filter((fileName) => {
          const asset = findBundleAsset(fileName)
          if (asset && asset.source) {
            const sizeKB = asset?.source.length / 1024
            const ok = sizeKB <= maxSizeKB
            warn(`📦 ${fileName}: ${sizeKB.toFixed(1)} KB`, ok ? '(✅ Preloaded)' : '(❌ Skipped, too large)')
            return ok
          }
          warn('⚠️  Not in bundle:', fileName)
          return true
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

      return html.replace('</head>', `  ${preloadLinks}\n</head>`)
    }
  }
}