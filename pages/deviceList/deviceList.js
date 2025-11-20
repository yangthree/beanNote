const auth = require('../../utils/auth.js')
const deviceModel = require('../../utils/deviceModel.js')

Page({
  data: {
    userProfile: null,
    showLoginDialog: false,
    groupedDevices: [],
    loading: true,
    showEmpty: false
  },

  onShow() {
    this.ensureUserAndLoad()
  },

  ensureUserAndLoad() {
    const app = getApp();
    let profile = null;
    let cachedOpenId = null;
    if (app && app.globalData.userProfile) {
      profile = app.globalData.userProfile
      cachedOpenId = app.globalData.openId || auth.getStoredOpenId()
    } else {
      const cachedProfile = auth.getStoredProfile()
      cachedOpenId = auth.getStoredOpenId()
      if (cachedProfile) {
        profile = cachedProfile
        if (app) {
          app.globalData.userProfile = cachedProfile
        }
      }
    }

    if (app && cachedOpenId && (!app.globalData || !app.globalData.openId)) {
      app.globalData = app.globalData || {}
      app.globalData.openId = cachedOpenId
    }

    if (!profile) {
      this.setData({
        userProfile: null,
        showLoginDialog: true,
        loading: false,
        groupedDevices: [],
        showEmpty: true
      })
      return
    }

    this.setData({
      userProfile: profile,
      showLoginDialog: false
    })
    this.loadDevices()
  },

  loadDevices() {
    const openId = this.getOpenId()
    if (!openId) {
      this.setData({
        groupedDevices: [],
        showEmpty: true,
        loading: false
      })
      return
    }
    const groups = deviceModel.getDeviceGroups(openId).map(group => ({
      ...group,
      devices: group.devices.map(item => ({
        ...item,
        displayTime: formatTime(item.updateTime || item.createTime)
      }))
    }))
    const total = groups.reduce((sum, group) => sum + group.devices.length, 0)
    this.setData({
      groupedDevices: groups,
      showEmpty: total === 0,
      loading: false
    })
  },

  getOpenId() {
    const app = getApp()
    const fromGlobal = app && app.globalData && app.globalData.openId
    const fromStorage = auth.getStoredOpenId()
    if (!fromGlobal && fromStorage && app) {
      app.globalData.openId = fromStorage
    }
    return fromGlobal || fromStorage
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
    this.loadDevices()
  },

  onLoginDialogClose() {
    if (!this.data.userProfile) {
      this.setData({ showLoginDialog: true })
    }
  },

  handleAddDevice() {
    if (!this.requireLogin()) return
    wx.navigateTo({
      url: '/pages/deviceForm/deviceForm'
    })
  },

  handleEditDevice(e) {
    if (!this.requireLogin()) return
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/deviceForm/deviceForm?id=${id}`
    })
  },

  openDeviceActions(e) {
    const { id, type } = e.currentTarget.dataset
    if (!id) return
    const actions = ['设为默认', '编辑', '删除']
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const openId = this.getOpenId()
        if (!openId) {
          this.requireLogin()
          return
        }
        const tapIndex = res.tapIndex
        if (tapIndex === 0) {
          deviceModel.setDefaultDevice(openId, id)
          wx.showToast({ title: '已设为默认', icon: 'success' })
          this.loadDevices()
        } else if ( tapIndex === 1) {
          this.handleEditDevice({ currentTarget: { dataset: { id } } })
        } else if (tapIndex === 2) {
          this.confirmDelete(id)
        }
      }
    })
  },

  confirmDelete(id) {
    wx.showModal({
      title: '删除设备',
      content: '确定删除该设备吗？删除后将无法在记录中快速选择。',
      confirmColor: '#d23c3c',
      success: (res) => {
        if (res.confirm) {
          const openId = this.getOpenId()
          deviceModel.deleteDevice(openId, id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadDevices()
        }
      }
    })
  },

  requireLogin() {
    if (this.data.userProfile) return true
    this.setData({ showLoginDialog: true })
    return false
  }
})

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

