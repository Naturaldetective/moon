<script setup lang="ts">
import draggable from 'vuedraggable'
import SiteItemCard from './SiteItemCard.vue'
import type { Group, Site, TagMode } from '@/types'

const props = defineProps<{
  group: Group
  groupPath: number[]
  cateIndex: number
}>()

const modalStore = useModalStore()
const siteStore = useSiteStore()
const route = useRoute()
const settingStore = useSettingStore()

const isFullTagMode = computed(() => settingStore.settings.tagMode === 'Full')
const linkStrategyValue = computed(() => settingStore.getSettingItem('linkStrategy').value as string)

function handleSiteClick(groupPath: number[], siteIndex: number, e: Event) {
  if (route.name === 'setting') {
    e.preventDefault()
    modalStore.showModal('update', 'site', groupPath, siteIndex)
  }
}
function handleGroupClick(groupPath: number[]) {
  if (route.name === 'setting')
    modalStore.showModal('update', 'group', groupPath)
}

const { draggableOptions, handleStart, handleEnd } = useDrag()

const isTopLevel = computed(() => props.groupPath.length === 1)
const isHorizontal = computed(() => isTopLevel.value && !(isXsScreen || isFullTagMode.value))

const cateId = computed(() => siteStore.data[props.cateIndex]?.id ?? props.cateIndex)
const groupIdRef = computed(() => props.group.id)
const { isCollapsed, toggleCollapsed } = usePersistedGroupCollapse(cateId, groupIdRef)

const hasContent = computed(() =>
  (props.group.siteList?.length || 0) > 0 || (props.group.children?.length || 0) > 0,
)
function toggleCollapse(e?: Event) {
  e?.stopPropagation()
  if (hasContent.value)
    toggleCollapsed()
}

const siteGridComponentData = computed(() => {
  const base = isFullTagMode.value ? 'site-grid site-grid--full' : 'site-grid site-grid--concise'
  const emptyDropZone = settingStore.isSetting && !(props.group.siteList?.length)
    ? ' site-grid--empty-drop'
    : ''
  return {
    tag: 'div',
    type: 'transition-group',
    class: `${base}${emptyDropZone}`,
  }
})

// 子分组竖线颜色
function getLineColor(level: number) {
  if (level === 2)
    return '#f5a623'

  if (level === 3)
    return '#bd10e0'

  return '#999999'
}

function addSubGroup() {
  modalStore.showModal('add', 'subGroup', props.groupPath)
}
</script>

