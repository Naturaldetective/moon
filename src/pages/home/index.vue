<script setup lang="ts">
import { RouterLink } from 'vue-router'
import MainHeader from './components/MainHeader.vue'
import MainClock from './components/MainClock.vue'
import MainWeather from './components/MainWeather.vue'
import MainSearch from './components/MainSearch.vue'
import SiteNavBar from './components/SiteNavBar.vue'
import SiteContainer from './components/SiteContainer.vue'
import MainSetting from './components/MainSetting.vue'
import TaskBoard from './components/TaskBoard.vue'

defineOptions({
  name: 'HomePage',
})

const route = useRoute()
const settingStore = useSettingStore()

// 本周任务作为首页的子页面，复用侧边栏布局
const isTasks = computed(() => route.name === 'tasks')

// 宽屏下分类属于全局侧边栏，窄屏仍在内容区顶部横向排列
const isWideScreen = useMediaQuery('(min-width: 900px)')

function getIconClass(routeName: string) {
  return {
    'text-$primary-c opacity-100': routeName === route.name,
  }
}
</script>

<template>
  <TheDoc>
    <div class="page" p="12 sm:24" bg="$page-bg-c" w-full :class="{ no_select: settingStore.isSetting }">
      <!-- 宽屏侧边栏：品牌 — 分类 — 工具，从上到下贯穿整屏 -->
      <aside v-if="isWideScreen" class="page__side">
        <RouterLink class="side__brand" to="/">
          <span i-cus-moonset inline-block transition-300 hover="opacity-80" />
        </RouterLink>
        <div class="side__middle">
          <SiteNavBar class="side__nav" :active="!isTasks" />
          <RouterLink class="side__link" :class="{ 'side__link--active': isTasks }" to="/tasks">
            <span class="side__link-icon" i-carbon:task />
            {{ $t('task.title') }}
          </RouterLink>
        </div>
        <div class="side__tools">
          <RouterLink v-if="settingStore.isSetting" :class="getIconClass('home')" to="/" i-carbon:home icon-btn />
          <RouterLink v-else :class="getIconClass('setting')" to="/setting" i-carbon:settings icon-btn />
          <div i-carbon:moon dark:i-carbon:light icon-btn @click="(e) => toggleDark(e)" />
        </div>
      </aside>
      <div class="page__main">
        <MainHeader v-if="!isWideScreen" />
        <TaskBoard v-if="isTasks" />
        <template v-else>
          <MainClock v-if="!settingStore.isSetting" />
          <MainWeather v-if="!settingStore.isSetting && settingStore.getSettingValue('showWeather')" />
          <MainSearch v-if="!settingStore.isSetting" my-24 />
          <SiteNavBar v-if="!isWideScreen" />
          <SiteContainer :key="settingStore.siteContainerKey" />
          <MainSetting />
          <TheFooter v-if="settingStore.getSettingValue('showFooter')" />
        </template>
      </div>
    </div>
    <Blank />
  </TheDoc>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  align-items: flex-start;
}

// 侧边栏贯穿整个屏幕：品牌置顶、分类紧跟、工具置底
.page__side {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 20;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 200px;
  height: 100vh;
  padding: 24px 20px 24px 28px;
}
.side__brand {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  margin: 4px 0 36px;
  color: var(--primary-c);
  font-size: 32px;

  // 自定义图标集自带 svg 尺寸，这里明确指定渲染大小
  span {
    width: 32px;
    height: 32px;
  }
}
.side__middle {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  min-height: 0;
}
.side__nav {
  flex: 0 1 auto;
  min-height: 0;
}
.side__link {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  height: 36px;
  margin-top: 20px;
  padding: 0 12px;
  font-size: 14px;
  color: inherit;
  transition: color 0.3s;

  &:hover {
    color: var(--primary-c);
  }
  &--active {
    color: var(--primary-c);
    font-weight: 600;
  }
}
.side__link-icon {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
}
.side__tools {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
}

.page__main {
  flex: 1;
  min-width: 0;
}

@media (min-width: 900px) {
  .page__main {
    padding-top: 16px;
  }
}

@media (max-width: 899px) {
  .page {
    flex-direction: column;
    align-items: stretch;
    row-gap: 12px;
  }
}
</style>

<route lang="yaml">
path: /
children:
  - name: setting
    path: setting
    component: /src/components/Blank.vue
  - name: tasks
    path: tasks
    component: /src/components/Blank.vue
</route>
