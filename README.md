# vite-content-preload

[![CI](https://github.com/ErikGS/vite-content-preload/actions/workflows/ci.yml/badge.svg)](https://github.com/ErikGS/vite-content-preload/actions/workflows/ci.yml)
[![CD](https://github.com/ErikGS/vite-content-preload/actions/workflows/cd.yml/badge.svg)](https://github.com/ErikGS/vite-content-preload/actions/workflows/cd.yml)

Vite plugin to automatically inject `<link rel="preload">` tags for bundled assets (e.g., those imported via relative paths or modules) referenced in initial JS chunks and CSS, optimizing page load performance. Please note that it does not handle assets in the public directory — if you want to know the difference between bundled assets and assets in the public directory, see [Vite's asset handling docs](https://vite.dev/guide/assets) for details.

If you have any questions, try checking the [F.A.Q](#faq).

## Features

- Automatically detects assets referenced in initial JS chunks and CSS
- Injects `<link rel="preload">` for fonts, images, videos, and more
- Configurable asset size and file extensions
- Works out-of-the-box with Vite build

See [How it works](#how-it-works).

## Installation

```bash
npm install vite-content-preload --save-dev
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import autoPreload from 'vite-content-preload'

export default {
  plugins: [
    autoPreload({
      maxSizeKB: 200, // Only preload assets up to 200KB (default)
      extensions: /\.(woff2?|ttf|otf|png|jpe?g|gif|svg|webp|mp4|webm)$/i, // File types to preload (default)
      preloadAll: false, // Prelaod only from initial chunks (default and recommended)
      verbose: false // Minimal logging (default)
    })
  ]
}
```

## Options

- `maxSizeKB`
  - Type: `number`
  - Default: `200`
  - Description: Maximum asset size (in KB) to preload.

- `extensions`
  - Type: `RegExp`
  - Default: `/\.(woff2?|ttf|otf|png|jpe?g|gif|svg|webp|mp4|webm)$/i`
  - Description: RegExp to match asset file extensions.

- `preloadAll`
  - Type: `boolean`
  - Default: `false`
  - Description: Enable preloading of ALL files in bundle with matching extensions. Intended for debugging purposes only, use with caution!

- `verbose`
  - Type: `boolean`
  - Default: `false`
  - Description: Enable detailed logging for debugging.

## How it works

- During the Vite build, the plugin scans the final HTML for referenced JS and CSS files.
- It finds bundled assets (e.g., those imported via relative paths or modules) referenced in those initial JS chunks and CSS (fonts, images, videos, etc.).
- For each asset matching the configured extensions and under the size limit, it injects a `<link rel="preload">` tag into the HTML `<head>`.
- This helps browsers start fetching critical assets earlier, improving page load performance.
- Note: This plugin targets bundled assets for optimal performance and does not handle assets in the public directory, as they are not part of Vite's optimized build process. For best results, use relative imports to enable bundling, hashing, and optimization — see [Vite's asset handling docs](https://vite.dev/guide/assets) for details.

## Example

Given this HTML:

```html
<html>
  <head>
    <script src="main.js"></script>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body></body>
</html>
```

If `main.js` imports `font.woff2` and `styles.css` references `image.png`, the plugin will inject before `</head>`:

```html
<link rel="preload" href="/font.woff2" as="font" crossorigin>
<link rel="preload" href="/image.png" as="image">
```

## FAQ

**Q: Why isn't my image in the public folder being preloaded?**

***A:** The plugin targets bundled assets for optimal performance. Public assets are copied as-is without hashing or optimization. To preload your image, move it to an assets folder and reference it with a relative path (e.g., import img from './assets/my-image.png'; or `<img src="./assets/my-image.png" />` in templates). This enables Vite to process it fully — see Vite's asset handling docs for details.*

**Q: I'm using absolute paths like url('/images/bg.png') — how do I switch to bundled?**

***A:** Refactor to relative paths (e.g., url('../images/bg.png')) so Vite bundles it. If the asset is in the public directory, consider relocaing it outside public and switching to import-based handling. Benefits of using import-based assets includes automatic filename hashing for better caching and potential size reductions — see [Vite's asset handling docs](https://vite.dev/guide/assets) for details.*

**Q: Can I configure the plugin to include assets in public directory?**

***A:** Not currently, to keep the plugin lightweight and focused on best practices.*

## License

[MIT](https://github.com/ErikGS/vite-content-preload/?tab=MIT-1-ov-file)

## About

Made with ❤️ and ☕ by [Erik GS](https://github.com/ErikGS)

💖 Support my work → [Sponsor me on GitHub](https://github.com/sponsors/ErikGS)