<template>
  <div
    :class="{
      'mb-6': settingStore.isSetting,
    }"
    relative
  >
    <!-- 顶层分组横向布局，子分组垂直布局 -->
    <div
      :class="{
        'flex w-full min-w-0 gap-x-10 items-start': isHorizontal,
        'flex flex-col': !isHorizontal,
      }"
    >
      <!-- Group header -->
      <div
        :class="[
          isHorizontal ? 'shrink-0 w-52 sm:w-56 md:w-60' : 'w-full',
          settingStore.isSetting ? 'cursor-pointer bg-$site-hover-c' : '',
        ]"
        shrink-0
        @click="handleGroupClick(groupPath)"
      >
        <div
          class="group__handle"
          :class="{
            'group__header--setting': settingStore.isSetting,
            'hover:bg-$site-hover-c': settingStore.isSetting,
          }"
          flex items-center justify-between px-6 h-40
        >
          <div flex items-center gap-x-8>
            <span
              v-if="hasContent"
              class="collapse-btn"
              cursor-pointer text-12
              @click.stop="toggleCollapse"
            >
              {{ isCollapsed ? '▶' : '▼' }}
            </span>
            <div
              :class="{
                'group__name pl-16 py-4': !isHorizontal && isTopLevel,
                'sub-group-name': !isTopLevel,
              }"
              :style="!isTopLevel ? `--sub-line-color: ${getLineColor(groupPath.length)}` : ''"
              whitespace-nowrap text-15 op-80 overflow-hidden
            >
              {{ group.name }}
            </div>
          </div>
          <n-button
            v-if="settingStore.isSetting && !isHorizontal"
            class="btn--add-site" type="primary" circle :focusable="false" @click.stop="modalStore.showModal('add', 'site', groupPath)"
          >
            <template #icon>
              <div i-carbon:add />
            </template>
          </n-button>
        </div>
      </div>
      <!-- Group content -->
      <div
        v-show="!isCollapsed"
        w-full
        class="sub-group-content"
        :class="{ 'min-w-0 flex-1': isHorizontal }"
      >
        <!-- Sites：空列表也需挂载 draggable，否则无法作为跨列表拖放目标 -->
        <draggable
          v-if="group.siteList"
          :list="group.siteList"
          item-key="id"
          group="site"
          handle=".site__handle"
          drag-class="dragging"
          :component-data="siteGridComponentData"
          v-bind="draggableOptions"
          @start="handleStart"
          @end="handleEnd"
        >
          <template #item="{ element: site, index }: { element: Site, index: number }">
            <div>
              <SiteItemCard
                :site="site"
                :type="settingStore.settings.tagMode as TagMode"
                :target="linkStrategyValue"
                :is-setting="settingStore.isSetting"
                :is-dragging="settingStore.isDragging"
                @click="(e) => handleSiteClick(groupPath, index, e)"
              />
            </div>
          </template>
        </draggable>
        <!-- Children groups -->
        <div v-if="group.children && group.children.length" class="children-wrapper mt-6 flex flex-col gap-y-10">
          <draggable
            :list="group.children"
            item-key="id"
            handle=".group__handle"
            drag-class="dragging"
            :component-data="{
              tag: 'div',
              type: 'transition-group',
              class: 'flex flex-col gap-y-8',
            }"
            v-bind="draggableOptions"
            @start="handleStart"
            @end="handleEnd"
          >
            <template #item="{ element: child, index: i }: { element: Group, index: number }">
              <SiteGroupNode
                :group="child"
                :group-path="[...groupPath, i]"
                :cate-index="cateIndex"
              />
            </template>
          </draggable>
        </div>
        <!-- Add buttons for setting mode -->
        <div v-if="settingStore.isSetting" mt-10 flex gap-x-8>
          <n-button type="primary" secondary size="small" :focusable="false" @click="modalStore.showModal('add', 'site', groupPath)">
            <template #icon>
              <div i-carbon:add />
            </template>
            {{ $t('common.site') }}
          </n-button>
          <n-button type="primary" secondary size="small" :focusable="false" @click="addSubGroup">
            <template #icon>
              <div i-carbon:add />
            </template>
            {{ $t('common.subGroup') }}
          </n-button>
        </div>
      </div>
    </div>
    <!-- Desktop add button for top-level only -->
    <div v-if="isTopLevel && settingStore.isSetting && isHorizontal" absolute z-9 flex-center h-40 r-0>
      <n-button class="btn--add-site" type="primary" circle :focusable="false" @click.stop="modalStore.showModal('add', 'site', groupPath)">
        <template #icon>
          <div i-carbon:add />
        </template>
      </n-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.site--setting {
  border: 1px dashed var(--setting-border-c);
}
.group__name {
  position: relative;
  &::before {
    content: '';
    width: 4px;
    height: 72%;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    background: var(--primary-c);
    border-radius: 2px;
  }
}
.sub-group-name {
  position: relative;
  font-size: 14px;
  opacity: 0.85;
  padding-left: 12px;
  font-weight: 500;
  &::before {
    content: '';
    width: 4px;
    height: 60%;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    background: var(--sub-line-color, #999);
    border-radius: 2px;
    opacity: 0.85;
  }
}
.group__header--setting {
  border: 1px dashed var(--setting-border-c);
}

.btn--add-site {
  box-shadow: rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
}

.sub-group-content {
  margin-top: 6px;
  padding-left: 20px;
}
.children-wrapper {
  margin-top: 8px;
  padding-left: 20px;
  padding-bottom: 2px;
  margin-left: 6px;
  border-left: 2px solid var(--site-hover-c);
}
.site-grid {
  display: grid;
  width: 100%;
  gap: 12px;
  align-content: start;
}
.site-grid--concise {
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
}
.site-grid--full {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
@media (min-width: 1024px) {
  .site-grid--full {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}
/* 设置模式下空分组：保证 Sortable 有可命中区域 */
.site-grid--empty-drop {
  min-height: 56px;
  box-sizing: border-box;
  border: 1px dashed var(--setting-border-c);
  border-radius: 6px;
}
.collapse-btn {
  opacity: 0.4;
  transition: opacity 0.2s;
  font-size: 10px;
  color: var(--text-c-1);
  min-width: 1em;
  text-align: center;
}
.group__handle:hover .collapse-btn {
  opacity: 0.85;
}
.collapse-btn:hover {
  opacity: 1 !important;
}
</style>
