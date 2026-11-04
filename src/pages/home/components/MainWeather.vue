<script setup lang="ts">
import { i18n } from '@/utils'

interface DailyWeather {
  date: string
  code: number
  max: number
  min: number
}

type WeatherGroup = 'clear' | 'night' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunder'

/** 固定展示广州白云，时区跟随当地 */
const LOCATION = {
  lat: 23.1579,
  lon: 113.2731,
  timezone: 'Asia/Shanghai',
}
const CACHE_KEY = 'moon-weather-baiyun'
const CACHE_TTL = 30 * 60 * 1000

const texts = {
  'zh-CN': { location: '广州 · 白云', title: '未来一周', today: '今天' },
  'en': { location: 'Baiyun, Guangzhou', title: 'Next 7 days', today: 'Today' },
  'ja': { location: '広州・白雲', title: '週間天気', today: '今日' },
}

const groupIcons: Record<WeatherGroup, string> = {
  clear: 'i-carbon:sunny',
  night: 'i-carbon:moon',
  partly: 'i-carbon:partly-cloudy',
  cloudy: 'i-carbon:cloudy',
  fog: 'i-carbon:fog',
  rain: 'i-carbon:rain',
  snow: 'i-carbon:snow',
  thunder: 'i-carbon:thunderstorm',
}

/** WMO 天气码归并成展示用的天气类型 */
function groupOf(code: number, isDay = true): WeatherGroup {
  if (code === 0)
    return isDay ? 'clear' : 'night'
  if (code === 1 || code === 2)
    return 'partly'
  if (code === 3)
    return 'cloudy'
  if (code === 45 || code === 48)
    return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return 'snow'
  if (code >= 95)
    return 'thunder'
  return 'rain'
}

const localeKey = computed(() => {
  const locale = i18n.global.locale.value as string
  return locale === 'zh-CN' || locale === 'ja' ? locale : 'en'
})

const copy = computed(() => texts[localeKey.value])

const days = ref<DailyWeather[]>([])

function readCache(): DailyWeather[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw)
      return null
    const cache = JSON.parse(raw) as { updatedAt: number; days: DailyWeather[] }
    return Date.now() - cache.updatedAt < CACHE_TTL ? cache.days : null
  }
  catch {
    return null
  }
}

async function loadWeather() {
  const cached = readCache()
  if (cached?.length) {
    days.value = cached
    return
  }

  try {
    const params = new URLSearchParams({
      latitude: String(LOCATION.lat),
      longitude: String(LOCATION.lon),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: LOCATION.timezone,
      forecast_days: '7',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    const daily = (await res.json())?.daily
    if (!daily?.time?.length)
      return

    const list: DailyWeather[] = daily.time.map((date: string, i: number) => ({
      date,
      code: daily.weather_code[i],
      max: Math.round(daily.temperature_2m_max[i]),
      min: Math.round(daily.temperature_2m_min[i]),
    }))
    days.value = list
    localStorage.setItem(CACHE_KEY, JSON.stringify({ updatedAt: Date.now(), days: list }))
  }
  catch {
    // 天气拿不到时保持静默，不展示占位
  }
}

function weekdayLabel(date: string, index: number) {
  if (index === 0)
    return copy.value.today
  return new Intl.DateTimeFormat(localeKey.value, { weekday: 'short' }).format(new Date(`${date}T00:00:00`))
}

function dateLabel(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

let refreshTimer: ReturnType<typeof setInterval>

onMounted(() => {
  loadWeather()
  refreshTimer = setInterval(loadWeather, CACHE_TTL)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
})
</script>

<template>
  <div v-if="days.length" class="weather" text="$text-c-1">
    <div class="weather__head">
      <span i-carbon:location class="weather__pin" />
      <span>{{ copy.location }}</span>
      <span class="weather__dot">·</span>
      <span>{{ copy.title }}</span>
    </div>
    <div class="weather__days">
      <div v-for="(day, i) in days" :key="day.date" class="weather__day">
        <div class="weather__weekday">{{ weekdayLabel(day.date, i) }}</div>
        <div :class="groupIcons[groupOf(day.code)]" class="weather__icon" />
        <div class="weather__temp">
          <span>{{ day.max }}°</span>
          <span class="weather__min">/ {{ day.min }}°</span>
        </div>
        <div class="weather__date">{{ dateLabel(day.date) }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.weather {
  width: 100%;
  max-width: 640px;
  margin: 8px auto 0;
}
.weather__head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  opacity: 0.55;
}
.weather__pin {
  width: 14px;
  height: 14px;
}
.weather__dot {
  opacity: 0.6;
}
.weather__days {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(72px, 1fr);
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
.weather__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 10px;
  border-radius: 8px;
  transition: background 0.3s;

  &:hover {
    background: var(--site-hover-c);
  }
}
.weather__weekday {
  font-size: 12px;
  opacity: 0.6;
}
.weather__icon {
  width: 22px;
  height: 22px;
}
.weather__temp {
  display: flex;
  gap: 4px;
  font-size: 13px;
}
.weather__min {
  opacity: 0.45;
}
.weather__date {
  font-size: 11px;
  opacity: 0.45;
}

// 窄屏不横向滚动，七天均分一屏，温度竖排避免折行
@media (max-width: 639px) {
  .weather__days {
    grid-auto-columns: minmax(0, 1fr);
    gap: 2px;
    overflow: visible;
  }
  .weather__temp {
    flex-direction: column;
    gap: 0;
    font-size: 12px;
  }
}
</style>
