<template>
  <div id="app">
    <JsonFormatterComponent />
  </div>
</template>

<script setup lang="ts">
import JsonFormatterComponent from '@/components/JsonFormatter.vue'
</script>

<style>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
}
</style>