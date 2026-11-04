<script setup lang="ts">
import { i18n } from '@/utils'

interface Task {
  id: string
  text: string
  done: boolean
  createdAt: number
  /** 归属日期 YYYY-MM-DD */
  date: string
}

interface WeekRecord {
  weekStart: string
  tasks: Task[]
}

const STORAGE_KEY = 'moon-tasks'

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 本周周一 */
function getWeekStart(base = new Date()) {
  const date = new Date(base)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

const activeWeek = ref(toDateString(getWeekStart()))
const todayKey = ref(toDateString(new Date()))

const weekDays = computed(() => {
  const start = new Date(`${activeWeek.value}T00:00:00`)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    return date
  })
})

const localeKey = computed(() => {
  const locale = i18n.global.locale.value as string
  return locale === 'zh-CN' || locale === 'ja' ? locale : 'en'
})

const weekLabels = computed(() => weekDays.value.map(day => new Intl.DateTimeFormat(localeKey.value, { weekday: 'short' }).format(day)))

const tasks = ref<Task[]>([])
const history = ref<WeekRecord[]>([])
const draft = ref('')

/** 当前选中的日期，默认今天 */
const selectedDate = ref(todayKey.value)

/** 选中日期的任务 */
const dayTasks = computed(() => tasks.value
  .filter(task => task.date === selectedDate.value)
  .sort((a, b) => a.createdAt - b.createdAt))

/** 每天的任务数，用于周条上的小计数 */
const countsByDate = computed(() => {
  const map: Record<string, number> = {}
  for (const task of tasks.value)
    map[task.date] = (map[task.date] ?? 0) + 1
  return map
})

/** 选中某一天，过去的日期不再安排任务 */
function selectDay(date: Date) {
  const key = toDateString(date)
  if (key < todayKey.value)
    return
  selectedDate.value = key
}

/** 选中日文字，如「周四 11/6」 */
const selectedLabel = computed(() => {
  const index = weekDays.value.findIndex(day => toDateString(day) === selectedDate.value)
  if (index < 0)
    return ''
  const day = weekDays.value[index]
  return `${weekLabels.value[index]} ${day.getMonth() + 1}/${day.getDate()}`
})

const doneCount = computed(() => tasks.value.filter(task => task.done).length)

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    weekStart: activeWeek.value,
    tasks: tasks.value,
    history: history.value,
  }))
}

function load() {
  activeWeek.value = toDateString(getWeekStart())
  todayKey.value = toDateString(new Date())

  let data: { weekStart: string; tasks: Task[]; history: WeekRecord[] } | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    data = raw ? JSON.parse(raw) : null
  }
  catch {
    data = null
  }

  tasks.value = (data?.tasks ?? []).map(task => ({ ...task, date: task.date ?? data?.weekStart ?? todayKey.value }))
  history.value = data?.history ?? []
  selectedDate.value = todayKey.value

  // 跨周（每周一）：已完成的任务存入历史
  if (!data || data.weekStart !== activeWeek.value) {
    archiveDone(data?.weekStart ?? activeWeek.value)
    tasks.value = tasks.value.filter(task => !task.done)
    persist()
  }

  // 没做完的任务每天自动滚到当天
  if (rollOverdueTasks())
    persist()
}

/** 把过期仍未完成的任务滚到今天，返回是否有变动 */
function rollOverdueTasks() {
  const today = todayKey.value
  let changed = false
  for (const task of tasks.value) {
    if (!task.done && task.date < today) {
      task.date = today
      changed = true
    }
  }
  return changed
}

/** 把已完成的任务归入某一周的历史记录（同周去重） */
function archiveDone(weekStart: string) {
  const done = tasks.value.filter(task => task.done)
  if (!done.length)
    return
  const record = history.value.find(item => item.weekStart === weekStart)
  if (record) {
    const ids = new Set(record.tasks.map(task => task.id))
    record.tasks.push(...done.filter(task => !ids.has(task.id)))
  }
  else {
    history.value.unshift({ weekStart, tasks: done })
  }
}

function addTask() {
  const text = draft.value.trim()
  if (!text)
    return
  tasks.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    done: false,
    createdAt: Date.now(),
    date: selectedDate.value,
  })
  draft.value = ''
  persist()
}

function toggleTask(id: string) {
  const task = tasks.value.find(item => item.id === id)
  if (!task)
    return
  task.done = !task.done
  persist()
}

function removeTask(id: string) {
  tasks.value = tasks.value.filter(task => task.id !== id)
  persist()
}

function clearHistory() {
  history.value = []
  persist()
}

function formatRange(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
}

function formatDay(date: string) {
  const day = new Date(`${date}T00:00:00`)
  return `${day.getMonth() + 1}/${day.getDate()}`
}

/** 历史记录按日期排序展示 */
function sortByDate(list: Task[]) {
  return [...list].sort((a, b) => a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date))
}

let dayTimer: ReturnType<typeof setInterval>

onMounted(() => {
  load()
  // 跨过零点时把没做完的任务滚到新的一天，跨周则顺带归档
  dayTimer = setInterval(() => {
    if (toDateString(new Date()) !== todayKey.value)
      load()
  }, 60 * 1000)
})

onBeforeUnmount(() => {
  clearInterval(dayTimer)
})
</script>

