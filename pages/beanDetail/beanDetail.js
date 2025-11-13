// pages/beanDetail/beanDetail.js
// 豆子详情页（只读模式）：展示咖啡豆的完整信息

Page({
  /**
   * 页面的初始数据
   */
  data: {
    beanId: null, // 豆子 ID
    recordId: null, // 发布记录的 ID（从发现页传入）
    loading: true, // 是否正在加载
    beanData: null, // 豆子完整数据
    initialBean: null, // 从上一级传入的卡片数据
    // 展示用的格式化数据
    displayData: {
      name: '',
      origin: '',
      brand: '',
      roastLevel: '',
      rating: 0,
      ratingText: '0.0',
      flavors: [],
      notes: '',
      coverImage: '',
      type: 'pourOver', // pourOver / espresso
      // 手冲参数
      brewParams: {
        coffeeWeight: '',
        waterWeight: '',
        temperature: '',
        time: '',
        grindSize: '',
        ratio: '' // 水粉比
      },
      // 意式参数
      extractParams: {
        coffeeWeight: '',
        outputWeight: '',
        temperature: '',
        time: '',
        grindSize: '',
        ratio: '' // 萃取比
      },
      // 意式风味评分
      flavorScores: {
        bitterness: 0,
        acidity: 0,
        balance: 0,
        body: 0
      },
      // 用户信息
      userName: '',
      userAvatar: '',
      publishTime: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { beanId, recordId } = options || {}

    this._loading = false
    this._hasLoaded = false

    this.setData({
      beanId: beanId || null,
      recordId: recordId || null
    })

    const eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null
    let cardDataReceived = false

    if (eventChannel && eventChannel.on) {
      eventChannel.on('beanData', (payload = {}) => {
        cardDataReceived = true
        const { bean, recordId: channelRecordId } = payload
        console.log('[BeanDetail] 接收到上级卡片数据:', payload)
        this.setData({
          initialBean: bean || null,
          beanId: (bean && bean.beanId) || this.data.beanId,
          recordId: channelRecordId || this.data.recordId
        }, () => {
          this.loadBeanDetail()
        })
      })
    }

    // 如果没有收到卡片数据（例如从本地列表进入），直接加载
    setTimeout(() => {
      if (!cardDataReceived) {
        this.loadBeanDetail()
      }
    }, 0)
  },

  /**
   * 加载豆子详情数据
   */
  async loadBeanDetail() {
    if (this._loading) {
      return
    }
    this._loading = true
    this.setData({ loading: true })

    try {
      let beanData = this.data.initialBean ? { ...this.data.initialBean } : null

      console.log('[BeanDetail] 初始卡片数据:', beanData)

      // 如果缺少用户信息并有 recordId，从云端拉取发布详情补全
      if (this.data.recordId) {
        const cloudBean = await this.getBeanFromCloud(this.data.recordId)
        if (cloudBean) {
          beanData = beanData ? { ...beanData, ...cloudBean } : cloudBean
          console.log('[BeanDetail] 云端数据补全:', cloudBean)
        }
      }

      if (!beanData) {
        throw new Error('记录不存在或已被删除')
      }

      // 格式化数据用于展示
      this.formatDisplayData(beanData)
      this._hasLoaded = true

    } catch (err) {
      console.error('加载详情失败:', err)
      wx.showModal({
        title: '加载失败',
        content: err.message || '记录不存在或已被删除',
        showCancel: false,
        confirmText: '返回',
        success: () => {
          wx.navigateBack()
        }
      })
      this._hasLoaded = false
    } finally {
      this._loading = false
      this.setData({ loading: false })
    }
  },

  /**
   * 从云端获取发布记录（通过 recordId）
   */
  async getBeanFromCloud(recordId) {
    // 直接使用数据库查询
    return await this.getBeanFromCloudDB(recordId)
  },

  /**
   * 从云端数据库直接获取发布记录
   */
  async getBeanFromCloudDB(recordId) {
    try {
      const db = wx.cloud.database()
      const result = await db.collection('publish_records').doc(recordId).get()
      
      if (result.data) {
        return this.mapPublishRecordToBeanData(result.data)
      }
      return null
    } catch (err) {
      console.error('从数据库获取详情失败:', err)
      return null
    }
  },

  /**
   * 通过 beanId 从云端获取
   */
  async getBeanFromCloudByBeanId(beanId) {
    try {
      const db = wx.cloud.database()
      const result = await db.collection('publish_records')
        .where({
          beanId: beanId
        })
        .orderBy('publishTime', 'desc')
        .limit(1)
        .get()
      
      if (result.data && result.data.length > 0) {
        return this.mapPublishRecordToBeanData(result.data[0])
      }
      return null
    } catch (err) {
      console.error('通过 beanId 获取详情失败:', err)
      return null
    }
  },

  /**
   * 将发布记录映射为 bean 数据格式
   */
  mapPublishRecordToBeanData(record) {
    // 尝试从本地存储获取完整数据（如果 beanId 存在）
    if (record.beanId) {
      try {
        const { getBeanById } = require('../../utils/dataModel.js')
        const localBean = getBeanById(record.beanId)
        if (localBean) {
          // 合并本地数据和发布记录数据（优先使用本地数据，但保留发布记录的用户信息）
          return {
            ...localBean,
            beanId: record.beanId,
            altitude: localBean.altitude || record.altitude || '',
            processMethod: localBean.processMethod || record.processMethod || '',
            roastDate: localBean.roastDate || record.roastDate || '',
            userName: record.userName || '匿名用户',
            userAvatar: record.userAvatar || '',
            publishTime: record.publishTime || record.createTime || ''
          }
        }
      } catch (err) {
        console.warn('从本地获取完整数据失败:', err)
      }
    }

    // 如果没有本地数据，使用发布记录的数据
    return {
      id: record.beanId || record._id,
      beanId: record.beanId,
      name: record.beanName || '',
      brand: record.brand || '',
      roastLevel: record.roastLevel || '',
      origin: record.origin || '',
      altitude: record.altitude !== undefined && record.altitude !== null ? String(record.altitude) : '',
      processMethod: record.processMethod || '',
      roastDate: record.roastDate || '',
      rating: record.rating || 0,
      flavors: record.flavorNotes || [],
      notes: record.notes || '', // 发布记录中可能没有 notes
      coverImage: record.coverImage || '', // 发布记录中可能没有 coverImage
      type: record.type === 'Pour Over' ? 'pourOver' : 'espresso',
      // 发布记录中可能没有完整的参数
      brewParams: record.brewParams || {},
      extractParams: record.extractParams || {},
      flavorScores: record.flavorScores || {},
      userName: record.userName || '匿名用户',
      userAvatar: record.userAvatar || '',
      publishTime: record.publishTime || record.createTime || ''
    }
  },

  /**
   * 格式化数据用于展示
   */
  formatDisplayData(beanData) {
    const displayData = {
      name: beanData.name || '未命名咖啡豆',
      origin: beanData.origin || '',
      brand: beanData.brand || '',
      roastLevel: beanData.roastLevel || '',
      rating: beanData.rating || 0,
      ratingText: beanData.rating ? beanData.rating.toFixed(1) : '0.0',
      flavors: Array.isArray(beanData.flavors) ? beanData.flavors : [],
      notes: beanData.notes || '',
      coverImage: beanData.coverImage || '',
      type: beanData.type || 'pourOver',
      userName: beanData.userName || '匿名用户',
      userAvatar: beanData.userAvatar || '',
      publishTime: beanData.publishTime ? this.formatPublishTime(beanData.publishTime) : '',
      // PRD v4 中提到的字段（如果数据中有）
      processMethod: beanData.processMethod || '',
      altitude: beanData.altitude || '',
      roastDate: beanData.roastDate || ''
    }

    // 格式化手冲参数
    if (beanData.brewParams) {
      const { coffeeWeight, waterWeight, temperature, time, grindSize } = beanData.brewParams
      let ratio = ''
      if (coffeeWeight && waterWeight) {
        const coffee = parseFloat(coffeeWeight)
        const water = parseFloat(waterWeight)
        if (coffee > 0 && water > 0) {
          ratio = `1:${(water / coffee).toFixed(1)}`
        }
      }
      displayData.brewParams = {
        coffeeWeight: coffeeWeight || '',
        waterWeight: waterWeight || '',
        temperature: temperature || '',
        time: time ? this.formatTime(time) : '',
        grindSize: grindSize || '',
        ratio: ratio
      }
    }

    // 格式化意式参数
    if (beanData.extractParams) {
      const { coffeeWeight, outputWeight, temperature, time, grindSize } = beanData.extractParams
      let ratio = ''
      if (coffeeWeight && outputWeight) {
        const coffee = parseFloat(coffeeWeight)
        const output = parseFloat(outputWeight)
        if (coffee > 0 && output > 0) {
          ratio = `1:${(output / coffee).toFixed(1)}`
        }
      }
      displayData.extractParams = {
        coffeeWeight: coffeeWeight || '',
        outputWeight: outputWeight || '',
        temperature: temperature || '',
        time: time ? this.formatTime(time) : '',
        grindSize: grindSize || '',
        ratio: ratio,
        machine: (beanData.equipment && beanData.equipment.brewer) || beanData.extractParams?.machine || ''
      }
    }

    displayData.flavorScores = this.mapFlavorScoresForDisplay(beanData.flavorScores, displayData.type)

    console.log('[BeanDetail] 映射后的用户信息:', {
      userName: displayData.userName,
      userAvatar: displayData.userAvatar,
      type: displayData.type
    })

    this.setData({
      beanData: beanData,
      displayData: displayData
    })
  },

  mapFlavorScoresForDisplay(rawScores = {}, type = 'pourOver') {
    const toNumber = (value) => {
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    }
    if (type === 'pourOver') {
      return {
        aroma: toNumber(rawScores.aroma ?? rawScores.bitterness),
        acidity: toNumber(rawScores.acidity),
        sweetness: toNumber(rawScores.sweetness),
        balance: toNumber(rawScores.balance ?? rawScores.body),
        body: 0
      }
    }
    return {
      aroma: toNumber(rawScores.aroma ?? rawScores.bitterness),
      body: toNumber(rawScores.body),
      sweetness: toNumber(rawScores.sweetness),
      balance: toNumber(rawScores.balance),
      acidity: toNumber(rawScores.acidity)
    }
  },

  /**
   * 格式化时间（秒转 mm:ss）
   */
  formatTime(seconds) {
    if (!seconds) return ''
    const sec = parseInt(seconds)
    const minutes = Math.floor(sec / 60)
    const secs = sec % 60
    return `${minutes}'${String(secs).padStart(2, '0')}"`
  },

  /**
   * 格式化发布时间
   */
  formatPublishTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack()
  },

  /**
   * 分享按钮点击
   */
  onShare() {
    // 触发微信原生分享
    // 注意：微信小程序中，分享功能需要通过右上角菜单触发
    // 这里可以显示一个提示
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    })
  },

  /**
   * 分享功能（微信原生）
   */
  onShareAppMessage() {
    const { displayData } = this.data
    return {
      title: `${displayData.name} - 咖啡豆记录`,
      path: `/pages/beanDetail/beanDetail?beanId=${this.data.beanId || ''}&recordId=${this.data.recordId || ''}`,
      imageUrl: displayData.coverImage || ''
    }
  }
})

