<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  /**
   * True to hide the content.
   */
  collapsed?: boolean
}>();

const isHidden = ref(props.collapsed ?? true);

function collapseExpand(){
  isHidden.value = !isHidden.value;
};
</script>

<template>
  <div
    :class="$style.indent"
  >
    <div 
      :class="$style.collapser"
      @click="collapseExpand"
    />
    <template v-if="!isHidden">
      <slot />
    </template>
    <div
      v-else
      :class="$style.collapsed"
      @click="isHidden = false"
    >
      ⇩ Show
    </div>
  </div>
</template>

<style module>
.indent {
  position: relative;
  padding: 4px 0 0 20px;
}

.collapsed {
  color: #555;
  cursor: pointer;
}

.collapser {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  cursor: pointer;
  width: 20px;

  &::before {
    content: ' ';
    position: absolute;
    left: 50%;
    transform: translate(-50%, 0);
    top: 3px;
    bottom: 3px;
    width: 2px;
    background-color: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
  }

  &:hover::before {
    background-color: rgb(20, 146, 250);
  }
}
</style>
