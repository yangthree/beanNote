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
    altitude: '',
    processMethod: '',
    roastDate: '',
    pricePer100g: '',
    
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
      aroma: 0,
      acidity: 0,
      sweetness: 0,
      balance: 0,
      body: 0
    },
    espressoRatio: '',
    
    // 备注
    notes: '',
    
    // 评分（不使用0作为默认值，允许为空）
    rating: null,
    ratingText: '',
    
    // 封面图
    coverImage: '',
    equipmentBrewer: '',   // 设备信息
    equipmentGrinder: '',
    userProfile: null,
    isPublishing: false,
    showLoginDialog: false,
    showPublishDialog: false, // 发布确认弹窗
    isLoggingIn: false,
    tempAvatarUrl: '', // 临时头像URL（用户选择后）
    tempNickName: '', // 临时昵称（用户输入后）
    
    // 选项数据
    roastLevels: ROAST_LEVELS,
    roastLevelIndex: 0
  },

  normalizeFlavorScores(rawScores = {}, type) {
    const toNumber = (value) => {
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    }
    if (type === BEAN_TYPE.POUR_OVER) {
      return {
        aroma: toNumber(rawScores.aroma ?? rawScores.bitterness),
        acidity: toNumber(rawScores.acidity),
        sweetness: toNumber(rawScores.sweetness),
        balance: toNumber(rawScores.balance ?? rawScores.body),
        body: 0
      }
    }
    // ESPRESSO
    return {
      aroma: toNumber(rawScores.aroma ?? rawScores.bitterness),
      body: toNumber(rawScores.body),
      sweetness: toNumber(rawScores.sweetness),
      balance: toNumber(rawScores.balance),
      acidity: toNumber(rawScores.acidity)
    }
  },

  prepareFlavorScoresForType(scores = {}, type) {
    const toNumber = (value) => {
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    }
    if (type === BEAN_TYPE.POUR_OVER) {
      return {
        aroma: toNumber(scores.aroma),
        acidity: toNumber(scores.acidity),
        sweetness: toNumber(scores.sweetness),
        balance: toNumber(scores.balance)
      }
    }
    return {
      aroma: toNumber(scores.aroma),
      body: toNumber(scores.body),
      sweetness: toNumber(scores.sweetness),
      balance: toNumber(scores.balance)
    }
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
    let profile = null

    if (app && app.globalData.userProfile) {
      profile = app.globalData.userProfile
    } else {
      const cachedProfile = auth.getStoredProfile()
      const cachedOpenId = auth.getStoredOpenId()
      if (cachedProfile) {
        profile = cachedProfile
        if (app) {
          app.globalData.userProfile = cachedProfile
        }
      }
      if (cachedOpenId && app) {
        app.globalData.openId = cachedOpenId
      }
    }

    if (profile) {
      this.setData({ userProfile: profile })
    } else {
      this.setData({ showLoginDialog: true })
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
      altitude: bean.altitude !== undefined && bean.altitude !== null
        ? String(bean.altitude).replace(/[^0-9.]/g, '')
        : '',
      processMethod: bean.processMethod || '',
      roastDate: bean.roastDate || '',
      notes: bean.notes || '',
      pricePer100g: bean.pricePer100g !== undefined && bean.pricePer100g !== null
        ? String(bean.pricePer100g)
        : '',
      coverImage: bean.coverImage || ''
    })
    this.updateRatingState(bean.rating !== undefined && bean.rating !== null ? bean.rating : null)

    // 根据类型加载不同的参数
    if (bean.type === BEAN_TYPE.POUR_OVER) {
      const normalizedScores = this.normalizeFlavorScores(bean.flavorScores, BEAN_TYPE.POUR_OVER)
      console.log('[Detail] 手冲记录加载评分:', normalizedScores)
      this.setData({
        pourOverParams: bean.brewParams || {},
        flavors: bean.flavors || [],
        flavorScores: normalizedScores
      })
      this.updatePourOverRatio()
    } else {
      const normalizedScores = this.normalizeFlavorScores(bean.flavorScores, BEAN_TYPE.ESPRESSO)
      console.log('[Detail] 意式记录加载评分:', normalizedScores)
      this.setData({
        espressoParams: bean.extractParams || {},
        flavors: bean.flavors || [],
        flavorScores: normalizedScores
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
    const resetScores = this.normalizeFlavorScores({}, type)
    console.log('[Detail] 切换豆型:', type, '重置评分为:', resetScores)
    this.setData({ beanType: type, flavorScores: resetScores }, () => {
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
    console.log('[Detail] addFlavor input:', flavor)
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

  // 手动评分输入处理（输入时不校验，只更新显示值）
  onManualRatingInput(e) {
    const { value } = e.detail
    // 输入时只更新显示值，不进行校验
    if (value === '') {
      this.setData({
        rating: null,
        ratingText: ''
      })
      return
    }
    
    // 允许输入数字和小数点，最多一位小数
    // 只更新显示文本，不进行校验
    this.setData({
      ratingText: value
    })
  },

  // 评分输入完成后的校验（失焦时触发）
  onManualRatingBlur(e) {
    const { value } = e.detail
    if (value === '' || value === null || value === undefined) {
      this.setData({
        rating: null,
        ratingText: ''
      })
      return
    }

    // 校验是否为有效数字
    const numberValue = parseFloat(value)
    if (isNaN(numberValue) || !Number.isFinite(numberValue)) {
      wx.showToast({
        title: '请输入有效的数字',
        icon: 'none'
      })
      // 清空输入
      this.setData({
        rating: null,
        ratingText: ''
      })
      return
    }

    // 校验范围（0-5）
    if (numberValue < 0 || numberValue > 5) {
      wx.showToast({
        title: '评分需在0-5之间',
        icon: 'none'
      })
      // 清空输入
      this.setData({
        rating: null,
        ratingText: ''
      })
      return
    }

    // 保留一位小数
    const rounded = Math.round(numberValue * 10) / 10
    this.setData({
      rating: rounded,
      ratingText: rounded.toFixed(1)
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

  onAltitudeInput(e) {
    // 只保留数字和小数点
    const raw = e.detail.value || ''
    const sanitized = raw.replace(/[^0-9.]/g, '')
    this.setData({ altitude: sanitized })
  },

  onProcessMethodInput(e) {
    this.setData({ processMethod: e.detail.value })
  },

  onPriceInput(e) {
    const raw = e.detail.value || ''
    const sanitized = raw.replace(/[^0-9.]/g, '')
    const parts = sanitized.split('.')
    let formatted = parts[0]
    if (parts.length > 1) {
      formatted += '.' + parts[1].slice(0, 2)
    }
    this.setData({ pricePer100g: formatted })
  },

  onRoastDateChange(e) {
    const value = e.detail.value
    this.setData({ roastDate: value })
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
    // 如果值为空或无效，设置为 null
    if (value === null || value === undefined || value === '') {
      this.setData({
        rating: null,
        ratingText: ''
      })
      return
    }
    
    const numeric = Number.isFinite(value) ? value : null
    if (numeric === null) {
      this.setData({
        rating: null,
        ratingText: ''
      })
      return
    }
    
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

  /**
   * 保存记录（用于发布前的自动保存，不跳转页面）
   * @returns {Object|null} 保存后的 bean 对象，失败返回 null
   */
  saveRecordForPublish() {
    console.log('[Detail] 开始保存记录，当前豆型:', this.data.beanType)
    // 验证：豆名必填
    if (!this.data.name.trim()) {
      throw new Error('请输入豆名')
    }
    
    // 验证：品牌必填
    if (!this.data.brand.trim()) {
      throw new Error('请输入品牌')
    }
    
    // 验证：评分必填
    if (this.data.rating === null || this.data.rating === undefined) {
      throw new Error('请输入评分')
    }
    
    // 验证：烘焙度必填
    if (!this.data.roastLevel || !this.data.roastLevel.trim()) {
      throw new Error('请选择烘焙度')
    }

    const flavorScoresForSave = this.prepareFlavorScoresForType(this.data.flavorScores, this.data.beanType)
    console.log('[Detail] 准备保存评分:', flavorScoresForSave)
    console.log('[Detail] 准备保存风味标签:', this.data.flavors)

    let bean
    if (this.data.beanType === BEAN_TYPE.POUR_OVER) {
      // 手冲记录模型
      bean = createPourOverRecord({
        id: this.data.beanId,
        name: this.data.name,
        brand: this.data.brand,
        roastLevel: this.data.roastLevel,
        origin: this.data.origin,
        altitude: this.data.altitude || '',
        processMethod: this.data.processMethod,
        roastDate: this.data.roastDate,
        pricePer100g: this.data.pricePer100g,
        brewParams: this.data.pourOverParams,
        flavorScores: flavorScoresForSave,
        flavors: this.data.flavors,
        notes: this.data.notes,
        rating: this.data.rating !== null && this.data.rating !== undefined ? parseFloat(this.data.rating) : 0,
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
        altitude: this.data.altitude || '',
        processMethod: this.data.processMethod,
        roastDate: this.data.roastDate,
        pricePer100g: this.data.pricePer100g,
        extractParams: this.data.espressoParams,
        flavorScores: flavorScoresForSave,
        flavors: this.data.flavors,
        notes: this.data.notes,
        rating: this.data.rating !== null && this.data.rating !== undefined ? parseFloat(this.data.rating) : 0,
        coverImage: this.data.coverImage,
        equipment: {
          brewer: this.data.equipmentBrewer,
          grinder: this.data.equipmentGrinder
        },
        createdAt: this.data.isEdit ? undefined : new Date().toISOString()
      })
    }

    saveBean(bean)
    
    // 更新 beanId（如果是新创建的记录）
    if (!this.data.beanId) {
      this.setData({ beanId: bean.id, isEdit: true })
    }
    
    return bean
  },

  // 保存记录
  saveRecord() {
    try {
      // 调用保存方法（包含所有必填项验证）
      this.saveRecordForPublish()
      
      wx.showToast({
        title: this.data.isEdit ? '保存成功' : '添加成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      // 显示验证错误提示
      wx.showToast({
        title: err.message || '保存失败，请检查必填项',
        icon: 'none',
        duration: 2000
      })
    }
  },

  openLoginDialog() {
    this.setData({ showLoginDialog: true })
  },

  closeLoginDialog() {
    if (!this.data.isLoggingIn) {
      this.setData({ showLoginDialog: false })
    }
  },

  /**
   * 阻止事件冒泡（用于弹窗内部点击）
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  /**
   * 清除登录状态（用于测试，上线后可删除）
   */
  clearLogin() {
    wx.showModal({
      title: '清除登录状态',
      content: '确定要清除登录状态吗？清除后需要重新登录。',
      success: (res) => {
        if (res.confirm) {
          auth.clearProfile()
          const app = getApp()
          if (app) {
            app.globalData.userProfile = null
            app.globalData.openId = ''
          }
          this.setData({
            userProfile: null,
            showLoginDialog: true,
            tempAvatarUrl: '',
            tempNickName: ''
          })
          wx.showToast({
            title: '已清除登录状态',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 选择头像
   * @param {Object} e - 事件对象，包含 avatarUrl
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    console.log('用户选择头像:', avatarUrl)
    this.setData({
      tempAvatarUrl: avatarUrl
    })
  },

  /**
   * 昵称输入
   * @param {Object} e - 事件对象
   */
  onNickNameInput(e) {
    const nickName = e.detail.value
    this.setData({
      tempNickName: nickName
    })
  },

  /**
   * 昵称输入失焦（用户可能通过键盘选择昵称）
   * @param {Object} e - 事件对象
   */
  onNickNameBlur(e) {
    const nickName = e.detail.value
    if (nickName) {
      this.setData({
        tempNickName: nickName
      })
    }
  },

  /**
   * 确认登录
   */
  async confirmLogin() {
    if (this.data.isLoggingIn) return
    
    // 验证用户是否设置了头像和昵称
    if (!this.data.tempAvatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.tempNickName || !this.data.tempNickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoggingIn: true })
    
    try {
      // 获取 OpenID
      const openId = await auth.callLoginFunction()
      
      // 构建用户信息
      const profile = {
        nickName: this.data.tempNickName.trim(),
        avatarUrl: this.data.tempAvatarUrl
      }
      
      console.log('=== 登录用户信息 ===')
      console.log('profile:', profile)
      console.log('openId:', openId)
      console.log('==================')
      
      // 保存到本地存储
      auth.saveProfile(profile, openId)
      
      // 保存到云数据库
      await auth.saveUserToCloud(openId, profile)
      
      // 更新全局数据
      const app = getApp()
      if (app) {
        app.globalData.userProfile = profile
        app.globalData.openId = openId
      }
      
      this.setData({
        userProfile: profile,
        showLoginDialog: false,
        tempAvatarUrl: '',
        tempNickName: ''
      })
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoggingIn: false })
    }
  },

  /**
   * 打开发布确认弹窗
   */
  openPublishDialog() {
    if (!this.data.userProfile) {
      this.openLoginDialog()
      return
    }
    // 新建和编辑都可以发布，不需要检查 beanId（发布时会自动保存）
    this.setData({ showPublishDialog: true })
  },

  /**
   * 关闭发布确认弹窗
   */
  closePublishDialog() {
    if (!this.data.isPublishing) {
      this.setData({ showPublishDialog: false })
    }
  },

  /**
   * 确认发布记录
   */
  async publishRecord() {
    if (this.data.isPublishing) return
    
    // 检查登录状态
    if (!this.data.userProfile) {
      this.setData({ showPublishDialog: false })
      this.openLoginDialog()
      return
    }

    this.setData({ isPublishing: true })

    try {
      // 无论是否有记录 ID，都先保存当前表单数据到本地豆单
      // 这样可以确保发布的是最新的数据
      this.saveRecordForPublish()
      
      // 等待保存完成，获取保存后的 beanId
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 获取保存后的 bean 数据
      const bean = getBeanById(this.data.beanId)
      if (!bean) {
        throw new Error('保存记录失败，请重试')
      }

      // 获取用户信息
      const app = getApp()
      const openId = app.globalData.openId || auth.getStoredOpenId()
      if (!openId) {
        throw new Error('未获取到用户信息，请重新登录')
      }

      // 直接使用当前登录用户的微信昵称和头像
      if (!this.data.userProfile || !this.data.userProfile.nickName) {
        throw new Error('用户信息不完整，请重新登录')
      }

      // 调试：打印发布时使用的用户信息
      console.log('=== 发布时使用的用户信息 ===')
      console.log('userProfile:', this.data.userProfile)
      console.log('nickName:', this.data.userProfile.nickName)
      console.log('avatarUrl:', this.data.userProfile.avatarUrl)
      console.log('==========================')

      // 准备发布数据（包含所有字段）
      const publishData = {
        beanId: bean.id,
        userName: this.data.userProfile.nickName,
        userAvatar: this.data.userProfile.avatarUrl,
        beanName: bean.name,
        brand: bean.brand || '',
        type: bean.type,
        roastLevel: bean.roastLevel || '',
        origin: bean.origin || '',
        altitude: bean.altitude || '',
        processMethod: bean.processMethod || '',
        roastDate: bean.roastDate || '',
        pricePer100g: bean.pricePer100g ?? null,
        flavorNotes: bean.flavors || [],
        rating: bean.rating !== undefined && bean.rating !== null ? bean.rating : 0,
        remarks: bean.notes || '',
        // 手冲参数
        brewParams: bean.brewParams || {},
        // 意式参数
        extractParams: bean.extractParams || {},
        // 风味评分
        flavorScores: bean.flavorScores || {},
        // 设备信息
        equipment: bean.equipment || {},
        createTime: bean.createdAt || new Date().toISOString()
      }

      console.log('准备发布数据:', publishData)

      // 调用云函数发布
      const res = await wx.cloud.callFunction({
        name: 'publishRecord',
        data: {
          beanData: publishData
        }
      })

      console.log('云函数 publishRecord 返回:', res)
      console.log('返回结果详情:', JSON.stringify(res, null, 2))

      // 检查云函数返回结果
      if (res.errMsg !== 'cloud.callFunction:ok') {
        console.error('云函数调用失败，errMsg:', res.errMsg)
        throw new Error(`云函数调用失败: ${res.errMsg}`)
      }

      if (!res.result) {
        console.error('云函数返回结果为空')
        throw new Error('云函数返回结果为空，请检查云函数是否正常')
      }

      if (res.result.success === false) {
        const errorMsg = res.result.error || '发布失败'
        console.error('云函数返回失败:', errorMsg)
        throw new Error(errorMsg)
      }

      if (res.result.success !== true) {
        console.error('云函数返回格式异常:', res.result)
        throw new Error('云函数返回格式异常，请检查云函数日志')
      }

      // 发布成功
      this.setData({ showPublishDialog: false })

      // 标记发现页需要刷新，并切换过去
      wx.setStorageSync('discoverNeedRefresh', true)
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1000
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/discover/discover'
        })
      }, 600)

    } catch (err) {
      console.error('发布失败:', err)
      console.error('错误堆栈:', err.stack)
      const errorMsg = err.message || err.errMsg || '发布失败，请稍后重试'
      wx.showModal({
        title: '发布失败',
        content: errorMsg + '\n\n请检查：\n1. 云函数是否已部署\n2. 网络连接是否正常\n3. 查看控制台日志',
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      this.setData({ isPublishing: false })
    }
  }
})

