import type { IndexHtmlTransformContext, Plugin } from 'vite'
import type { OutputChunk, OutputAsset } from 'rollup'

/**
 * Options for the auto-preload plugin.
 * @property maxSizeKB - Maximum asset size (in KB) to preload. Default: 200.
 * @property extensions - RegExp to match asset file extensions for preloading. Default: woff2? | ttf | otf | png | jpe?g | gif | svg | webp | mp4 | webm
 */
export interface AutoPreloadOptions {
  maxSizeKB?: number
  extensions?: RegExp
}

/**
 * Vite plugin to automatically inject \<link rel="preload"> tags for assets
 * referenced in initial chunks and CSS, optimizing page load performance.
 *
 * @param options - Configuration for asset size and extensions.
 * @returns Vite Plugin object.
 */
export default function autoPreload(options: AutoPreloadOptions = {}): Plugin {
  const { maxSizeKB = 200, extensions = /\.(woff2?|ttf|otf|png|jpe?g|gif|svg|webp|mp4|webm)$/i } = options

  return {
    name: 'vite-content-preload',
    enforce: 'post', // Run after other HTML transforms
    apply: 'build',

    transformIndexHtml(html?: string, ctx?: IndexHtmlTransformContext) {
      if (!ctx?.bundle) return html // Only run during build with bundle info
      if (!html) return undefined

      const bundle = ctx.bundle as Record<string, OutputChunk | OutputAsset>

      // Find initial files referenced in HTML (chunks and CSS)
      const initialFiles = Object.values(bundle)
        .filter((file) => {
          // Chunks referenced by <script src="...">
          if (file.type === 'chunk' && html.includes(file.fileName)) return true
          // CSS assets referenced by <link href="...">
          if (file.type === 'asset' && file.fileName.endsWith('.css') && html.includes(file.fileName)) return true
          return false
        })
        .map((file) => file.fileName)

      const usedAssets = new Set<string>()

      // Collect assets imported by initial chunks and CSS
      initialFiles.forEach((fileName) => {
        const file = bundle[fileName]
        if (!file) return

        // For JS chunks, add imported assets matching extensions
        if (file.type === 'chunk') {
          file.imports?.forEach((imported) => {
            const importedFile = bundle[imported]
            if (
              importedFile &&
              importedFile.type === 'asset' &&
              extensions.test(importedFile.fileName)
            ) {
              usedAssets.add(importedFile.fileName)
            }
          })
          // Extract asset URLs from JS chunk source
          if (typeof file.code === 'string') {
            const urlRegex = /url\((['"]?)([^'")]+)\1\)/g
            let match
            while ((match = urlRegex.exec(file.code)) !== null) {
              const assetUrl = match[2] // Acessa o grupo capturado que contém o URL
              const assetName = assetUrl.replace(/^\//, '') // Remove a barra inicial
              if (extensions.test(assetName) && bundle[assetName]) {
                usedAssets.add(assetName)
              }
            }
          }
        }

        // For CSS, extract asset URLs from CSS source
        if (
          file.type === 'asset' &&
          file.fileName.endsWith('.css') &&
          typeof file.source === 'string'
        ) {
          const urlRegex = /url\((['"]?)([^'")]+)\1\)/g
          let match
          while ((match = urlRegex.exec(file.source)) !== null) {
            const assetUrl = match[2]
            const assetName = assetUrl.replace(/^\//, '')
            if (extensions.test(assetName) && bundle[assetName]) {
              usedAssets.add(assetName)
            }
          }
        }
      })

      // Generate preload links for assets under maxSizeKB
      const preloadLinks = Array.from(usedAssets)
        .filter((fileName) => {
          const asset = bundle[fileName] as OutputAsset | undefined
          if (!asset || !asset.source) return false
          const sizeKB = asset.source.length / 1024
          return sizeKB <= maxSizeKB
        })
        .map((fileName) => {
          // Determine asset type for 'as' attribute
          let asType = 'fetch'
          if (/\.(woff2?|ttf|otf)$/i.test(fileName)) asType = 'font'
          if (/\.(png|jpe?g|gif|svg|webp)$/i.test(fileName)) asType = 'image'
          if (/\.(mp4|webm)$/i.test(fileName)) asType = 'video'
          const crossorigin = asType === 'font' ? ' crossorigin' : ''
          return `<link rel="preload" href="/${fileName}" as="${asType}"${crossorigin}>`
        })
        .join('\n')

      // Inject preload links before </head> if there are links to add
      if (!preloadLinks) return html
      return html.replace('</head>', `${preloadLinks}\n</head>`)
    },
  }
}
