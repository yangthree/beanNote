const auth = require('../../utils/auth.js')

Page({
  data: {
    userProfile: null,
    showLoginDialog: false,
    entries: [
      {
        id: 'devices',
        title: '常用冲煮设备',
        desc: '管理咖啡机、手冲壶、磨豆机等设备',
        path: '/pages/deviceList/deviceList'
      },
      {
        id: 'inventory',
        title: '豆子库存管理',
        desc: '录入豆子库存，追踪剩余克数和状态',
        path: '/pages/beanInventory/beanInventory'
      }
    ]
  },

  onShow() {
    this.refreshUserProfile()
  },

  refreshUserProfile() {
    const app = getApp()
    let profile = null
    if (app && app.globalData && app.globalData.userProfile) {
      profile = app.globalData.userProfile
    } else {
      profile = auth.getStoredProfile()
      const openId = auth.getStoredOpenId()
      if (app && profile) {
        app.globalData.userProfile = profile
        if (openId) {
          app.globalData.openId = openId
        }
      }
    }
    this.setData({
      userProfile: profile || null,
      showLoginDialog: !profile
    })
  },

  handleLogin() {
    if (this.data.userProfile) return
    this.setData({ showLoginDialog: true })
  },

  openLoginDialog() {
    this.handleLogin()
  },

  onLoginDialogClose() {
    if (!this.data.userProfile) return
    this.setData({ showLoginDialog: false })
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
  },

  onEntryTap(e) {
    const { path } = e.currentTarget.dataset
    if (!path) return

    if (!this.data.userProfile) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      this.handleLogin()
      return
    }

    wx.navigateTo({
      url: path,
      fail: () => {
        wx.showToast({
          title: '页面暂未开放',
          icon: 'none'
        })
      }
    })
  }
})

