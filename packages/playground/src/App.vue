<script setup lang="ts">
// import CaretIndex from '@/components/CaretIndex.vue';
import { EditorDocument, EditorJSModel } from '@editorjs/model';
import Core from '@editorjs/core';
import { ref, onMounted } from 'vue';
import { Node } from './components';
import { EditorjsUI, BlocksUI, InlineToolbarUI, ToolboxUI, ToolbarUI } from '@editorjs/ui';
/**
 * Editor document for visualizing
 */
const editorDocument = ref<EditorDocument | null>(null);

/**
 * Serialized document value
 */
const serialized = ref<EditorDocument['serialized'] | null>(null);

const model = ref<EditorJSModel | null>(null);

const userId = crypto.randomUUID();


/**
 * @todo display caret index somewhere
 */

onMounted(() => {
  const core = new Core({
    holder: document.getElementById('editorjs') as HTMLElement,
    userId: userId,
    documentId: 'test',
    // collaborationServer: 'wss://lirili-larila.codex.so/',
    collaborationServer: 'ws://localhost:8080',
    data: {
      blocks: [
        {
          type: 'paragraph',
          data: {
            text: '111',
          },
        },
        {
          type: 'paragraph',
          data: {
            text: '222',
          },
        },
        {
          type: 'paragraph',
          data: {
            text: '333',
          },
        },

      ],
    },
    onModelUpdate: (m: EditorJSModel) => {
      model.value = m;
      serialized.value = m.serialized;
      editorDocument.value = m.devModeGetDocument();
    },

  });

  core
    .use(EditorjsUI)
    .use(BlocksUI)
    .use(InlineToolbarUI)
    .use(ToolbarUI)
    .use(ToolboxUI)
    .initialize();
});

/**
 * Reactive state to track collapsed sections
 */
const collapsedSections = ref<{ [key: string]: boolean }>({
  editor: false,
  playground: true,
  output: true,
});

/**
 * Toggles the collapsed state of a section
 */
function toggleSection(section: string) {
  collapsedSections.value[section] = !collapsedSections.value[section];
}
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
      <div :class="[$style.section, { [$style.collapsed]: collapsedSections.editor }]">
        <h2 :class="$style.sectionHeading" @click="toggleSection('editor')">
          Editor
        </h2>
        <div
          id="editorjs"
          :class="$style.editor"
        />
      </div>
      <div :class="[$style.section, { [$style.collapsed]: collapsedSections.playground }]">
        <h2 :class="$style.sectionHeading" @click="toggleSection('playground')">
          Model Serialized
        </h2>
        <pre v-if="serialized">{{ serialized }}</pre>
      </div>
      <div :class="[$style.section, { [$style.collapsed]: collapsedSections.output }]">
        <h2 :class="$style.sectionHeading" @click="toggleSection('output')">
          Model
        </h2>
        <Node
          v-if="editorDocument"
          :node="editorDocument"
        />
      </div>
    </div>
  </div>
</template>

<style module>

.container {
}

.body {
  padding: 16px;
  display: flex;
  flex-direction: row;
  gap: 0;
  background-color: var(--base--bg-primary);
}

.section {
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0;
  min-width: 0;
  overflow: hidden;
  transition: flex-grow 0.3s ease, flex-basis 0.3s ease;
  border-right: 1px solid var(--base--bg-secondary);
  padding: 0 20px;
}

.section:first-child {
  padding-left: 0;
}

.section:last-child {
  border-right: none;
  padding-right: 0;
}

.collapsed {
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 50px;
}

.playground {
  max-width: 100%;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  font-family: var(--rounded-family);
}

.output {

}

.header {
  font-weight: 500;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  background-color: var(--base--bg-primary);
  border-bottom: 1px solid var(--base--border);
  color: var(--base--text);
  -webkit-backdrop-filter: blur(30px);
  backdrop-filter: blur(30px);
  z-index: 2;
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

.editor {
  background-color: var(--base--bg-secondary);
  border: 1px solid var(--base--border);
  border-radius: var(--radius-m, 8px);
  padding: 10px;
  font-size: 2em;
}

.sectionHeading {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
  margin-top: 0;
  font-family: var(--rounded-family);
  color: var(--base--text-secondary);
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
}
</style>
