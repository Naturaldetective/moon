<script setup lang="ts">

</script>

<template>
  <div class="app-container">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
}

// 宽屏：左侧 200px 固定侧边栏 + 48px 间距，内容区最宽 1320（卡片保持四列不拥挤）
@media (min-width: 900px) {
  .app-container {
    max-width: 1568px;
    margin-left: 0;
    padding-left: 248px;
  }
}
</style>
