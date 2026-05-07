import { useLocalStorage } from '@vueuse/core'
import type { ComputedRef } from 'vue'

const STORAGE_KEY = 'moon-nav-group-collapsed-v1'

const collapsedMap = useLocalStorage<Record<string, boolean>>(STORAGE_KEY, {})

function makeKey(cateId: number, groupId: number) {
  return `${cateId}:${groupId}`
}

export function usePersistedGroupCollapse(
  cateId: ComputedRef<number>,
  groupId: ComputedRef<number>,
) {
  const isCollapsed = computed(() =>
    collapsedMap.value[makeKey(cateId.value, groupId.value)] === true,
  )

  function toggleCollapsed() {
    const key = makeKey(cateId.value, groupId.value)
    const next = { ...collapsedMap.value }
    if (next[key])
      delete next[key]
    else
      next[key] = true
    collapsedMap.value = next
  }

  return { isCollapsed, toggleCollapsed }
}
