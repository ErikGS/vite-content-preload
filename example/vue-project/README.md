# Example

Given this Vue.js template:

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

The vite-content-preload plugin will inject inside `<head> </head>` of Vite's generated final HTML (typically in '/dist/'):

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

[Go to FAQ](https://github.com/ErikGS/vite-content-preload/#faq)

---

Made with ❤️ and ☕ by [Erik GS](https://github.com/ErikGS)

💖 Support my work → [Sponsor me on GitHub](https://github.com/sponsors/ErikGS)