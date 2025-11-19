// pages/discover/discover.js
// 发现页逻辑：展示所有用户发布的咖啡豆记录
const auth = require('../../utils/auth.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    discoverList: [], // 发现列表数据
    loading: false, // 是否正在加载
    refreshing: false, // 是否正在刷新
    hasMore: true, // 是否还有更多数据
    page: 1, // 当前页码
    pageSize: 10, // 每页数量（首次加载减少数据量，提升渲染性能）
    filterType: 'all', // 筛选类型：'all' / 'pourOver' / 'espresso'
    ratingFilter: 'all', // 评分筛选：'all' / '4.5-5' / '4.0-4.4' / '3.0-3.9' / '1.0-2.9'
    ratingOptions: [
      { key: 'all', label: '全部分数' },
      { key: '4.5-5', label: '4.5-5' },
      { key: '4.0-4.4', label: '4.0-4.4' },
      { key: '3.0-3.9', label: '3.0-3.9' },
      { key: '1.0-2.9', label: '1.0-2.9' }
    ],
    searchKeyword: '', // 搜索关键字
    showLoginDialog: false, // 是否显示登录弹窗
    isLoggingIn: false, // 是否正在登录
    tempAvatarUrl: '', // 临时头像URL（用户选择后）
    tempNickName: '' // 临时昵称（用户输入后）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查用户是否已登录
    // const app = getApp()
    // let profile = null

    // if (app && app.globalData.userProfile) {
    //   profile = app.globalData.userProfile
    // } else {
    //   const cachedProfile = auth.getStoredProfile()
    //   const cachedOpenId = auth.getStoredOpenId()
    //   if (cachedProfile) {
    //     profile = cachedProfile
    //     if (app) {
    //       app.globalData.userProfile = cachedProfile
    //     }
    //   }
    //   if (cachedOpenId && app) {
    //     app.globalData.openId = cachedOpenId
    //   }
    // }

    // if (profile) {
    //   // 已登录，继续加载数据
    //   this.loadDiscoverListData()
    // } else {
    //   // 未登录，显示登录弹窗
    //   this.setData({ showLoginDialog: true })
    // }
    this.loadDiscoverListData()
  },
  
  /**
   * 加载发现列表数据
   */
  loadDiscoverListData() {
    // 从本地存储读取上次的筛选状态
    const savedFilterType = wx.getStorageSync('discoverFilterType')
    const savedRatingFilter = wx.getStorageSync('discoverRatingFilter')
    const nextFilterType = savedFilterType && ['all', 'pourOver', 'espresso'].includes(savedFilterType)
      ? savedFilterType
      : 'all'
    const nextRatingFilter = savedRatingFilter && this.isValidRatingFilter(savedRatingFilter)
      ? savedRatingFilter
      : 'all'

    this.setData({
      filterType: nextFilterType,
      ratingFilter: nextRatingFilter
    }, () => {
      this.loadDiscoverList()
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const needRefresh = wx.getStorageSync('discoverNeedRefresh')
    if (needRefresh) {
      wx.removeStorageSync('discoverNeedRefresh')
      this.onRefresh()
      return
    }
    // 如果列表为空，则加载数据（避免每次显示都刷新）
    if (this.data.discoverList.length === 0) {
      this.loadDiscoverList()
    }
  },

  /**
   * 筛选类型切换事件
   * @param {Object} e - 事件对象，包含 data-type
   */
  onFilterTypeChange(e) {
    const { type } = e.currentTarget.dataset
    if (!type || type === this.data.filterType) return

    // 更新筛选类型
    this.setData({ 
      filterType: type,
      page: 1,
      hasMore: true,
      discoverList: [] // 清空列表，重新加载
    }, () => {
      // 保存到本地存储
      wx.setStorageSync('discoverFilterType', type)
      // 重新加载数据
      this.loadDiscoverList(true)
    })
  },

  /**
   * 评分筛选切换
   */
  onRatingFilterChange(e) {
    const { key } = e.currentTarget.dataset
    if (!key || key === this.data.ratingFilter) return

    if (!this.isValidRatingFilter(key)) return

    this.setData({
      ratingFilter: key,
      page: 1,
      hasMore: true,
      discoverList: []
    }, () => {
      wx.setStorageSync('discoverRatingFilter', key)
      this.loadDiscoverList(true)
    })
  },

  /**
   * 搜索框输入事件
   * - 更新关键字后重新加载数据
   * - 使用 setData 的回调保证 loadDiscoverList 在数据更新后执行
   */
  onSearchInput(e) {
    const keyword = e.detail.value || ''
    this.setData({ 
      searchKeyword: keyword.trim(),
      page: 1,
      hasMore: true,
      discoverList: [] // 清空列表，重新加载
    }, () => {
      this.loadDiscoverList(true)
    })
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    this.setData({ refreshing: true })
    this.setData({ page: 1, hasMore: true })
    this.loadDiscoverList(true).finally(() => {
      this.setData({ refreshing: false })
    })
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }
    // 加载更多时，先更新页码，避免重复加载同一页
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage }, () => {
      this.loadDiscoverList()
    })
  },

  /**
   * 刷新列表（重置页码）
   */
  refreshList() {
    this.setData({ page: 1, hasMore: true })
    this.loadDiscoverList()
  },

  /**
   * 格式化发布时间显示
   * @param {String|Date} date - 日期字符串或日期对象
   * @returns {String} 格式化后的时间字符串，格式：yyyy-mm-dd HH:mm
   */
  formatPublishTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  formatPricePer100g(value) {
    if (value === null || value === undefined) return ''
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0) return ''
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)
    return `¥${formatted}/100g`
  },

  /**
   * 加载发现列表数据
   * @param {Boolean} reset - 是否重置列表
   */
  async loadDiscoverList(reset = false) {
    if (this.data.loading) {
      return
    }

    this.setData({ loading: true })

    try {
      // 如果 reset 为 true，使用第一页；否则使用当前页码
      const page = reset ? 1 : this.data.page
      
      // 调用云函数 getDiscoverList 获取数据
      const ratingRange = this.getRatingRange(this.data.ratingFilter)

      const res = await wx.cloud.callFunction({
        name: 'getDiscoverList',
        data: {
          page: page,
          pageSize: this.data.pageSize,
          filterType: this.data.filterType, // 传入筛选类型
          ratingFilter: ratingRange,
          searchKeyword: this.data.searchKeyword || '' // 传入搜索关键词
        }
      })

      // 检查云函数调用是否成功
      if (res.errMsg !== 'cloud.callFunction:ok') {
        throw new Error('云函数调用失败')
      }

      // 检查返回结果
      if (res.result && res.result.success === false) {
        throw new Error(res.result.error || '获取列表失败')
      }

      // 处理返回的数据（优化：减少不必要的计算，使用更高效的数据处理）
      const rawData = res.result?.data || []
      const listData = rawData.map(item => {
        // 只处理必要的数据转换，减少计算
        const publishTime = item.publishTime ? this.formatPublishTime(item.publishTime) : ''
        const type = item.type === 'Pour Over' ? 'pourOver' : 'espresso'
        const ratingValue = item.rating !== undefined && item.rating !== null
          ? Number(item.rating).toFixed(1)
          : '0.0'
        
        const displayPrice = this.formatPricePer100g(item.pricePer100g)

        return {
          _id: item._id, // 保存发布记录的 ID，用于详情页查询
          beanId: item.beanId,
          beanName: item.beanName || '未命名咖啡豆',
          brand: item.brand || '',
          type: type,
          roastLevel: item.roastLevel || '',
          origin: item.origin || '',
          altitude: item.altitude || '',
          processMethod: item.processMethod || '',
          roastDate: item.roastDate || '',
          rating: item.rating || 0,
          displayRating: ratingValue,
          publishTime: publishTime,
          userName: item.userName || '匿名用户',
          userAvatar: item.userAvatar || '',
          pricePer100g: item.pricePer100g ?? null,
          displayPrice: displayPrice
        }
      })

      // 优化：合并 setData 调用，减少渲染次数
      if (reset) {
        this.setData({ 
          discoverList: listData, 
          page: 1,
          hasMore: res.result?.hasMore || false,
          loading: false
        })
      } else {
        // 加载更多时，页码已经在 onLoadMore 中更新了，这里只追加数据和更新 hasMore
        this.setData({ 
          discoverList: [...this.data.discoverList, ...listData],
          hasMore: res.result?.hasMore || false,
          loading: false
        })
      }
    } catch (err) {
      console.error('加载发现列表失败:', err)
      wx.showToast({
        title: err.message || '加载失败，请重试',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  /**
   * 校验评分筛选 key
   */
  isValidRatingFilter(key) {
    const validKeys = ['all', '4.5-5', '4.0-4.4', '3.0-3.9', '1.0-2.9']
    return validKeys.includes(key)
  },

  /**
   * 根据评分筛选 key 获取区间
   */
  getRatingRange(key) {
    switch (key) {
      case '4.5-5':
        return { min: 4.5, max: 5 }
      case '4.0-4.4':
        return { min: 4.0, max: 4.4 }
      case '3.0-3.9':
        return { min: 3.0, max: 3.9 }
      case '1.0-2.9':
        return { min: 1.0, max: 2.9 }
      default:
        return null
    }
  },

  /**
   * 查看详情
   * @param {Object} e - 事件对象
   */
  viewDetail(e) {
    const bean = e.currentTarget.dataset.bean
    const recordId = e.currentTarget.dataset.recordId
    
    console.log('点击查看详情，数据:', { bean, recordId })
    
    if (!bean || !bean.beanId) {
      console.error('数据错误：bean 或 beanId 不存在', bean)
      wx.showToast({
        title: '数据错误',
        icon: 'none'
      })
      return
    }
    
    // 跳转到详情页（只读模式）
    // 传递 beanId 和 recordId（如果有）
    let url = `/pages/beanDetail/beanDetail?beanId=${bean.beanId}`
    if (recordId) {
      url += `&recordId=${recordId}`
    }
    
    console.log('准备跳转到:', url)
    
    wx.navigateTo({
      url: url,
      success: (res) => {
        if (res.eventChannel) {
          res.eventChannel.emit('beanData', { bean, recordId })
        }
        console.log('跳转成功，已传递卡片数据')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        })
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
   * 关闭登录弹窗
   */
  closeLoginDialog() {
    if (!this.data.isLoggingIn) {
      // 如果未登录，不允许关闭弹窗
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }
  },

  /**
   * 阻止事件冒泡（用于弹窗内部点击）
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
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
        showLoginDialog: false,
        tempAvatarUrl: '',
        tempNickName: '',
        isLoggingIn: false
      })
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 登录成功后加载数据
      this.loadDiscoverListData()
    } catch (err) {
      console.error('登录失败:', err)
      this.setData({ isLoggingIn: false })
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none'
      })
    }
  },

})

