<script setup lang="ts">
import img from './assets/images/Vue.js_Logo_2.svg.png'

const source = "Source: https://commons.wikimedia.org/wiki/File:Vue.js_Logo_2.svg"
</script>

<template>
  <div id="content">
    <h1>Hello world!</h1>
      <img id="vue-logo" :src="img" width="100px" :alt="source" :aria-label="source" />
    <p>
      This is an app built with Vue.js for teasing
      <strong><a href="https://github.com/ErikGS/vite-content-preload" target="_blank" rel="noopener">vite-content-preload</a></strong>
      plugin functionality.
      <br />
      <br />
      You should first run <i>npm run build</i> to build this app.
      <br />
      Then inspect the <i>&lt;head&gt;</i> section of the generated
      html file in <i>'/dist/'</i>,
      <br />
      you should see a <i>&lt;link rel="preload"&gt;</i>
      that corresponds to
      <br />
      the image file in the <i>&lt;img /&gt;</i> element of this page.
    </p>
      <div style="margin-top: 1.2rem;">
        Made with ❤️ and ☕ by <a href="https://github.com/ErikGS" target="_blank" rel="noopener">Erik GS</a>.
        <br />
        💖 Support my work → <a href="https://github.com/sponsors/ErikGS" target="_blank" rel="noopener">Sponsor me on GitHub.</a>
        <br />
        <br />
        <small>Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to learn about Vue.js.</small>
      </div>
  </div>
</template>

<style>
body {
  background-color: rgb(12, 20, 24);
  color: whitesmoke;
  font-size: 12pt;
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: #42b983;
}

i {
  color: orange;
}

p {
  line-height: 1.6;
}

#app {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100dvh;
}

#content {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  text-align: center;
  gap: 1.2rem;
  padding: 2.6rem;
  padding-top: 2rem;
  border-radius: 1.6rem;
  background-color: rgb(22, 32, 36);
  box-shadow: 0 0 0.2rem rgba(0, 0, 0, 0.2),
              0 0.6rem 1.0rem rgba(0, 0, 0, 0.3),
              inset 0 0 0.2rem rgba(190, 190, 190, 0.06),
              inset 0 0.6rem 1.0rem rgba(190, 190, 190, 0.02);
}
</style>
