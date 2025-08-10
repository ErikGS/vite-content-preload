import type { IndexHtmlTransformContext, Plugin } from 'vite'
import type { OutputChunk, OutputAsset } from 'rollup'

export interface AutoPreloadOptions {
  maxSizeKB?: number
  extensions?: RegExp
}

export default function autoPreload(options: AutoPreloadOptions = {}): Plugin {
  const { maxSizeKB = 200, extensions = /\.(woff2?|ttf|otf|png|jpe?g|gif|svg|webp|mp4|webm)$/i } = options

  return {
    name: 'vite-plugin-auto-preload',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html?: string, ctx?: IndexHtmlTransformContext) {
      if (!ctx?.bundle) return html
      if (!html) return undefined

      const bundle = ctx.bundle as Record<string, OutputChunk | OutputAsset>

      const initialFiles = Object.values(bundle)
        .filter((file) => {
          if (file.type === 'chunk' && html.includes(file.fileName)) {
            return true
          }
          if (file.type === 'asset' && file.fileName.endsWith('.css') && html.includes(file.fileName)) {
            return true
          }
          return false
        })
        .map((file) => file.fileName)

      const usedAssets = new Set<string>()

      initialFiles.forEach((fileName) => {
        const file = bundle[fileName]
        if (!file) return

        if (file.type === 'chunk') {
          const chunk = file as OutputChunk
          chunk.imports.forEach((importName) => {
            const asset = bundle[importName]
            if (asset && asset.type === 'asset' && extensions.test(asset.fileName)) {
              usedAssets.add(asset.fileName)
            }
          })
        }

        if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
          const cssUrls = Array.from(file.source.matchAll(/url\(["']?([^"')]+)["']?\)/g))
            .map((match) => match[1])
            .filter((url) => extensions.test(url))
          cssUrls.forEach((url) => {
            const cleanUrl = url.split('?')[0].split('#')[0]
            const assetPath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl
            if (bundle[assetPath]) {
              usedAssets.add(assetPath)
            }
          })
        }
      })

      const preloadLinks = Array.from(usedAssets)
        .filter((fileName) => {
          const asset = bundle[fileName] as OutputAsset | undefined
          if (!asset || !asset.source) return false
          const sizeKB = asset.source.length / 1024
          return sizeKB <= maxSizeKB
        })
        .map((fileName) => {
          let asType = 'fetch'
          if (/\.(woff2?|ttf|otf)$/i.test(fileName)) asType = 'font'
          if (/\.(png|jpe?g|gif|svg|webp)$/i.test(fileName)) asType = 'image'
          if (/\.(mp4|webm)$/i.test(fileName)) asType = 'video'
          const crossorigin = asType === 'font' ? ' crossorigin' : ''
          return `<link rel="preload" href="/${fileName}" as="${asType}"${crossorigin}>`
        })
        .join('\n')

      if (!preloadLinks) return html
      return html.replace('</head>', `${preloadLinks}\n</head>`)
    },
  }
}
