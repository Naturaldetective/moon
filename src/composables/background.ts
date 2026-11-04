import { background } from '@/utils'

const settingsCache = loadSettings()
const currentKey = ref(settingsCache?.background ?? background.defaultKey)

// 默认色不写入变量，直接沿用主题在浅色 / 深色下的页面底色
function applyBackground() {
  const item = background.children.find(i => i.key === currentKey.value) ?? background.children[0]
  const style = document.documentElement.style
  if (item.key === background.defaultKey) {
    style.removeProperty('--page-bg-c')
    return
  }
  style.setProperty('--page-bg-c', item.value[isDark.value ? 'dark' : 'light'])
}

export function setupBackground() {
  applyBackground()
  watch([currentKey, isDark], applyBackground)
}

export function toggleBackground(key: string) {
  currentKey.value = key
}
