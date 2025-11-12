// pages/detail/detail.js
// 新建 / 编辑豆子页面逻辑
// 负责：切换手冲/意式模板、表单录入、校验与保存、登录弹窗、发布按钮入口
const auth = require('../../utils/auth.js')
const {
  getBeanById,
  saveBean,
  createPourOverRecord,
  createEspressoRecord,
  BEAN_TYPE,
  ROAST_LEVELS
} = require('../../utils/dataModel.js')

Page({
  data: {
    beanId: null,
    beanType: BEAN_TYPE.POUR_OVER,  // 默认手冲
    isEdit: false,
    
    // 基本信息
    name: '',
    brand: '',
    roastLevel: '',
    origin: '',
    
    // 手冲参数
    pourOverParams: {
      coffeeWeight: '',
      waterWeight: '',
      temperature: '',
      time: '',
      grindSize: ''
    },
    
    // 手冲风味标签
    flavors: [],
    flavorInput: '',
    pourOverRatio: '',   // 计算后的水粉比
    
    // 意式参数
    espressoParams: {
      coffeeWeight: '',
      outputWeight: '',
      temperature: '',
      time: '',
      grindSize: ''
    },
    
    // 意式风味评分
    flavorScores: {
      bitterness: 0,
      acidity: 0,
      balance: 0,
      body: 0
    },
    espressoRatio: '',
    
    // 备注
    notes: '',
    
    // 评分
    rating: 0,
    ratingText: '0.0',
    
    // 封面图
    coverImage: '',
    equipmentBrewer: '',   // 设备信息
    equipmentGrinder: '',
    userProfile: null,
    isPublishing: false,
    showLoginDialog: false,
    isLoggingIn: false,
    
    // 选项数据
    roastLevels: ROAST_LEVELS,
    roastLevelIndex: 0
  },

  onLoad(options) {
    const { type, mode } = options || {}
    // 根据传入参数设定默认类型（新增时）
    if (type && Object.values(BEAN_TYPE).includes(type)) {
      this.setData({ beanType: type })
    }
    if (mode === 'create') {
      this.setData({ isEdit: false, beanId: null })
    }
    // 如果有id，说明是编辑模式
    if (options.id) {
      this.setData({
        beanId: options.id,
        isEdit: true
      })
      this.loadBeanData(options.id)
    }

    const app = getApp()
    if (app && app.globalData.userProfile) {
      this.setData({ userProfile: app.globalData.userProfile })
    }
  },

  // 加载咖啡豆数据
  loadBeanData(id) {
    const bean = getBeanById(id)
    if (!bean) {
      wx.showToast({
        title: '记录不存在',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    const roastLevelIndex = bean.roastLevel 
      ? this.data.roastLevels.indexOf(bean.roastLevel) 
      : 0
    
    this.setData({
      beanType: bean.type,
      name: bean.name || '',
      brand: bean.brand || '',
      roastLevel: bean.roastLevel || '',
      roastLevelIndex: roastLevelIndex >= 0 ? roastLevelIndex : 0,
      origin: bean.origin || '',
      notes: bean.notes || '',
      coverImage: bean.coverImage || ''
    })
    this.updateRatingState(bean.rating || 0)

    // 根据类型加载不同的参数
    if (bean.type === BEAN_TYPE.POUR_OVER) {
      this.setData({
        pourOverParams: bean.brewParams || {},
        flavors: bean.flavors || []
      })
      this.updatePourOverRatio()
    } else {
      this.setData({
        espressoParams: bean.extractParams || {},
        flavorScores: bean.flavorScores || {}
      })
      this.updateEspressoRatio()
    }
    this.setData({
      equipmentBrewer: bean.equipment?.brewer || '',
      equipmentGrinder: bean.equipment?.grinder || ''
    })
  },

  handleBack() {
    wx.navigateBack()
  },

  onNeedLogin() {
    if (!this.data.userProfile) {
      this.setData({ showLoginDialog: true })
    }
  },

  // 选择类型
  selectType(e) {
    const type = e.currentTarget.dataset.type
    if (!type || type === this.data.beanType) return
    this.setData({ beanType: type }, () => {
      if (type === BEAN_TYPE.POUR_OVER) {
        this.updatePourOverRatio()
      } else {
        this.updateEspressoRatio()
      }
    })
  },

  // 添加风味标签
  addFlavor(e) {
    const flavor = e.detail.value.trim()
    if (!flavor) return
    
    const flavors = [...this.data.flavors]
    if (flavors.includes(flavor)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      })
      return
    }
    
    flavors.push(flavor)
    this.setData({
      flavors: flavors,
      flavorInput: ''
    })
  },

  // 删除风味标签
  removeFlavor(e) {
    const flavor = e.currentTarget.dataset.flavor
    const flavors = this.data.flavors.filter(f => f !== flavor)
    this.setData({
      flavors: flavors
    })
  },

  // 设置意式风味评分
  setFlavorScore(e) {
    const key = e.currentTarget.dataset.key
    const value = Number(e.currentTarget.dataset.value)
    const flavorScores = { ...this.data.flavorScores }
    flavorScores[key] = value
    this.setData({
      flavorScores: flavorScores
    })
  },

  // 设置综合评分
  setRating(e) {
    const rating = Number(e.currentTarget.dataset.rating)
    this.updateRatingState(rating)
  },

  // 手动评分输入处理
  onManualRatingInput(e) {
    const { value } = e.detail
    if (value === '') {
      this.updateRatingState()
      return
    }

    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) {
      wx.showToast({
        title: '请输入有效的数字',
        icon: 'none'
      })
      return
    }

    if (numberValue < 0 || numberValue > 5) {
      wx.showToast({
        title: '评分需在0-5之间',
        icon: 'none'
      })
      return
    }

    this.updateRatingState(numberValue)
  },

  // 输入框绑定方法
  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onBrandInput(e) {
    this.setData({ brand: e.detail.value })
  },

  onRoastLevelChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ 
      roastLevel: this.data.roastLevels[index],
      roastLevelIndex: index
    })
  },

  onOriginInput(e) {
    this.setData({ origin: e.detail.value })
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value })
  },

  onFlavorInput(e) {
    this.setData({ flavorInput: e.detail.value })
  },

  // 手冲参数输入
  onPourOverCoffeeWeightInput(e) {
    this.setData({ 'pourOverParams.coffeeWeight': e.detail.value }, () => {
      this.updatePourOverRatio()
    })
  },

  onPourOverWaterWeightInput(e) {
    this.setData({ 'pourOverParams.waterWeight': e.detail.value }, () => {
      this.updatePourOverRatio()
    })
  },

  onPourOverTemperatureInput(e) {
    this.setData({ 'pourOverParams.temperature': e.detail.value })
  },

  onPourOverTimeInput(e) {
    this.setData({ 'pourOverParams.time': e.detail.value })
  },

  onPourOverGrindSizeInput(e) {
    const value = e.detail.value
    this.setData({
      'pourOverParams.grindSize': value,
      equipmentGrinder: value
    })
  },

  // 意式参数输入
  onEspressoCoffeeWeightInput(e) {
    this.setData({ 'espressoParams.coffeeWeight': e.detail.value }, () => {
      this.updateEspressoRatio()
    })
  },

  onEspressoOutputWeightInput(e) {
    this.setData({ 'espressoParams.outputWeight': e.detail.value }, () => {
      this.updateEspressoRatio()
    })
  },

  onEspressoTemperatureInput(e) {
    this.setData({ 'espressoParams.temperature': e.detail.value })
  },

  onEspressoTimeInput(e) {
    this.setData({ 'espressoParams.time': e.detail.value })
  },

  onEspressoGrindSizeInput(e) {
    const value = e.detail.value
    this.setData({
      'espressoParams.grindSize': value,
      equipmentGrinder: value
    })
  },

  onEquipmentBrewerInput(e) {
    this.setData({ equipmentBrewer: e.detail.value })
  },

  onEquipmentGrinderInput(e) {
    this.setData({ equipmentGrinder: e.detail.value })
  },

  updateRatingState(value) {
    const numeric = Number.isFinite(value) ? value : 0
    const clipped = Math.min(5, Math.max(0, numeric))
    const rounded = Math.round(clipped * 10) / 10
    this.setData({
      rating: rounded,
      ratingText: rounded.toFixed(1)
    })
  },

  updatePourOverRatio() {
    const { coffeeWeight, waterWeight } = this.data.pourOverParams
    const coffee = parseFloat(coffeeWeight)
    const water = parseFloat(waterWeight)
    let ratio = ''
    if (coffee > 0 && water > 0) {
      ratio = (water / coffee).toFixed(1)
    }
    this.setData({ pourOverRatio: ratio })
  },

  updateEspressoRatio() {
    const { coffeeWeight, outputWeight } = this.data.espressoParams
    const coffee = parseFloat(coffeeWeight)
    const output = parseFloat(outputWeight)
    let ratio = ''
    if (coffee > 0 && output > 0) {
      ratio = (output / coffee).toFixed(1)
    }
    this.setData({ espressoRatio: ratio })
  },

  // 保存记录
  saveRecord() {
    // 验证：bean 名称必填
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入豆名',
        icon: 'none'
      })
      return
    }

    let bean
    if (this.data.beanType === BEAN_TYPE.POUR_OVER) {
      // 手冲记录模型
      bean = createPourOverRecord({
        id: this.data.beanId,
        name: this.data.name,
        brand: this.data.brand,
        roastLevel: this.data.roastLevel,
        origin: this.data.origin,
        brewParams: this.data.pourOverParams,
        flavors: this.data.flavors,
        notes: this.data.notes,
        rating: this.data.rating ? parseFloat(this.data.rating) : 0,
        coverImage: this.data.coverImage,
        equipment: {
          brewer: this.data.equipmentBrewer,
          grinder: this.data.equipmentGrinder
        },
        createdAt: this.data.isEdit ? undefined : new Date().toISOString()
      })
    } else {
      // 意式记录模型
      bean = createEspressoRecord({
        id: this.data.beanId,
        name: this.data.name,
        brand: this.data.brand,
        roastLevel: this.data.roastLevel,
        origin: this.data.origin,
        extractParams: this.data.espressoParams,
        flavorScores: this.data.flavorScores,
        notes: this.data.notes,
        rating: this.data.rating ? parseFloat(this.data.rating) : 0,
        coverImage: this.data.coverImage,
        equipment: {
          brewer: this.data.equipmentBrewer,
          grinder: this.data.equipmentGrinder
        },
        createdAt: this.data.isEdit ? undefined : new Date().toISOString()
      })
    }

    saveBean(bean)
    
    wx.showToast({
      title: this.data.isEdit ? '保存成功' : '添加成功',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  openLoginDialog() {
    this.setData({ showLoginDialog: true })
  },

  closeLoginDialog() {
    if (!this.data.isLoggingIn) {
      this.setData({ showLoginDialog: false })
    }
  },

  async confirmLogin() {
    if (this.data.isLoggingIn) return
    this.setData({ isLoggingIn: true })
    try {
      // ensureLogin 会拉起微信授权弹窗，用户确认后返回头像/昵称和 openId
      const { profile, openId } = await auth.ensureLogin()
      this.setData({
        userProfile: profile,
        showLoginDialog: false
      })
      if (openId) {
        wx.setStorageSync('userOpenId', openId)
      }
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '需要登录授权',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoggingIn: false })
    }
  },

  async publishRecord() {
    if (this.data.isPublishing) return
    if (!this.data.userProfile) {
      this.openLoginDialog()
      return
    }
    this.setData({ isPublishing: true })
    try {
      // TODO: 接入 publishRecord 云函数，传入 bean 数据与用户信息
      wx.showToast({
        title: '发布功能开发中',
        icon: 'none'
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '发布失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isPublishing: false })
    }
  }
})

