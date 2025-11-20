const auth = require('./auth.js')

const STORAGE_PREFIX = 'userBeanInventory'
const NEAR_EMPTY_THRESHOLD = 20

const STATUS = Object.freeze({
  IN_STOCK: 'in_stock',
  FINISHED: 'finished',
  NEAR_EMPTY: 'near_empty'
})

const ROAST_LEVELS = Object.freeze([
  { key: 'light', label: '浅烘' },
  { key: 'medium', label: '中烘' },
  { key: 'dark', label: '深烘' }
])

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getStorageKey(openId) {
  const id = openId || auth.getStoredOpenId() || 'guest'
  return `${STORAGE_PREFIX}_${id}`
}

function loadBeans(openId) {
  const key = getStorageKey(openId)
  try {
    const list = wx.getStorageSync(key)
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.warn('[beanInventoryModel] load failed', err)
    return []
  }
}

function saveBeans(openId, beans) {
  const key = getStorageKey(openId)
  try {
    wx.setStorageSync(key, beans)
  } catch (err) {
    console.warn('[beanInventoryModel] save failed', err)
  }
}

function deriveStatus(currentWeight, explicitStatus) {
  if (explicitStatus === STATUS.FINISHED || currentWeight <= 0) {
    return STATUS.FINISHED
  }
  if (currentWeight <= NEAR_EMPTY_THRESHOLD) {
    return STATUS.NEAR_EMPTY
  }
  return STATUS.IN_STOCK
}

function normalizeBean(bean = {}) {
  const total = Number(bean.totalWeight) || 0
  let current = bean.currentWeight
  if (current === undefined || current === null || Number.isNaN(Number(current))) {
    current = total
  }
  current = Number(current)
  if (Number.isNaN(current)) current = total
  if (total > 0) {
    current = Math.min(total, current)
  }
  current = Math.max(0, current)

  const status = deriveStatus(current, bean.status)

  return {
    id: bean.id || generateId(),
    name: bean.name || '',
    brand: bean.brand || '',
    roastLevel: bean.roastLevel || ROAST_LEVELS[0].label,
    origin: bean.origin || '',
    totalWeight: total,
    currentWeight: current,
    roastDate: bean.roastDate || '',
    openDate: bean.openDate || '',
    notes: bean.notes || '',
    status,
    createTime: bean.createTime || Date.now(),
    updateTime: Date.now()
  }
}

function upsertBean(openId, payload = {}) {
  const list = loadBeans(openId)
  const normalized = normalizeBean(payload)
  const index = list.findIndex(item => item.id === normalized.id)

  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...normalized,
      createTime: list[index].createTime,
      updateTime: Date.now()
    }
  } else {
    list.push(normalized)
  }

  saveBeans(openId, list)
  return normalized
}

function deleteBean(openId, id) {
  const list = loadBeans(openId)
  const filtered = list.filter(item => item.id !== id)
  saveBeans(openId, filtered)
  return filtered
}

function getBeanById(openId, id) {
  return loadBeans(openId).find(item => item.id === id) || null
}

function getBeansByStatus(openId, status = STATUS.IN_STOCK) {
  const list = loadBeans(openId)
  return list
    .filter(item => {
      if (status === STATUS.IN_STOCK) {
        return item.status === STATUS.IN_STOCK || item.status === STATUS.NEAR_EMPTY
      }
      return item.status === STATUS.FINISHED
    })
    .sort((a, b) => b.updateTime - a.updateTime)
}

function recordConsumption(openId, id, amount) {
  const list = loadBeans(openId)
  const index = list.findIndex(item => item.id === id)
  if (index < 0) return null
  const safeAmount = Math.max(0, Number(amount) || 0)
  const current = Math.max(0, list[index].currentWeight - safeAmount)
  list[index] = {
    ...list[index],
    currentWeight: current,
    status: deriveStatus(current),
    updateTime: Date.now()
  }
  saveBeans(openId, list)
  return list[index]
}

function markFinished(openId, id) {
  const list = loadBeans(openId)
  const index = list.findIndex(item => item.id === id)
  if (index < 0) return null
  list[index] = {
    ...list[index],
    currentWeight: 0,
    status: STATUS.FINISHED,
    updateTime: Date.now()
  }
  saveBeans(openId, list)
  return list[index]
}

function getStats(openId) {
  const list = loadBeans(openId)
  const stats = {
    total: list.length,
    inStock: 0,
    finished: 0,
    nearEmpty: 0
  }
  list.forEach(item => {
    if (item.status === STATUS.FINISHED) {
      stats.finished += 1
    } else if (item.status === STATUS.NEAR_EMPTY) {
      stats.nearEmpty += 1
      stats.inStock += 1
    } else {
      stats.inStock += 1
    }
  })
  return stats
}

module.exports = {
  STATUS,
  ROAST_LEVELS,
  loadBeans,
  saveBeans,
  upsertBean,
  deleteBean,
  getBeanById,
  getBeansByStatus,
  recordConsumption,
  markFinished,
  getStats,
  deriveStatus,
  NEAR_EMPTY_THRESHOLD
}

