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
    pageSize: 10 // 每页数量
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadDiscoverList()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 调试：在页面渲染完成后获取元素尺寸
    setTimeout(() => {
      this.debugLayout()
    }, 500) // 延迟500ms确保DOM完全渲染
  },

  /**
   * 调试布局：获取页面和滚动区域的尺寸信息
   */
  debugLayout() {
    const systemInfo = wx.getSystemInfoSync()
    console.log('=== 发现页调试信息 ===')
    console.log('屏幕高度:', systemInfo.windowHeight, 'px')
    console.log('屏幕宽度:', systemInfo.windowWidth, 'px')
    console.log('状态栏高度:', systemInfo.statusBarHeight, 'px')
    console.log('安全区域底部:', systemInfo.safeArea?.bottom, 'px')
    console.log('安全区域高度:', systemInfo.safeArea?.height, 'px')
    
    // 获取页面信息
    const query = wx.createSelectorQuery().in(this)
    query.select('.page').boundingClientRect((rect) => {
      if (rect) {
        console.log('页面容器高度:', rect.height, 'px')
        console.log('页面容器宽度:', rect.width, 'px')
        console.log('页面容器 top:', rect.top, 'px')
        console.log('页面容器 bottom:', rect.bottom, 'px')
      } else {
        console.log('页面容器查询失败')
      }
    })
    query.select('.discover-list').boundingClientRect((rect) => {
      if (rect) {
        console.log('滚动区域高度:', rect.height, 'px')
        console.log('滚动区域宽度:', rect.width, 'px')
        console.log('滚动区域 top:', rect.top, 'px')
        console.log('滚动区域 bottom:', rect.bottom, 'px')
        console.log('滚动区域 left:', rect.left, 'px')
        console.log('滚动区域 right:', rect.right, 'px')
        
        // 计算差值
        if (rect.bottom && systemInfo.windowHeight) {
          const gap = systemInfo.windowHeight - rect.bottom
          console.log('滚动区域底部距离屏幕底部的距离:', gap, 'px')
          
          if (gap > 0) {
            console.warn('⚠️ 滚动区域没有完全到底部，差距:', gap, 'px')
          }
        }
      } else {
        console.log('滚动区域查询失败，可能 scroll-view 还未渲染')
      }
    })
    
    // 单独查询内容区域（使用不同的查询实例）
    const contentQuery = wx.createSelectorQuery().in(this)
    contentQuery.select('.bean-list').boundingClientRect((contentRect) => {
      if (contentRect) {
        console.log('内容区域高度:', contentRect.height, 'px')
        console.log('内容区域宽度:', contentRect.width, 'px')
        
        // 获取 scroll-view 的高度（需要重新查询）
        const scrollQuery = wx.createSelectorQuery().in(this)
        scrollQuery.select('.discover-list').boundingClientRect((scrollRect) => {
          if (scrollRect) {
            // 计算可滚动高度（scroll-view 高度 - padding）
            // rpx 转 px: 在 390px 宽度的设备上，1rpx ≈ 0.52px
            const rpxToPx = systemInfo.windowWidth / 750
            const paddingTop = 48 * rpxToPx
            const paddingBottom = 200 * rpxToPx
            const scrollableHeight = scrollRect.height - paddingTop - paddingBottom
            console.log('可滚动高度（scroll-view - padding）:', scrollableHeight.toFixed(2), 'px')
            console.log('padding-top:', paddingTop.toFixed(2), 'px')
            console.log('padding-bottom:', paddingBottom.toFixed(2), 'px')
            
            // 判断内容是否可以滚动
            if (contentRect.height > scrollableHeight) {
              console.log('✅ 内容高度大于可滚动高度，可以滚动')
              console.log('内容超出:', (contentRect.height - scrollableHeight).toFixed(2), 'px')
            } else {
              console.warn('⚠️ 内容高度小于可滚动高度，可能无法完全滚动到底部')
              console.warn('内容高度:', contentRect.height, 'px')
              console.warn('可滚动高度:', scrollableHeight.toFixed(2), 'px')
              console.warn('差距:', (scrollableHeight - contentRect.height).toFixed(2), 'px')
            }
          }
        })
        scrollQuery.exec()
      } else {
        console.log('内容区域查询失败，可能内容还未渲染或列表为空')
      }
    })
    contentQuery.exec()
    
    query.exec()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 如果列表为空，则加载数据（避免每次显示都刷新）
    if (this.data.discoverList.length === 0) {
      this.loadDiscoverList()
    }
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
    this.loadDiscoverList()
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
      // 调用云函数 getDiscoverList 获取数据
      const res = await wx.cloud.callFunction({
        name: 'getDiscoverList',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      })

      console.log('云函数 getDiscoverList 返回:', res)

      // 检查云函数调用是否成功
      if (res.errMsg !== 'cloud.callFunction:ok') {
        throw new Error('云函数调用失败')
      }

      // 检查返回结果
      if (res.result && res.result.success === false) {
        throw new Error(res.result.error || '获取列表失败')
      }

      // 处理返回的数据
      const listData = (res.result?.data || []).map(item => {
        return {
          ...item,
          publishTime: this.formatPublishTime(item.publishTime),
          type: item.type === 'Pour Over' ? 'pourOver' : 'espresso', // 统一类型格式
          userName: item.userName || '匿名用户', // 确保有默认值
          userAvatar: item.userAvatar || '' // 确保有默认值
        }
      })

      console.log('处理后的列表数据:', listData)

      if (reset) {
        this.setData({ 
          discoverList: listData, 
          page: 1,
          hasMore: res.result?.hasMore || false
        })
      } else {
        this.setData({ 
          discoverList: [...this.data.discoverList, ...listData],
          page: this.data.page + 1,
          hasMore: res.result?.hasMore || false
        })
      }

      this.setData({ loading: false })
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
    // TODO: 跳转到详情页（只读模式）
    console.log('查看详情:', bean)
  }
})

