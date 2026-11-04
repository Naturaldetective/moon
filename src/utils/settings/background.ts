import type { BackgroundColor, SettingItemChildren } from '@/types'
import { SettingItem } from '@/types'

const backgroundChildren: SettingItemChildren<BackgroundColor> = [
  {
    name: () => t('settings.background.cloudWhite'),
    key: 'CloudWhite',
    value: { light: '#f3f4f6', dark: '#1e1e20' },
  },
  {
    name: () => t('settings.background.warmSand'),
    key: 'WarmSand',
    value: { light: '#f7f2e9', dark: '#211e19' },
  },
  {
    name: () => t('settings.background.mistGreen'),
    key: 'MistGreen',
    value: { light: '#eef3ee', dark: '#1a201b' },
  },
  {
    name: () => t('settings.background.mistBlue'),
    key: 'MistBlue',
    value: { light: '#eaf0f7', dark: '#191d23' },
  },
  {
    name: () => t('settings.background.mistPurple'),
    key: 'MistPurple',
    value: { light: '#f1eef7', dark: '#1d1a22' },
  },
  {
    name: () => t('settings.background.paperPink'),
    key: 'PaperPink',
    value: { light: '#f8eef0', dark: '#221c1e' },
  },
]

export const background = new SettingItem({
  name: () => t('settings.background.title'),
  key: 'Background',
  children: backgroundChildren,
  defaultKey: 'CloudWhite',
})
