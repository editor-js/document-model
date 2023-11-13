<script setup lang="ts">
// import { DocumentModel } from '@editorjs/document-model'

</script>

<template>
  <div :class="$style.title">
    <img
      src="assets/editorjs.svg"
      alt="Editor.js logo"
    >
    Editor.js Document Playground
  </div>
</template>

<style module>

.title {
  font-weight: 500;
}

.title img {
  height: 30px;
  margin-right: 0.5em;
  vertical-align: middle;
  will-change: filter;
  transition: filter 300ms;
}

.title img:hover {
  filter: drop-shadow(0 0 20px #1CADFFaa);
}
</style>
