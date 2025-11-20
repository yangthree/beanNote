const auth = require('./auth.js')

const DEVICE_TYPES = Object.freeze([
  { key: 'pour_over', label: '手冲设备' },
  { key: 'espresso', label: '意式设备' },
  { key: 'grinder', label: '磨豆机' },
  { key: 'other', label: '其他设备' }
])

const STORAGE_PREFIX = 'userDevices'

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getStorageKey(openId) {
  const id = openId || auth.getStoredOpenId() || 'guest'
  return `${STORAGE_PREFIX}_${id}`
}

function loadDevices(openId) {
  const key = getStorageKey(openId)
  try {
    const list = wx.getStorageSync(key)
    return Array.isArray(list) ? list : []
  } catch (err) {
    console.warn('[deviceModel] load failed', err)
    return []
  }
}

function saveDevices(openId, list) {
  const key = getStorageKey(openId)
  try {
    wx.setStorageSync(key, list)
  } catch (err) {
    console.warn('[deviceModel] save failed', err)
  }
}

function normalizeDevice(device = {}) {
  return {
    id: device.id || generateId(),
    type: device.type || DEVICE_TYPES[0].key,
    name: device.name || '',
    brand: device.brand || '',
    model: device.model || '',
    isDefault: !!device.isDefault,
    createTime: device.createTime || Date.now(),
    updateTime: Date.now()
  }
}

function upsertDevice(openId, payload = {}) {
  const normalized = normalizeDevice(payload)
  let list = loadDevices(openId)
  const index = list.findIndex(item => item.id === normalized.id)

  if (normalized.isDefault) {
    list = list.map(item =>
      item.type === normalized.type
        ? { ...item, isDefault: false }
        : item
    )
  } else if (index >= 0) {
    normalized.isDefault = list[index].isDefault
  }

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

  saveDevices(openId, list)
  return normalized
}

function deleteDevice(openId, id) {
  const list = loadDevices(openId)
  const filtered = list.filter(item => item.id !== id)
  saveDevices(openId, filtered)
  return filtered
}

function setDefaultDevice(openId, id) {
  let list = loadDevices(openId)
  const target = list.find(item => item.id === id)
  if (!target) return list
  list = list.map(item => {
    if (item.id === id) {
      return { ...item, isDefault: true }
    }
    if (item.type === target.type) {
      return { ...item, isDefault: false }
    }
    return item
  })
  saveDevices(openId, list)
  return list
}

function getDeviceById(openId, id) {
  return loadDevices(openId).find(item => item.id === id) || null
}

function getDeviceGroups(openId) {
  const list = loadDevices(openId)
  return DEVICE_TYPES.map(type => ({
    key: type.key,
    label: type.label,
    devices: list
      .filter(item => item.type === type.key)
      .sort((a, b) => {
        if (a.isDefault === b.isDefault) {
          return b.updateTime - a.updateTime
        }
        return a.isDefault ? -1 : 1
      })
  }))
}

module.exports = {
  DEVICE_TYPES,
  loadDevices,
  saveDevices,
  upsertDevice,
  deleteDevice,
  setDefaultDevice,
  getDeviceById,
  getDeviceGroups
}

