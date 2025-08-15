# vite-content-preload

[![CI](https://github.com/ErikGS/vite-content-preload/actions/workflows/ci.yml/badge.svg)](https://github.com/ErikGS/vite-content-preload/actions/workflows/ci.yml)
[![CD](https://github.com/ErikGS/vite-content-preload/actions/workflows/cd.yml/badge.svg)](https://github.com/ErikGS/vite-content-preload/actions/workflows/cd.yml)

## Example

Given this Vue template:

```html
<script setup lang="ts">
import img from './assets/images/Vue.js_Logo_2.svg.png'
</script>

<template>
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
    <img :src="img" />
  </p>
</template>
```

The plugin will inject inside `<head> </head>`:

```html
<head>
    <!-- ... -->
    <link rel="preload" href="/assets/Vue.js_Logo_2.svg.png" as="image">
</head>
```

## How it works

- During the Vite build, the plugin scans the final HTML for referenced JS and CSS files.
- It finds bundled assets (e.g., those imported via relative paths or modules) referenced in those initial JS chunks and CSS (fonts, images, videos, etc.).
- For each asset matching the configured extensions and under the size limit, it injects a `<link rel="preload">` tag into the HTML `<head>`.
- This helps browsers start fetching critical assets earlier, improving page load performance.
- Note: This plugin targets bundled assets for optimal performance and does not handle assets in the public directory, as they are not part of Vite's optimized build process. For best results, use relative imports to enable bundling, hashing, and optimization — see [Vite's asset handling docs](https://vite.dev/guide/assets) for details.

## FAQ

**Q: Why isn't my image in the public folder being preloaded?**

***A:** The plugin targets bundled assets for optimal performance. Public assets are copied as-is without hashing or optimization. To preload your image, move it to an assets folder and reference it with a relative path (e.g., import img from './assets/my-image.png'; or `<img src="./assets/my-image.png" />` in templates). This enables Vite to process it fully—see Vite's asset handling docs for details.*

**Q: I'm using absolute paths like url('/images/bg.png') — how do I switch to bundled?**

***A:** Refactor to relative paths (e.g., url('../images/bg.png')) so Vite bundles it. If the asset is in the public directory, consider relocaing it outside public and switching to import-based handling. Benefits of using import-based assets includes automatic filename hashing for better caching and potential size reductions — see [Vite's asset handling docs](https://vite.dev/guide/assets) for details.*

**Q: Can I configure the plugin to include assets in public directory?**

***A:** Not currently, to keep the plugin lightweight and focused on best practices.*

---

Made with ❤️ and ☕ by [Erik GS](https://github.com/ErikGS)
