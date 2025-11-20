const auth = require('../../utils/auth.js')
const beanModel = require('../../utils/beanInventoryModel.js')

Page({
  data: {
    userProfile: null,
    showLoginDialog: false,
    loading: true,
    tabs: [
      { key: beanModel.STATUS.IN_STOCK, label: '在库' },
      { key: beanModel.STATUS.FINISHED, label: '已用完' }
    ],
    activeTab: beanModel.STATUS.IN_STOCK,
    beans: [],
    stats: {
      total: 0,
      inStock: 0,
      finished: 0,
      nearEmpty: 0
    }
  },

  onShow() {
    this.ensureUserAndLoad()
  },

  ensureUserAndLoad() {
    const app = getApp()
    let profile = null
    if (app && app.globalData && app.globalData.userProfile) {
      profile = app.globalData.userProfile
    } else {
      const cachedProfile = auth.getStoredProfile()
      const cachedOpenId = auth.getStoredOpenId()
      if (cachedProfile) {
        profile = cachedProfile
        if (app) {
          app.globalData.userProfile = cachedProfile
          if (cachedOpenId) {
            app.globalData.openId = cachedOpenId
          }
        }
      }
    }

    if (!profile) {
      this.setData({
        userProfile: null,
        showLoginDialog: true,
        loading: false,
        beans: []
      })
      return
    }

    this.setData({
      userProfile: profile,
      showLoginDialog: false
    })
    this.loadBeans()
  },

  loadBeans() {
    const openId = this.getOpenId()
    if (!openId) {
      this.setData({
        beans: [],
        stats: { total: 0, inStock: 0, finished: 0, nearEmpty: 0 },
        loading: false
      })
      return
    }
    const list = beanModel.getBeansByStatus(openId, this.data.activeTab)
    const stats = beanModel.getStats(openId)
    const formatted = list.map(bean => ({
      ...bean,
      roastDateText: formatDate(bean.roastDate),
      openDateText: formatDate(bean.openDate),
      statusLabel: bean.status === beanModel.STATUS.NEAR_EMPTY ? '即将用完' : '',
      progress: bean.totalWeight > 0 ? Math.round((bean.currentWeight / bean.totalWeight) * 100) : 0
    }))
    this.setData({
      beans: formatted,
      stats,
      loading: false
    })
  },

  getOpenId() {
    const app = getApp()
    if (app && app.globalData && app.globalData.openId) {
      return app.globalData.openId
    }
    const cached = auth.getStoredOpenId()
    if (cached && app) {
      app.globalData = app.globalData || {}
      app.globalData.openId = cached
    }
    return cached
  },

  handleTabChange(e) {
    const { key } = e.currentTarget.dataset
    if (!key || key === this.data.activeTab) return
    this.setData(
      {
        activeTab: key,
        loading: true
      },
      () => this.loadBeans()
    )
  },

  handleAddInventory() {
    if (!this.requireLogin()) return
    wx.navigateTo({
      url: '/pages/beanInventoryForm/beanInventoryForm'
    })
  },

  handleCardTap(e) {
    if (!this.requireLogin()) return
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({
      url: `/pages/beanInventoryDetail/beanInventoryDetail?id=${id}`
    })
  },

  requireLogin() {
    if (this.data.userProfile) return true
    this.setData({ showLoginDialog: true })
    return false
  },

  onLoginSuccess(e) {
    const { profile, openId } = e.detail || {}
    if (!profile) return
    const app = getApp()
    if (app) {
      app.globalData.userProfile = profile
      if (openId) {
        app.globalData.openId = openId
      }
    }
    this.setData({
      userProfile: profile,
      showLoginDialog: false
    })
    this.loadBeans()
  },

  onLoginDialogClose() {
    if (!this.data.userProfile) {
      this.setData({ showLoginDialog: true })
    }
  },

  onPullDownRefresh() {
    this.loadBeans()
    wx.stopPullDownRefresh()
  }
})

function formatDate(date) {
  if (!date) return ''
  if (typeof date === 'number') {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
  }
  return date
}
