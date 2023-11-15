<script setup lang="ts">
import { Node } from './components';
import { EditorDocument } from '@editorjs/model';


const document = new EditorDocument({
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
        text: {
          $t: 't',
          value: 'Hey. Meet the new Editor. On this page you can see it in action — try to edit this text. Source code of the page contains the example of connection and configuration.',
          fragments: [
            {
              range: [18, 24],
              tool: 'link',
              data: {
                href: 'https://editorjs.io',
              },
            },
            {
              range: [26, 40],
              tool: 'bold',
              data: {
              },
            },
            {
              range: [34, 38],
              tool: 'italic',
              data: {
              },
            },
          ],
        },
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
});

console.log('document', document);
</script>

<template>
  <div
    :class="$style.container"
  >
    <div :class="$style.header">
      <img
        src="./assets/editorjs.svg"
        alt="Editor.js logo"
      >
      Editor.js Document Playground
    </div>
    <div :class="$style.body">
      <Node
        :node="document"
      />
    </div>
  </div>
</template>

<style module>

.container {
  height: 100%;
}

.body {
  padding: 16px;
}

.header {
  font-weight: 500;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  background: var(--background);
}

.header img {
  height: 20px;
  margin-right: 0.6em;
}

.property {
  font-family: var(--rounded-family);
  font-size: 14px;
  font-weight: 450;
}
</style>
