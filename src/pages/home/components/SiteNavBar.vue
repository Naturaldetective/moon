<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Category } from '@/types'

// 任务页等非首页场景下不把分类显示为选中态
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })

const modalStore = useModalStore()
const siteStore = useSiteStore()
const route = useRoute()
const router = useRouter()

function handleCateClick(cateIndex: number) {
  if (route.name === 'setting' && siteStore.cateIndex === cateIndex) {
    modalStore.showModal('update', 'cate')
  }
  else {
    siteStore.setCateIndex(cateIndex)
    // 从任务页点击分类时回到首页查看站点
    if (route.name === 'tasks')
      router.push('/')
  }
}
const settingStore = useSettingStore()
const { draggableOptions, handleStart, handleEnd } = useDrag()

// 分类图标：按名称关键词匹配，未识别的分类用通用图标
const cateIcons: [RegExp, string][] = [
  [/工作|办公|work/i, 'i-carbon:building'],
  [/安全|运营|security/i, 'i-carbon:security'],
  [/mine|我的/i, 'i-carbon:user'],
  [/wow/i, 'i-carbon:star'],
  [/系统|sys/i, 'i-carbon:chip'],
  [/攻击|渗透|红队|attack|pentest|hack/i, 'i-carbon:warning-alt'],
  [/ctf|靶场|比赛/i, 'i-carbon:flag'],
]

function getCateIcon(name: string) {
  return cateIcons.find(([reg]) => reg.test(name))?.[1] ?? 'i-carbon:folder'
}

function handleDragEnd(e: any) {
  handleEnd()
  const { oldIndex, newIndex } = e
  const { cateIndex } = siteStore
  // 若移动了当前分类 跟随移动
  if (oldIndex === cateIndex && newIndex !== cateIndex) {
    siteStore.setCateIndex(newIndex)
  }
  // 若移动其他分类
  else {
    // 若在同一侧移动 不会改变当前分类
    if (
      (oldIndex < cateIndex && newIndex < cateIndex)
      || (oldIndex > cateIndex && newIndex > cateIndex)
    )
      return
    if (oldIndex < cateIndex)
      siteStore.setCateIndex(cateIndex - 1)
    else if (oldIndex > cateIndex)
      siteStore.setCateIndex(cateIndex + 1)
  }
}
</script>

<template>
  <section class="nav-bar">
    <draggable
      class="nav"
      :list="siteStore.data"
      item-key="id"
      :component-data="{
        tag: 'div',
        type: 'transition-group',
      }"
      v-bind="draggableOptions"
      @start="handleStart"
      @end="handleDragEnd"
    >
      <template #item="{ element: cate, index: i }: { element: Category, index: number }">
        <div
          class="dragging nav__item shrink-0"
          :class="{
            'hover:text-$primary-c': !settingStore.isSetting,
            'nav__item--active': props.active && siteStore.cateIndex === i,
          }"
          flex cursor-pointer items-center px-8 transition-color duration-300 gap-8 h-40
          @click="handleCateClick(i)"
        >
          <span class="nav__icon" :class="getCateIcon(cate.name)" />
          {{ cate.name }}
        </div>
      </template>
    </draggable>
    <n-button
      v-if="settingStore.isSetting"
      class="nav-add"
      type="primary"
      size="small"
      :focusable="false"
      secondary circle
      @click="modalStore.showModal('add', 'cate')"
    >
      <template #icon>
        <div i-carbon:add />
      </template>
    </n-button>
  </section>
</template>

<style lang="scss" scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 24px;
  row-gap: 8px;
  width: 90%;
  overflow-x: scroll;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
}
.nav-add {
  margin-left: 12px;
}
.nav__icon {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  opacity: 0.7;
  transition: opacity 0.3s;
}
.nav__item:hover .nav__icon,
.nav__item--active .nav__icon {
  opacity: 1;
}
.nav__item {
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 0;
    height: 2px;
    border-radius: 2px;
    background-color: var(--primary-c);
    transition: all .3s;
    left: 50%;
    transform: translateX(-50%);
  }
  &--active {
    color: var(--primary-c);
    &::after {
      width: 100%;
    }
  }
}

// 宽屏下分类改为左侧侧边栏（宽度与吸顶由父级布局决定），站点列表占据右侧
@media (min-width: 900px) {
  .nav-bar {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
  }
  .nav {
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    row-gap: 2px;
    width: 100%;
    overflow: visible;
  }
  .nav__item {
    height: 36px;
    padding: 0 12px;
    justify-content: flex-start;

    // 竖向排列后指示条改为坐在左侧的竖线
    &::after {
      top: 50%;
      bottom: auto;
      left: 0;
      width: 2px;
      height: 0;
      transform: translateY(-50%);
    }
    &--active::after {
      width: 2px;
      height: 18px;
    }
  }
  .nav-add {
    align-self: flex-start;
    margin: 8px 0 0;
  }
}
</style>
