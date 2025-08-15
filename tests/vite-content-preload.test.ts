import { describe, it, expect } from 'vitest'
import type { IndexHtmlTransformHook } from 'vite'
import autoPreload, { AutoPreloadOptions } from '../src/index'

describe('vite-content-preload', () => {
    it('should export a function', () => {
        expect(typeof autoPreload).toBe('function')
    })

    it('should return a plugin object with required properties', () => {
        const plugin = autoPreload()
        expect(plugin).toHaveProperty('name', 'vite-content-preload')
        expect(plugin).toHaveProperty('enforce', 'post')
        expect(plugin).toHaveProperty('apply', 'build')
        expect(typeof plugin.transformIndexHtml).toBe('function')
    })

    it('should not modify html if ctx.bundle is missing', () => {
        const plugin = autoPreload()
        const html = '<html><head></head><body></body></html>'
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, undefined as any)
        expect(result).toBe(html)
    })

    it('should not add preload links if no matching assets', () => {
        const plugin = autoPreload()
        const html = '<html><head></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': { type: 'chunk', fileName: 'main.js', imports: [] }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toBe(html)
    })

    it('should add preload links for assets under maxSizeKB', () => {
        const plugin = autoPreload({ maxSizeKB: 1 })
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': { type: 'chunk', fileName: 'main.js', imports: ['font.woff2'] },
                'font.woff2': { type: 'asset', fileName: 'font.woff2', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/font.woff2" as="font" crossorigin>')
    })

    it('should respect extensions option', () => {
        const plugin = autoPreload({ extensions: /\.png$/i })
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': { type: 'chunk', fileName: 'main.js', imports: ['image.png', 'font.woff2'] },
                'image.png': { type: 'asset', fileName: 'image.png', source: Buffer.alloc(500) },
                'font.woff2': { type: 'asset', fileName: 'font.woff2', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/image.png" as="image">')
        expect(result).not.toContain('font.woff2')
    })

    it('should extract asset urls from CSS files', () => {
        const plugin = autoPreload()
        const html = '<html><head><link rel="stylesheet" href="styles.css"></head><body></body></html>'
        const ctx = {
            bundle: {
                'styles.css': {
                    type: 'asset',
                    fileName: 'styles.css',
                    source: 'body{background:url("bg.png"); foreground:url("../img/fg.png");}'
                },
                'bg.png': { type: 'asset', fileName: 'bg.png', source: Buffer.alloc(500) },
                'fg.png': { type: 'asset', fileName: 'fg.png', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/bg.png" as="image">')
        expect(result).toContain('<link rel="preload" href="/fg.png" as="image">')
    })

    it('should extract asset urls from JS chunk source', () => {
        const plugin = autoPreload()
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': {
                    type: 'chunk',
                    fileName: 'main.js',
                    code: 'const img = "url(\'/image-in-js.png\')"; const img = "url(\'../img/image-in-js-2.png\')";'
                },
                'image-in-js.png': { type: 'asset', fileName: 'image-in-js.png', source: Buffer.alloc(500) },
                'image-in-js-2.png': { type: 'asset', fileName: 'image-in-js-2.png', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/image-in-js.png" as="image">')
        expect(result).toContain('<link rel="preload" href="/image-in-js-2.png" as="image">')
    })
})
