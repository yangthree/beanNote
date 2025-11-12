// utils/dataModel.js
// 咖啡豆记录模型（遵循 prd_v1 配置）

/**
 * 枚举：咖啡豆类型
 */
const BEAN_TYPE = Object.freeze({
  POUR_OVER: 'pourOver',   // 手冲
  ESPRESSO: 'espresso'    // 意式
})

/**
 * 枚举：烘焙度
 */
const ROAST_LEVELS = Object.freeze([
  '浅烘',
  '中浅烘',
  '中烘',
  '中深烘',
  '深烘'
])

/**
 * 默认风味标签
 */
const DEFAULT_FLAVOR_TAGS = Object.freeze([
  '花香',
  '柑橘',
  '果酸',
  '坚果',
  '巧克力',
  '焦糖'
])

const STORAGE_KEY = 'coffeeBeans'

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function now() {
  return new Date().toISOString()
}

/**
 * 创建基础通用字段
 */
function createBaseRecord(payload = {}) {
  return {
    id: payload.id || generateId(),
    type: payload.type || BEAN_TYPE.POUR_OVER,
    name: payload.name || '',
    brand: payload.brand || '',
    roastLevel: payload.roastLevel || '',
    origin: payload.origin || '',
    rating: typeof payload.rating === 'number' ? payload.rating : 0,
    flavors: Array.isArray(payload.flavors) ? payload.flavors : [],
    notes: payload.notes || '',
    coverImage: payload.coverImage || '',
    equipment: {
      brewer: payload.equipment?.brewer || '',
      grinder: payload.equipment?.grinder || ''
    },
    createdAt: payload.createdAt || now(),
    updatedAt: payload.updatedAt || now()
  }
}

/**
 * 手冲（pourOver）记录
 */
function createPourOverRecord(payload = {}) {
  const base = createBaseRecord({
    ...payload,
    type: BEAN_TYPE.POUR_OVER
  })

  return {
    ...base,
    brewParams: {
      coffeeWeight: normalizeNumber(payload.brewParams?.coffeeWeight),
      waterWeight: normalizeNumber(payload.brewParams?.waterWeight),
      temperature: normalizeNumber(payload.brewParams?.temperature),
      time: normalizeNumber(payload.brewParams?.time),
      grindSize: payload.brewParams?.grindSize || ''
    }
  }
}

/**
 * 意式（espresso）记录
 */
function createEspressoRecord(payload = {}) {
  const base = createBaseRecord({
    ...payload,
    type: BEAN_TYPE.ESPRESSO
  })

  return {
    ...base,
    extractParams: {
      coffeeWeight: normalizeNumber(payload.extractParams?.coffeeWeight),
      outputWeight: normalizeNumber(payload.extractParams?.outputWeight),
      temperature: normalizeNumber(payload.extractParams?.temperature),
      time: normalizeNumber(payload.extractParams?.time),
      grindSize: payload.extractParams?.grindSize || ''
    },
    flavorScores: {
      bitterness: normalizeNumber(payload.flavorScores?.bitterness),
      acidity: normalizeNumber(payload.flavorScores?.acidity),
      balance: normalizeNumber(payload.flavorScores?.balance),
      body: normalizeNumber(payload.flavorScores?.body)
    }
  }
}

function normalizeNumber(value) {
  if (value === 0) return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * 确保记录结构完整
 */
function normalizeRecord(record = {}) {
  if (!record || typeof record !== 'object') {
    return createPourOverRecord()
  }
  if (record.type === BEAN_TYPE.ESPRESSO) {
    return createEspressoRecord(record)
  }
  return createPourOverRecord(record)
}

/**
 * 评分展示（xx.x）
 */
function formatRating(rating) {
  if (!rating || rating <= 0) return '0.0'
  return Number(rating).toFixed(1)
}

/**
 * 日期展示（yy-mm-dd）
 */
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear().toString().slice(-2)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 首页卡片视图模型
 */
function mapToHomeCard(record) {
  const bean = normalizeRecord(record)
  return {
    ...bean,
    displayRating: formatRating(bean.rating),
    displayDate: formatDate(bean.createdAt),
    hasCover: Boolean(bean.coverImage)
  }
}

/**
 * 本地存储操作
 */
function loadFromStorage() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || []
  } catch (e) {
    console.warn('[BeanModel] load failed', e)
    return []
  }
}

function saveToStorage(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list)
  } catch (e) {
    console.warn('[BeanModel] save failed', e)
  }
}

