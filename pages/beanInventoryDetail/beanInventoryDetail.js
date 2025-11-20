const auth = require('../../utils/auth.js')
const beanModel = require('../../utils/beanInventoryModel.js')

Page({
  data: {
    beanId: '',
    bean: null,
    userProfile: null,
    showLoginDialog: false,
    loading: true
  },

  onLoad(options) {
    if (options && options.id) {
      this.setData({ beanId: options.id })
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
        loading: false
      })
      return
    }

    this.setData({
      userProfile: profile,
      showLoginDialog: false
    })
    this.loadBean()
  },

  getOpenId() {
    const app = getApp()
    return (app && app.globalData && app.globalData.openId) || auth.getStoredOpenId()
  },

  loadBean() {
    const openId = this.getOpenId()
    if (!openId || !this.data.beanId) return
    const bean = beanModel.getBeanById(openId, this.data.beanId)
    if (!bean) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      wx.navigateBack()
      return
    }
    const formatted = {
      ...bean,
      roastDateText: formatDate(bean.roastDate),
      openDateText: formatDate(bean.openDate),
      progress: bean.totalWeight > 0 ? Math.round((bean.currentWeight / bean.totalWeight) * 100) : 0,
      statusLabel: getStatusLabel(bean.status)
    }
    this.setData({
      bean: formatted,
      loading: false
    })
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
    this.loadBean()
  },

  onLoginDialogClose() {
    if (!this.data.userProfile) {
      this.setData({ showLoginDialog: true })
    }
  },

  handleEdit() {
    if (!this.requireLogin() || !this.data.beanId) return
    wx.navigateTo({
      url: `/pages/beanInventoryForm/beanInventoryForm?id=${this.data.beanId}`
    })
  },

  handleRecordConsume() {
    if (!this.requireLogin() || !this.data.beanId) return
    wx.showModal({
      title: '记录消耗',
      content: '请输入本次消耗克数',
      editable: true,
      placeholderText: '例如：15',
      success: (res) => {
        if (res.confirm) {
          const amount = Number(res.content)
          if (!amount || amount <= 0) {
            wx.showToast({ title: '请输入正确克数', icon: 'none' })
            return
          }
          const openId = this.getOpenId()
          beanModel.recordConsumption(openId, this.data.beanId, amount)
          wx.showToast({ title: '已更新', icon: 'success' })
          this.loadBean()
        }
      }
    })
  },

  handleMarkFinished() {
    if (!this.requireLogin() || !this.data.beanId) return
    wx.showModal({
      title: '标记为已用完',
      content: '确认该豆子已经全部使用完毕？',
      confirmColor: '#8a673b',
      success: (res) => {
        if (res.confirm) {
          const openId = this.getOpenId()
          beanModel.markFinished(openId, this.data.beanId)
          wx.showToast({ title: '已标记', icon: 'success' })
          this.loadBean()
        }
      }
    })
  },

  requireLogin() {
    if (this.data.userProfile) return true
    this.setData({ showLoginDialog: true })
    return false
  },

  onPullDownRefresh() {
    this.loadBean()
    wx.stopPullDownRefresh()
  }
})

function formatDate(date) {
  if (!date) return '--'
  if (typeof date === 'number') {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '--'
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
  }
  return date
}

function getStatusLabel(status) {
  if (status === beanModel.STATUS.FINISHED) {
    return '已用完'
  }
  if (status === beanModel.STATUS.NEAR_EMPTY) {
    return '即将用完'
  }
  return '在库'
}

