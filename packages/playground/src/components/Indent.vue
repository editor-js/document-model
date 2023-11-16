<template>
  <div :class="$style.indent">
    <slot />
  </div>
</template>

<style module>
.indent {
  padding: 4px 0 0 20px;
}
</style>