<template>
  <section class="tasks" p="0 sm:24">
    <header class="tasks__head">
      <h2 class="tasks__title">
        {{ $t('task.title') }}
      </h2>
      <span v-if="tasks.length" class="tasks__progress">{{ doneCount }} / {{ tasks.length }}</span>
    </header>

    <!-- 本周日期条：周一到周日，点击选择要给哪天安排任务 -->
    <div class="week">
      <div
        v-for="(day, i) in weekDays" :key="i"
        class="week__day"
        :class="{
          'week__day--today': toDateString(day) === todayKey,
          'week__day--selected': toDateString(day) === selectedDate,
          'week__day--past': toDateString(day) < todayKey,
        }"
        @click="selectDay(day)"
      >
        <span class="week__label">{{ weekLabels[i] }}</span>
        <span class="week__date">{{ day.getMonth() + 1 }}/{{ day.getDate() }}</span>
        <span class="week__count" :class="{ 'week__count--none': !countsByDate[toDateString(day)] }">{{ countsByDate[toDateString(day)] || 0 }}</span>
      </div>
    </div>

    <!-- 添加到选中日期 -->
    <div class="add">
      <n-input v-model:value="draft" :placeholder="$t('task.addToDay', { day: selectedLabel })" @keydown.enter="addTask" />
      <n-button type="primary" secondary :focusable="false" @click="addTask">
        <template #icon>
          <div i-carbon:add />
        </template>
        {{ $t('task.add') }}
      </n-button>
    </div>

    <!-- 选中日期的任务 -->
    <ul v-if="dayTasks.length" class="list">
      <li
        v-for="task in dayTasks" :key="task.id"
        class="list__item" :class="{ 'list__item--done': task.done }"
        bg="white dark:dark-800"
      >
        <div class="check" :class="{ 'check--on': task.done }" @click="toggleTask(task.id)">
          <span v-if="task.done" i-carbon:checkmark />
        </div>
        <span class="list__text">{{ task.text }}</span>
        <div i-carbon:close class="list__del" @click="removeTask(task.id)" />
      </li>
    </ul>
    <p v-else class="empty">
      {{ $t('task.empty') }}
    </p>

    <!-- 历史任务 -->
    <section class="history">
      <div class="history__head">
        <h3 class="history__title">
          {{ $t('task.history') }}
        </h3>
        <n-popconfirm v-if="history.length" @positive-click="clearHistory">
          <template #trigger>
            <span class="history__clear">{{ $t('task.clearHistory') }}</span>
          </template>
          {{ $t('task.clearConfirm') }}
        </n-popconfirm>
      </div>

      <p v-if="!history.length" class="empty">
        {{ $t('task.historyEmpty') }}
      </p>
      <div v-for="record in history" :key="record.weekStart" class="history__week">
        <div class="history__range">
          {{ formatRange(record.weekStart) }}
          <span class="history__count">{{ $t('task.historyDone', { n: record.tasks.length }) }}</span>
        </div>
        <ul class="list list--history">
          <li
            v-for="task in sortByDate(record.tasks)" :key="task.id"
            class="list__item" :class="{ 'list__item--done': task.done }"
            bg="white dark:dark-800"
          >
            <div class="check check--static" :class="{ 'check--on': task.done }">
              <span v-if="task.done" i-carbon:checkmark />
            </div>
            <span v-if="task.date" class="list__date">{{ formatDay(task.date) }}</span>
            <span class="list__text">{{ task.text }}</span>
          </li>
        </ul>
      </div>
    </section>
  </section>
</template>

<style lang="scss" scoped>
.tasks {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}
.tasks__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.tasks__title {
  font-size: 20px;
  font-weight: 600;
}
.tasks__progress {
  font-size: 13px;
  opacity: 0.5;
}

/* 周一到周日 */
.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 20px;
}
.week__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  opacity: 0.5;
  cursor: pointer;
  transition: background 0.3s, border-color 0.3s, opacity 0.3s;

  &:hover:not(.week__day--past) {
    background: var(--site-hover-c);
    opacity: 1;
  }
}
.week__day--past {
  cursor: default;
  opacity: 0.3;
}
.week__day--today {
  color: var(--primary-c);
  font-weight: 600;
  opacity: 1;
}
.week__day--selected {
  border-color: var(--primary-c);
  background: var(--site-hover-c);
  opacity: 1;
}
.week__date {
  font-size: 12px;
}
.week__count {
  height: 14px;
  font-size: 10px;
  line-height: 14px;
  opacity: 0.7;
}
.week__count--none {
  opacity: 0;
}

/* 添加 */
.add {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

/* 任务列表 */
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: opacity 0.3s;
}
.list__item--done .list__text {
  text-decoration: line-through;
  opacity: 0.45;
}
.list__text {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.list__date {
  flex: 0 0 auto;
  font-size: 12px;
  opacity: 0.4;
}
.list__del {
  width: 16px;
  height: 16px;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}
.list__item:hover .list__del {
  opacity: 0.4;
}
.list__item:hover .list__del:hover {
  opacity: 0.8;
}

/* 勾选 */
.check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border: 1px solid rgba(127, 127, 127, 0.55);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-c);
  }

  span {
    width: 12px;
    height: 12px;
    color: #fff;
  }
}
.check--on {
  border-color: var(--primary-c);
  background: var(--primary-c);
}
.check--static {
  cursor: default;
  pointer-events: none;
}

.empty {
  padding: 12px 0;
  font-size: 13px;
  opacity: 0.45;
}

/* 历史 */
.history {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(127, 127, 127, 0.2);
}
.history__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.history__title {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.7;
}
.history__clear {
  font-size: 12px;
  opacity: 0.45;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}
.history__week + .history__week {
  margin-top: 16px;
}
.history__range {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  opacity: 0.5;
}
.history__count {
  opacity: 0.7;
}
.list--history .list__item {
  padding: 8px 12px;
}
</style>
