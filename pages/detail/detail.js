// pages/detail/detail.js
const { 
  getBeanById, 
  saveBean, 
  createPourOverBean, 
  createEspressoBean,
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
    
    // 意式参数
    espressoParams: {
      coffeeWeight: '',
      outputWeight: '',
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
    
    // 备注
    notes: '',
    
    // 评分
    rating: 0,
    
    // 封面图
    coverImage: '',
    
    // 选项数据
    roastLevels: ROAST_LEVELS,
    roastLevelIndex: 0
  },

  onLoad(options) {
    // 如果有id，说明是编辑模式
    if (options.id) {
      this.setData({
        beanId: options.id,
        isEdit: true
      })
      this.loadBeanData(options.id)
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
      rating: bean.rating || 0,
      coverImage: bean.coverImage || ''
    })

    // 根据类型加载不同的参数
    if (bean.type === BEAN_TYPE.POUR_OVER) {
      this.setData({
        pourOverParams: bean.brewParams || {},
        flavors: bean.flavors || []
      })
    } else {
      this.setData({
        espressoParams: bean.extractParams || {},
        flavorScores: bean.flavorScores || {}
      })
    }
  },

  // 选择类型
  selectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      beanType: type
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
    const value = e.currentTarget.dataset.value
    const flavorScores = { ...this.data.flavorScores }
    flavorScores[key] = value
    this.setData({
      flavorScores: flavorScores
    })
  },

  // 设置综合评分
  setRating(e) {
    const rating = e.currentTarget.dataset.rating
    this.setData({
      rating: rating
    })
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
    this.setData({ 'pourOverParams.coffeeWeight': e.detail.value })
  },

  onPourOverWaterWeightInput(e) {
    this.setData({ 'pourOverParams.waterWeight': e.detail.value })
  },

  onPourOverTemperatureInput(e) {
    this.setData({ 'pourOverParams.temperature': e.detail.value })
  },

  onPourOverTimeInput(e) {
    this.setData({ 'pourOverParams.time': e.detail.value })
  },

  onPourOverGrindSizeInput(e) {
    this.setData({ 'pourOverParams.grindSize': e.detail.value })
  },

  // 意式参数输入
  onEspressoCoffeeWeightInput(e) {
    this.setData({ 'espressoParams.coffeeWeight': e.detail.value })
  },

  onEspressoOutputWeightInput(e) {
    this.setData({ 'espressoParams.outputWeight': e.detail.value })
  },

  onEspressoTimeInput(e) {
    this.setData({ 'espressoParams.time': e.detail.value })
  },

  onEspressoGrindSizeInput(e) {
    this.setData({ 'espressoParams.grindSize': e.detail.value })
  },

  // 保存记录
  saveRecord() {
    // 验证必填字段
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入豆名',
        icon: 'none'
      })
      return
    }

    let bean
    if (this.data.beanType === BEAN_TYPE.POUR_OVER) {
      bean = createPourOverBean({
        id: this.data.beanId,
        name: this.data.name,
        brand: this.data.brand,
        roastLevel: this.data.roastLevel,
        origin: this.data.origin,
        brewParams: this.data.pourOverParams,
        flavors: this.data.flavors,
        notes: this.data.notes,
        rating: this.data.rating,
        coverImage: this.data.coverImage,
        createdAt: this.data.isEdit ? undefined : new Date().toISOString()
      })
    } else {
      bean = createEspressoBean({
        id: this.data.beanId,
        name: this.data.name,
        brand: this.data.brand,
        roastLevel: this.data.roastLevel,
        origin: this.data.origin,
        extractParams: this.data.espressoParams,
        flavorScores: this.data.flavorScores,
        notes: this.data.notes,
        rating: this.data.rating,
        coverImage: this.data.coverImage,
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
  }
})

