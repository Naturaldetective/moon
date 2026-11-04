<script setup lang="ts">
import { vOnClickOutside } from '@vueuse/components'
import type { Group, Search, Site } from '@/types'
import { debounce, getFaviconUrl, getText, search as searchSetting } from '@/utils'
import searchEngine from '@/utils/search-engine'

const settingStore = useSettingStore()
const siteStore = useSiteStore()

const searchList = searchSetting.children

const keyword = ref('')

const curSearchIndex = ref(0)

const searchInputRef = ref<HTMLInputElement>()

function initcurSearchIndex() {
  curSearchIndex.value = searchList.findIndex(search => search.key === settingStore.settings.search) || 0
}

watch(() => settingStore.settings.search, () => {
  initcurSearchIndex()
}, { immediate: true })

/* 站内链接：把所有分类 / 分组下的站点摊平，按名称匹配 */
interface SiteMatch {
  site: Site
  path: string
}

const allSites = computed<SiteMatch[]>(() => {
  const list: SiteMatch[] = []

  function walk(groups: Group[], trail: string[]) {
    for (const group of groups) {
      const groupTrail = [...trail, getText(group.name)]
      for (const site of group.siteList || [])
        list.push({ site, path: groupTrail.join(' / ') })
      if (group.children?.length)
        walk(group.children, groupTrail)
    }
  }

  for (const cate of siteStore.data)
    walk(cate.groupList, [getText(cate.name)])

  return list
})

const MAX_SITE_RESULTS = 8

const siteResults = computed<SiteMatch[]>(() => {
  const kw = keyword.value.trim().toLocaleLowerCase()
  if (!kw || kw.startsWith('#'))
    return []

  const scored: { match: SiteMatch; score: number }[] = []
  for (const match of allSites.value) {
    const name = (match.site.name || '').toLocaleLowerCase()
    const url = (match.site.url || '').toLocaleLowerCase()
    const desc = (match.site.desc || '').toLocaleLowerCase()
    const path = match.path.toLocaleLowerCase()
    let score = -1
    if (name === kw)
      score = 0
    else if (name.startsWith(kw))
      score = 1
    else if (name.includes(kw))
      score = 2
    else if (url.includes(kw))
      score = 3
    else if (desc.includes(kw))
      score = 4
    // 命中所属分类 / 分组名时排在最后
    else if (path.includes(kw))
      score = 5
    if (score >= 0)
      scored.push({ match, score })
  }

  return scored.sort((a, b) => a.score - b.score).slice(0, MAX_SITE_RESULTS).map(item => item.match)
})

function openSite(site: Site) {
  const target = settingStore.getSettingItem('linkStrategy').value as string
  if (target === '_self')
    window.location.href = site.url
  else
    window.open(site.url, '_blank')
  closePanel()
  searchInputRef.value?.blur()
}

/* 搜索引擎跳转 */
function search(e?: any) {
  if (
    !keyword.value.trim()
    // 防止中文输入时回车键触发搜索
    || e?.isComposing
  )
    return
  const currentSearch = searchList[curSearchIndex.value]
  window.open(`${currentSearch.value.url}?${currentSearch.value.wd}=${encodeURIComponent(keyword.value)}`)
  closePanel()
  searchInputRef.value?.blur()
}

function _getFavicon(search: Search) {
  return search.favicon || getFaviconUrl(search.url)
}

/* Search engine selection */
const selectionVisible = ref(false)

function changeSearch(i: number) {
  curSearchIndex.value = i
  toggleSelection()
}

function toggleSelection() {
  selectionVisible.value = !selectionVisible.value
}

/* Handle keydown */
function handleKeydown(e: KeyboardEvent) {
  // - 快捷切换搜索引擎
  if (e.key === '#' && !keyword.value.length)
    selectionVisible.value = true
  const target = (keyword.value + e.key).match(/^#[a-z]+/)
  if (target) {
    const s = target[0].replace('#', '')
    const index = searchList.findIndex(item => item.value.s === s)
    if (index === -1)
      return
    e.preventDefault()
    changeSearch(index)
    keyword.value = ''
    selectionVisible.value = false
  }
  // 关闭搜索引擎选择
  if (keyword.value === '#' && e.key === 'Backspace')
    selectionVisible.value = false
}

/* Keyword recommend */
const panelOpen = ref(false)
const engineSuggestions = ref<string[]>([])
const selectedIndex = ref(-1)

const requestEngApi = debounce(() => {
  const curSearch = searchList[curSearchIndex.value]
  searchEngine.complete(curSearch.key as any, keyword.value, (params: Params) => {
    if (!panelOpen.value || keyword.value.trim().length === 0)
      return
    engineSuggestions.value = params.list
  })
}, 100)

interface Params {
  eng: string
  list: string[]
  wd: string
}

/* 搜索框下拉：站内链接在前，搜索引擎补全在后 */
type PanelItem = { type: 'site'; match: SiteMatch } | { type: 'engine'; text: string }

const panelItems = computed<PanelItem[]>(() => [
  ...siteResults.value.map(match => ({ type: 'site' as const, match })),
  ...engineSuggestions.value.map(text => ({ type: 'engine' as const, text })),
])

const panelVisible = computed(() => panelOpen.value && !!keyword.value.trim() && !keyword.value.startsWith('#') && panelItems.value.length > 0)

function closePanel() {
  panelOpen.value = false
  selectedIndex.value = -1
  engineSuggestions.value = []
}

function moveSelection(step: number) {
  const total = panelItems.value.length
  if (!total)
    return
  const next = selectedIndex.value + step
  if (next < 0)
    selectedIndex.value = total - 1
  else if (next >= total)
    selectedIndex.value = -1
  else
    selectedIndex.value = next
}

function handleEnter(e: KeyboardEvent) {
  // 输入法确认候选词的回车不应触发打开链接 / 搜索
  if (e.isComposing)
    return
  const item = panelItems.value[selectedIndex.value]
  if (item?.type === 'site') {
    openSite(item.match.site)
    return
  }
  if (item?.type === 'engine')
    keyword.value = item.text
  search(e)
}

function handleCloseClick() {
  keyword.value = ''
  closePanel()
  searchInputRef.value?.focus()
}

function handleInput() {
  selectedIndex.value = -1
  engineSuggestions.value = []
  if (keyword.value.indexOf('#') === 0 || !keyword.value.trim()) {
    closePanel()
    return
  }
  panelOpen.value = true
  requestEngApi()
}

function jumpSearch(text: string) {
  keyword.value = text
  search()
}

function handleHover(i: number) {
  selectedIndex.value = i
}

function handleLeave() {
  selectedIndex.value = -1
}

function handleFocus() {
  handleInput()
}

function handleFocusShortcut(e: KeyboardEvent) {
  if (!(e.ctrlKey && e.key === 'Enter'))
    return
  searchInputRef.value?.focus()
  handleInput()
}

/* Icon style */
const { iconStyle } = useIconStyle()

onMounted(() => {
  window.addEventListener('keydown', handleFocusShortcut)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleFocusShortcut)
})
</script>

