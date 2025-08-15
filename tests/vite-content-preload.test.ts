import { describe, it, expect } from 'vitest'
import type { IndexHtmlTransformHook } from 'vite'
import autoPreload, { AutoPreloadOptions } from '../src/index'

describe('vite-content-preload', () => {
    const plugin = autoPreload({ verbose: true, maxSizeKB: 1, extensions: /\.(png|woff2)$/i })

    it('should export a function', () => {
        expect(typeof autoPreload).toBe('function')
    })

    it('should return a plugin object with required properties', () => {
        expect(plugin).toHaveProperty('name', 'vite-content-preload')
        expect(plugin).toHaveProperty('enforce', 'post')
        expect(plugin).toHaveProperty('apply', 'build')
        expect(typeof plugin.transformIndexHtml).toBe('function')
    })

    it('should not modify html if ctx.bundle is missing', () => {
        const html = '<html><head></head><body></body></html>'
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, undefined as any)
        expect(result).toBe(html)
    })

    it('should not add preload links if no matching assets', () => {
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': { type: 'chunk', fileName: 'main.js', imports: [] },
                'other.js': { type: 'chunk', fileName: 'assets/other.js', imports: ['image.png'] },
                'image.png': { type: 'asset', fileName: 'assets/image.png', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toBe(html)
        expect(result).not.toContain('other.js')
        expect(result).not.toContain('<link rel="preload"')
    })

    it('should only add preload links for assets under maxSizeKB', () => {
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': { type: 'chunk', fileName: 'main.js', imports: ['font.woff2', 'image.png'] },
                'font.woff2': { type: 'asset', fileName: 'assets/font.woff2', source: Buffer.alloc(500) },
                'image.png': { type: 'asset', fileName: 'assets/image.png', source: Buffer.alloc(1500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/assets/font.woff2" as="font" crossorigin>')
        expect(result).not.toContain('image.png')
    })

    it('should respect extensions option', () => {
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': { type: 'chunk', fileName: 'main.js', imports: ['image.png', 'font.woff2', '3dfile.glb'] },
                'image.png': { type: 'asset', fileName: 'assets/image.png', source: Buffer.alloc(500) },
                'font.woff2': { type: 'asset', fileName: 'assets/font.woff2', source: Buffer.alloc(500) },
                '3dfile.glb': { type: 'asset', fileName: 'assets/3dfile.glb', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/assets/image.png" as="image">')
        expect(result).toContain('<link rel="preload" href="/assets/font.woff2" as="font" crossorigin>')
        expect(result).not.toContain('3dfile.glb')
    })

    it('should extract asset urls from CSS files', () => {
        const html = '<html><head><link rel="stylesheet" href="styles.css"></head><body></body></html>'
        const ctx = {
            bundle: {
                'styles.css': {
                    type: 'asset',
                    fileName: 'styles.css',
                    source: 'body{background:url("./assets/imageA.png"); foreground:url("../assets/images/imageB.png");}'
                },
                'imageA.png': { type: 'asset', fileName: 'assets/imageA.png', source: Buffer.alloc(500) },
                'imageB.png': { type: 'asset', fileName: 'assets/imageB.png', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/assets/imageA.png" as="image">')
        expect(result).toContain('<link rel="preload" href="/assets/imageB.png" as="image">')
    })
    
    it('should extract asset urls from JS chunk source', () => {
        const html = '<html><head><script src="main.js"></script></head><body></body></html>'
        const ctx = {
            bundle: {
                'main.js': {
                    type: 'chunk',
                    fileName: 'main.js',
                    code: 'const imgA = "url(\'./assets/imageA.png\')"; const imgB = "url(\'../assets/images/imageB.png\')";'
                },
                'imageA.png': { type: 'asset', fileName: 'assets/imageA.png', source: Buffer.alloc(500) },
                'imageB.png': { type: 'asset', fileName: 'assets/imageB.png', source: Buffer.alloc(500) }
            }
        }
        const result = (plugin.transformIndexHtml as IndexHtmlTransformHook).call(undefined as any, html, ctx as any)
        expect(result).toContain('<link rel="preload" href="/assets/imageA.png" as="image">')
        expect(result).toContain('<link rel="preload" href="/assets/imageB.png" as="image">')
    })
})
