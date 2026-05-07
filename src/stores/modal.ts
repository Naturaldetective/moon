import { getCommonProps, getGroupByPath } from '@/utils'

export type ActionType = 'add' | 'update'
export type ActionTarget = 'cate' | 'group' | 'subGroup' | 'site'

const ACTION_NAME = {
  add: () => t('common.add'),
  update: () => t('common.edit'),
}
const TARGET_NAME = {
  cate: () => t('common.cate'),
  group: () => t('common.group'),
  subGroup: () => t('common.subGroup'),
  site: () => t('common.site'),
}
export const useModalStore = defineStore('modal', () => {
  const modalVisible = ref(false)
  const action = ref<ActionType>('add')
  const target = ref<ActionTarget>('site')
  const title = computed(() => ACTION_NAME[action.value as ActionType]() + TARGET_NAME[target.value as ActionTarget]())

  const siteStore = useSiteStore()
  const inputValues = reactive({
    name: '',
    url: '',
    favicon: '',
    desc: '',
  })

  function showModal(actionType: ActionType, actionTarget: ActionTarget, groupPath: number[] | number = -1, siteIndex = -1) {
    action.value = actionType
    target.value = actionTarget
    // 兼容旧调用：number -> number[]
    const path: number[] = typeof groupPath === 'number'
      ? (groupPath !== -1 ? [groupPath] : [0])
      : (groupPath.length ? groupPath : [0])
    siteStore.setGroupPath(path)
    if (siteIndex !== -1)
      siteStore.setSiteIndex(siteIndex)
    modalVisible.value = true
    // init inputs
    if (actionType === 'update') {
      const updateTarget = {
        site: () => {
          const group = getGroupByPath(siteStore.data[siteStore.cateIndex].groupList, path)
          return getCommonProps(inputValues, group.siteList[siteIndex])
        },
        group: () => {
          const group = getGroupByPath(siteStore.data[siteStore.cateIndex].groupList, path)
          return getCommonProps(inputValues, group)
        },
        subGroup: () => {
          const group = getGroupByPath(siteStore.data[siteStore.cateIndex].groupList, path)
          return getCommonProps(inputValues, group)
        },
        cate: () => getCommonProps(inputValues, siteStore.data[siteStore.cateIndex]),
      }
      Object.assign(inputValues, updateTarget[actionTarget]())
    }
  }

  let now = 0
  const commitHandler = {
    add: {
      site: () => siteStore.addSite({ id: now, ...inputValues }),
      group: () => siteStore.addGroup({ id: now, name: inputValues.name, siteList: [] }),
      subGroup: () => siteStore.addSubGroup({ id: now, name: inputValues.name, siteList: [] }),
      cate: () => siteStore.addCate({ id: now, name: inputValues.name, groupList: [] }),
    },
    update: {
      site: () => siteStore.updateSite({ ...inputValues }),
      group: () => siteStore.updateGroup({ name: inputValues.name }),
      subGroup: () => siteStore.updateGroup({ name: inputValues.name }),
      cate: () => siteStore.updateCate({ name: inputValues.name }),
    },
  }
  const deleteHandler = {
    site: () => siteStore.deleteSite(),
    group: () => siteStore.deleteGroup(),
    subGroup: () => siteStore.deleteGroup(),
    cate: () => siteStore.deleteCate(),
  }
  function handleCancel() {
    modalVisible.value = false
  }
  let isCommit = false

  function handleCommit() {
    if (isCommit)
      return
    if (!handleCustomize())
      return

    isCommit = true
    nextTick(() => {
      now = Date.now()
      ;(commitHandler[action.value as ActionType] as Record<string, () => void>)[target.value as ActionTarget]()
      modalVisible.value = false
      setTimeout(() => isCommit = false, 1000)
    })
  }
  function handleDelete() {
    if (!handleCustomize())
      return
    nextTick(() => {
      ;(deleteHandler as Record<string, () => void>)[target.value as ActionTarget]()
      modalVisible.value = false
      // If delete a cate, cateIndex--
      if (target.value === 'cate' && siteStore.cateIndex > 0)
        siteStore.setCateIndex(siteStore.cateIndex - 1)
    })
  }

  function clearInput() {
    let key: keyof typeof inputValues
    for (key in inputValues) inputValues[key] = ''
  }

  return {
    modalVisible,
    action,
    target,
    title,
    inputValues,
    showModal,
    handleCancel,
    handleCommit,
    handleDelete,
    clearInput,
  }
})
