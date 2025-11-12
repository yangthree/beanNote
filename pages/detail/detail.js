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
    showPublishDialog: false, // 发布确认弹窗
    isLoggingIn: false,
    tempAvatarUrl: '', // 临时头像URL（用户选择后）
    tempNickName: '', // 临时昵称（用户输入后）
    
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
    if (!this.data.beanId) {
      wx.showToast({
        title: '请先保存记录',
        icon: 'none'
      })
      return
    }
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

    // 检查是否有记录 ID
    if (!this.data.beanId) {
      wx.showToast({
        title: '请先保存记录',
        icon: 'none'
      })
      this.setData({ showPublishDialog: false })
      return
    }

    this.setData({ isPublishing: true })

    try {
      // 获取当前记录数据
      const bean = getBeanById(this.data.beanId)
      if (!bean) {
        throw new Error('记录不存在')
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

      // 准备发布数据
      const publishData = {
        beanId: bean.id,
        userName: this.data.userProfile.nickName,
        userAvatar: this.data.userProfile.avatarUrl,
        beanName: bean.name,
        brand: bean.brand || '',
        type: bean.type,
        roastLevel: bean.roastLevel || '',
        origin: bean.origin || '',
        flavorNotes: bean.flavors || bean.flavorScores ? 
          (bean.type === BEAN_TYPE.POUR_OVER ? bean.flavors : Object.keys(bean.flavorScores || {})) : [],
        rating: bean.rating || 0,
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

      // 检查云函数返回结果
      if (res.errMsg !== 'cloud.callFunction:ok') {
        throw new Error('云函数调用失败')
      }

      if (res.result && res.result.success === false) {
        throw new Error(res.result.error || '发布失败')
      }

      // 发布成功
      this.setData({ showPublishDialog: false })
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000
      })

      // 提示用户可以在发现页查看
      setTimeout(() => {
        wx.showModal({
          title: '发布成功',
          content: '你可以在"发现"页看到它',
          showCancel: false,
          confirmText: '知道了'
        })
      }, 2000)

    } catch (err) {
      console.error('发布失败:', err)
      wx.showToast({
        title: err.message || '发布失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ isPublishing: false })
    }
  }
})

