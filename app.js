// app.js
App({
  onLaunch() {
    this.initCloud()
    this.initStorage()
    this.loadUserProfile()
    this.ensureLaunchLogin()
  },

  onError(msg) {
    // 捕获全局错误，避免错误影响小程序运行
    console.error('App Error:', msg)
    // 如果是网络相关错误，可以忽略
    if (msg && msg.includes('Failed to fetch')) {
      console.warn('网络请求失败，但不影响小程序运行')
      return
    }
  },

  initCloud() {
    if (!wx.cloud) {
      console.warn('基础库过低，无法使用云开发能力')
      return
    }
    
    wx.cloud.init({
      env: 'test-3g3ho1oo318ec768', // TODO: 替换为实际环境 ID
      traceUser: true
    })
  },

  initStorage() {
    // 如果本地存储中没有咖啡豆数据，初始化空数组
    try {
      const beans = wx.getStorageSync('coffeeBeans') || []
      if (beans.length === 0) {
        wx.setStorageSync('coffeeBeans', [])
      }
    } catch (e) {
      console.error('初始化存储失败:', e)
    }
  },

  loadUserProfile() {
    try {
      const profile = wx.getStorageSync('userProfile') || null
      const openId = wx.getStorageSync('userOpenId') || ''
      if (profile) {
        this.globalData.userProfile = profile
      }
      if (openId) {
        this.globalData.openId = openId
      }
    } catch (err) {
      console.warn('加载本地用户信息失败', err)
    }
  },

  ensureLaunchLogin() {
    const profile = this.globalData.userProfile
    const openId = this.globalData.openId
    if (!profile || !openId) {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        const current = pages[pages.length - 1]
        if (current && typeof current.onNeedLogin === 'function') {
          current.onNeedLogin()
        }
      }
    }
  },

  globalData: {
    userProfile: null,
    openId: ''
  }
})

