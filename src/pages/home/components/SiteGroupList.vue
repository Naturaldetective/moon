<script setup lang="ts">
import draggable from 'vuedraggable'
import SiteGroupNode from './SiteGroupNode.vue'
import type { Group } from '@/types'

const modalStore = useModalStore()
const siteStore = useSiteStore()
const route = useRoute()

const addGroupVisible = computed(() => route.name === 'setting' && siteStore.data.length > 0)
const { draggableOptions, handleStart, handleEnd } = useDrag()

const settingStore = useSettingStore()
</script>

<template>
  <section py-24>
    <draggable
      class="flex flex-col gap-y-10"
      :list="siteStore.data[siteStore.cateIndex].groupList"
      item-key="id"
      handle=".group__handle"
      drag-class="dragging"
      :component-data="{
        tag: 'div',
        type: 'transition-group',
      }"
      v-bind="draggableOptions"
      @start="handleStart"
      @end="handleEnd"
    >
      <template #item="{ element: group, index: i }: { element: Group, index: number }">
        <SiteGroupNode
          :group="group"
          :group-path="[i]"
          :cate-index="siteStore.cateIndex"
        />
      </template>
    </draggable>
    <!-- Add group button -->
    <div v-if="addGroupVisible" my-12>
      <n-button type="primary" secondary w-full :focusable="false" @click="modalStore.showModal('add', 'group')">
        <template #icon>
          <div i-carbon:add />
        </template>
      </n-button>
    </div>
  </section>
</template>
