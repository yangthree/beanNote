// utils/dataModel.js
// 数据模型定义和工具函数

/**
 * 咖啡豆类型枚举
 */
const BEAN_TYPE = {
  POUR_OVER: 'pourOver',  // 手冲
  ESPRESSO: 'espresso'     // 意式
}

/**
 * 烘焙度选项
 */
const ROAST_LEVELS = [
  '浅烘',
  '中浅烘',
  '中烘',
  '中深烘',
  '深烘'
]

/**
 * 创建新的咖啡豆记录（手冲）
 */
function createPourOverBean(data = {}) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type: BEAN_TYPE.POUR_OVER,
    name: data.name || '',
    brand: data.brand || '',
    roastLevel: data.roastLevel || '',
    origin: data.origin || '',
    // 冲煮参数
    brewParams: {
      coffeeWeight: data.brewParams?.coffeeWeight || '',      // 粉量 g
      waterWeight: data.brewParams?.waterWeight || '',        // 水量 ml
      temperature: data.brewParams?.temperature || '',        // 温度 °C
      time: data.brewParams?.time || '',                       // 时间 s
      grindSize: data.brewParams?.grindSize || ''             // 研磨度
    },
    // 风味描述（标签数组）
    flavors: data.flavors || [],
    // 备注
    notes: data.notes || '',
    // 评分（1-5星）
    rating: data.rating || 0,
    // 封面图
    coverImage: data.coverImage || '',
    // 创建时间
    createdAt: data.createdAt || new Date().toISOString(),
    // 更新时间
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

/**
 * 创建新的咖啡豆记录（意式）
 */
function createEspressoBean(data = {}) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type: BEAN_TYPE.ESPRESSO,
    name: data.name || '',
    brand: data.brand || '',
    roastLevel: data.roastLevel || '',
    origin: data.origin || '',
    // 萃取参数
    extractParams: {
      coffeeWeight: data.extractParams?.coffeeWeight || '',   // 粉量 g
      outputWeight: data.extractParams?.outputWeight || '',   // 出品量 g
      time: data.extractParams?.time || '',                   // 时间 s
      grindSize: data.extractParams?.grindSize || ''          // 研磨度
    },
    // 风味评分（各项1-5分）
    flavorScores: {
      bitterness: data.flavorScores?.bitterness || 0,        // 苦味
      acidity: data.flavorScores?.acidity || 0,               // 酸度
      balance: data.flavorScores?.balance || 0,               // 平衡感
      body: data.flavorScores?.body || 0                      // 口感厚度
    },
    // 备注
    notes: data.notes || '',
    // 综合评分（1-5星）
    rating: data.rating || 0,
    // 封面图
    coverImage: data.coverImage || '',
    // 创建时间
    createdAt: data.createdAt || new Date().toISOString(),
    // 更新时间
    updatedAt: data.updatedAt || new Date().toISOString()
  }
}

/**
 * 保存咖啡豆记录到本地存储
 */
function saveBean(bean) {
  const beans = wx.getStorageSync('coffeeBeans') || []
  const index = beans.findIndex(b => b.id === bean.id)
  
  if (index >= 0) {
    // 更新现有记录
    bean.updatedAt = new Date().toISOString()
    beans[index] = bean
  } else {
    // 新增记录
    beans.push(bean)
  }
  
  wx.setStorageSync('coffeeBeans', beans)
  return bean
}

/**
 * 获取所有咖啡豆记录
 */
function getAllBeans() {
  return wx.getStorageSync('coffeeBeans') || []
}

/**
 * 根据ID获取咖啡豆记录
 */
function getBeanById(id) {
  const beans = getAllBeans()
  return beans.find(b => b.id === id) || null
}

/**
 * 删除咖啡豆记录
 */
function deleteBeanById(id) {
  const beans = getAllBeans()
  const filtered = beans.filter(b => b.id !== id)
  wx.setStorageSync('coffeeBeans', filtered)
  return true
}

/**
 * 搜索咖啡豆
 */
function searchBeans(keyword, filters = {}) {
  let beans = getAllBeans()
  
  // 关键词搜索
  if (keyword) {
    beans = beans.filter(bean => {
      return (bean.name && bean.name.includes(keyword)) ||
             (bean.brand && bean.brand.includes(keyword)) ||
             (bean.origin && bean.origin.includes(keyword)) ||
             (bean.flavors && bean.flavors.some(f => f.includes(keyword)))
    })
  }
  
  // 类型筛选
  if (filters.type) {
    beans = beans.filter(bean => bean.type === filters.type)
  }
  
  // 品牌筛选
  if (filters.brand) {
    beans = beans.filter(bean => bean.brand === filters.brand)
  }
  
  // 评分筛选
  if (filters.minRating) {
    beans = beans.filter(bean => bean.rating >= filters.minRating)
  }
  
  return beans
}

// 导出模块
module.exports = {
  BEAN_TYPE: BEAN_TYPE,
  ROAST_LEVELS: ROAST_LEVELS,
  createPourOverBean: createPourOverBean,
  createEspressoBean: createEspressoBean,
  saveBean: saveBean,
  getAllBeans: getAllBeans,
  getBeanById: getBeanById,
  deleteBean: deleteBeanById,
  searchBeans: searchBeans
}

