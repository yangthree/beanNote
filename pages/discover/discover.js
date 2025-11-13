// pages/discover/discover.js
// 发现页逻辑：展示所有用户发布的咖啡豆记录

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
    filterType: 'all' // 筛选类型：'all' / 'pourOver' / 'espresso'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从本地存储读取上次的筛选状态
    const savedFilterType = wx.getStorageSync('discoverFilterType')
    if (savedFilterType && ['all', 'pourOver', 'espresso'].includes(savedFilterType)) {
      this.setData({ filterType: savedFilterType }, () => {
        this.loadDiscoverList()
      })
    } else {
      this.loadDiscoverList()
    }
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
      const res = await wx.cloud.callFunction({
        name: 'getDiscoverList',
        data: {
          page: page,
          pageSize: this.data.pageSize,
          filterType: this.data.filterType // 传入筛选类型
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
          userAvatar: item.userAvatar || ''
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

})