<template>
  <div dark="bg-$bg-c" bg="gray-200" relative mx-auto flex h-44 w="full sm:450!">
    <!-- 站内链接 + 搜索引擎补全 -->
    <div
      v-show="panelVisible"
      v-on-click-outside="closePanel"
      absolute z-9 w-full of-y-auto l-0 t-100p bg="$page-bg-c" border="2 t-0"
      style="max-height: 336px;"
      @mouseleave="handleLeave()"
    >
      <!-- 按我的命名匹配到的链接 -->
      <template v-if="siteResults.length">
        <div flex items-center gap-x-4 px-12 py-6 text="12 $text-c-1" op-70>
          <span i-carbon:link />
          <span>{{ $t('search.siteSection') }}</span>
        </div>
        <a
          v-for="(item, i) in siteResults" :key="item.site.id"
          flex cursor-pointer items-center gap-x-8 px-12 py-7
          :class="{ 'bg-$site-hover-c': selectedIndex === i }"
          @mouseover="handleHover(i)"
          @click="openSite(item.site)"
        >
          <img
            :src="item.site.favicon || getFaviconUrl(item.site.url)" :style="iconStyle"
            shrink-0 object-contain h-24 w-24
            @error="(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')"
          >
          <div flex-1 min-w-0>
            <div text="15 $text-c-1" ellipsis-1>{{ item.site.name }}</div>
            <div text-12 op-50 ellipsis-1>{{ item.path }}</div>
          </div>
          <div i-carbon:arrow-up-right text-16 op-40 />
        </a>
      </template>
      <!-- 搜索引擎关键词补全 -->
      <template v-if="engineSuggestions.length">
        <div v-if="siteResults.length" border="t-1 gray-200 dark:dark-700" mt-4 />
        <div
          v-for="(item, i) in engineSuggestions" :key="`${item}-${i}`"
          cursor-pointer px-12 py-7 text-15
          :class="{ 'bg-$site-hover-c': selectedIndex === siteResults.length + i }"
          @mouseover="handleHover(siteResults.length + i)"
          @click="jumpSearch(item)"
        >
          {{ item }}
        </div>
      </template>
    </div>
    <!-- Search engine logo -->
    <div v-on-click-outside="() => selectionVisible = false" relative flex-center shrink-0 w-44>
      <div hover="op-100" h-full w-full flex-center cursor-pointer op="80" transition-300 @click="toggleSelection">
        <img :src="_getFavicon(searchList[curSearchIndex].value)" :style="iconStyle" h-32 w-32>
      </div>
      <!-- search engine selector -->
      <div v-show="selectionVisible" absolute z-9 l-0 t-100p w-200 bg="$page-bg-c" border="2 t-0">
        <div
          v-for="(item, i) in searchList"
          :key="i"
          hover="bg-$site-hover-c"
          flex cursor-pointer items-center justify-between px-12 py-7
          @click="changeSearch(i)"
        >
          <div flex-center gap-x-8 text="15 $text-c-1">
            <img :src="_getFavicon(item.value)" :style="iconStyle" circle h-20 w-20>
            <div>{{ getText(item.name) }}</div>
            <div ml-4 font-300>{{ `#${item.value.s}` }}</div>
          </div>
          <div v-if="curSearchIndex === i" i-carbon:checkmark text-18 />
        </div>
      </div>
    </div>
    <!-- Input -->
    <div flex items-center w="full">
      <input
        ref="searchInputRef"
        v-model="keyword"
        autofocus
        text="15 $text-c-1"
        h-full w-full bg-inherit op-80
        @keydown.enter="handleEnter"
        @input="handleInput"
        @focus="handleFocus"
        @keydown="handleKeydown"
        @keydown.down.exact="moveSelection(1)"
        @keydown.up.exact="moveSelection(-1)"
        @keydown.ctrl.n.exact="moveSelection(1)"
        @keydown.ctrl.p.exact="moveSelection(-1)"
        @keydown.esc="closePanel"
      >
      <div
        v-if="keyword.length > 0"
        hover="op-80"
        i-carbon:close mr-8 cursor-pointer text-20 op-40 transition duration-300
        @click="handleCloseClick"
      />
    </div>
    <!-- Button -->
    <button flex-center shrink-0 gap-x-4 px-16 btn @click="search">
      <span i-carbon:search inline-block text-16 />
    </button>
  </div>
</template>
