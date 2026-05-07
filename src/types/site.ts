export interface Site {
  id: number
  name: string
  url: string
  favicon?: string
  desc?: string
}
export interface Group {
  id: number
  name: string
  siteList: Site[]
  children?: Group[]
}
export interface Category {
  id: number
  name: string
  groupList: Group[]
}