function saveBean(bean) {
  const normalized = normalizeRecord(bean)
  const list = loadFromStorage()
  const index = list.findIndex(item => item.id === normalized.id)
  if (index >= 0) {
    normalized.updatedAt = now()
    list[index] = normalized
  } else {
    list.push(normalized)
  }
  saveToStorage(list)
  return normalized
}

function getAllBeans() {
  return loadFromStorage().map(normalizeRecord)
}

function getBeanById(id) {
  return getAllBeans().find(bean => bean.id === id) || null
}

function deleteBean(id) {
  const list = loadFromStorage()
  const filtered = list.filter(item => item.id !== id)
  saveToStorage(filtered)
  return true
}

function searchBeans(keyword = '', filters = {}) {
  keyword = keyword.trim()
  let beans = getAllBeans()

  if (keyword) {
    beans = beans.filter(bean => {
      return (
        bean.name.includes(keyword) ||
        bean.brand.includes(keyword) ||
        bean.origin.includes(keyword) ||
        bean.flavors.some(tag => tag.includes(keyword))
      )
    })
  }

  if (filters.type) {
    beans = beans.filter(bean => bean.type === filters.type)
  }

  if (filters.brand) {
    beans = beans.filter(bean => bean.brand === filters.brand)
  }

  if (filters.minRating) {
    beans = beans.filter(bean => bean.rating >= filters.minRating)
  }

  return beans
}

/**
 * 首页列表（映射视图模型）
 * 按创建时间倒序排列（最新的在前面）
 */
function getHomeList(keyword = '', filters = {}) {
  const beans = searchBeans(keyword, filters)
  // 按创建时间倒序排序（最新的在前面）
  beans.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime()
    const timeB = new Date(b.createdAt || 0).getTime()
    return timeB - timeA // 倒序：时间大的（新的）在前面
  })
  return beans.map(mapToHomeCard)
}

/**
 * 样例数据（用于开发展示）
 */
const SAMPLE_BEAN_LIST = [
  createPourOverRecord({
    name: '清晨荣耀拼配',
    brand: '烘焙公司',
    roastLevel: '浅烘',
    origin: '哥伦比亚',
    rating: 4.5,
    flavors: ['花香', '柑橘'],
    brewParams: {
      coffeeWeight: 18,
      waterWeight: 270,
      temperature: 92,
      time: 150,
      grindSize: 'V60 中粗'
    },
    equipment: {
      brewer: 'Hario V60',
      grinder: 'EK 7.5'
    },
    createdAt: '2023-10-26T08:00:00.000Z'
  }),
  createPourOverRecord({
    name: '耶加雪菲日晒',
    brand: '工匠烘坊',
    roastLevel: '浅烘',
    origin: '埃塞俄比亚',
    rating: 5.0,
    flavors: ['花香', '果酸', '莓果'],
    brewParams: {
      coffeeWeight: 16,
      waterWeight: 240,
      temperature: 93,
      time: 135,
      grindSize: 'ORIGAMI 中细'
    },
    equipment: {
      brewer: 'Origami S',
      grinder: 'Comandante 24'
    },
    createdAt: '2023-10-22T08:00:00.000Z'
  }),
  createPourOverRecord({
    name: '午夜意式浓缩',
    brand: '烘焙公司',
    roastLevel: '深烘',
    origin: '拼配',
    rating: 4.0,
    flavors: ['巧克力', '焦糖'],
    brewParams: {
      coffeeWeight: 20,
      waterWeight: 300,
      temperature: 90,
      time: 180,
      grindSize: 'Kalita 185 中粗'
    },
    equipment: {
      brewer: 'Kalita 185',
      grinder: 'Ek 8.0'
    },
    createdAt: '2023-10-20T08:00:00.000Z'
  }),
  createPourOverRecord({
    name: '哥伦比亚至尊',
    brand: '单品专家',
    roastLevel: '中烘',
    origin: '哥伦比亚',
    rating: 4.8,
    flavors: ['坚果', '焦糖', '可可'],
    brewParams: {
      coffeeWeight: 17,
      waterWeight: 255,
      temperature: 91,
      time: 165,
      grindSize: 'V60 中粗'
    },
    equipment: {
      brewer: 'V60 02',
      grinder: 'EK 7.8'
    },
    createdAt: '2023-10-15T08:00:00.000Z'
  })
]

module.exports = {
  BEAN_TYPE,
  ROAST_LEVELS,
  DEFAULT_FLAVOR_TAGS,
  createBaseRecord,
  createPourOverRecord,
  createEspressoRecord,
  normalizeRecord,
  formatRating,
  formatDate,
  mapToHomeCard,
  getAllBeans,
  getBeanById,
  saveBean,
  deleteBean,
  searchBeans,
  getHomeList,
  SAMPLE_BEAN_LIST
}

