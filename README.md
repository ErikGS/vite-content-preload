# vite-plugin-auto-preload

Vite plugin to automatically inject `<link rel="preload">` tags for assets referenced in initial chunks and CSS, optimizing page load performance.

## Features

- Automatically detects assets referenced in initial JS chunks and CSS
- Injects `<link rel="preload">` for fonts, images, videos, and more
- Configurable asset size and file extensions
- Works out-of-the-box with Vite build

See [How it works](#how-it-works).

## Installation

```bash
npm install vite-plugin-auto-preload --save-dev
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import autoPreload from 'vite-plugin-auto-preload'

export default {
  plugins: [
    autoPreload({
      maxSizeKB: 200, // Only preload assets up to 200KB (default)
      extensions: /\.(woff2?|ttf|otf|png|jpe?g|gif|svg|webp|mp4|webm)$/i // File types to preload (default)
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

## How it works

- During the Vite build, the plugin scans the final HTML for referenced JS and CSS files.
- It finds assets imported by those files (fonts, images, videos, etc).
- For each asset matching the configured extensions and under the size limit, it injects a `<link rel="preload">` tag into the HTML `<head>`.
- This helps browsers start fetching critical assets earlier, improving page load performance.

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

## License

MIT

---

Made with ❤️ and ☕ by [Erik GS](https://github.com/ErikGS)
