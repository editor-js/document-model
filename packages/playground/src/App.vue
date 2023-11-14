<script setup lang="ts">
import { EditorDocument } from '@editorjs/model';

console.log('EditorDocument', new EditorDocument({
  blocks: [
    {
      // id: 'zcKCF1S7X8',
      name: 'header',
      data: {
        text: 'Editor.js',
        level: 1,
      },
    },
    {
      // id: 'b6ji-DvaKb',
      name: 'paragraph',
      data: {
        text: 'Hey. Meet the new Editor. On this page you can see it in action — try to edit this text. Source code of the page contains the example of connection and configuration.',
      },
    },
    {
      // id: '7ItVl5biRo',
      name: 'header',
      data: {
        text: 'Key features',
        level: 2,
      },
    },
    {
      // id: 'SSBSguGvP7',
      name : 'list',
      data : {
        items : [
          {
            content: 'It is a block-styled editor',
            items: [],
          },
          {
            content: 'It returns clean data output in JSON',
            items: [],
          },
          {
            content: 'Designed to be extendable and pluggable with a simple API',
            items: [],
          },
        ],
        style: 'unordered',
      },
    },
  ],
}));


</script>

<template>
  <div :class="$style.title">
    <img
      src="./assets/editorjs.svg"
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
