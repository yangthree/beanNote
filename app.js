// app.js
App({
  onLaunch() {
    // 初始化本地存储
    this.initStorage()
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

  globalData: {
    userInfo: null
  }
})

