const auth = require('../../utils/auth.js')
const deviceModel = require('../../utils/deviceModel.js')

Page({
  data: {
    userProfile: null,
    showLoginDialog: false,
    isEdit: false,
    deviceId: '',
    form: {
      type: deviceModel.DEVICE_TYPES[0].key,
      name: '',
      brand: '',
      model: '',
      isDefault: false
    },
    typeOptions: deviceModel.DEVICE_TYPES,
    typeIndex: 0
  },

  onLoad(options) {
    if (options && options.id) {
      this.setData({
        deviceId: options.id,
        isEdit: true
      })
    }
  },

  onShow() {
    this.ensureUserAndInit()
  },

  ensureUserAndInit() {
    const app = getApp()
    let profile = null
    if (app && app.globalData.userProfile) {
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
      this.setData({ showLoginDialog: true })
      return
    }

    this.setData({
      userProfile: profile,
      showLoginDialog: false
    })

    if (this.data.isEdit) {
      this.loadDevice()
    }
  },

  loadDevice() {
    const openId = this.getOpenId()
    if (!openId || !this.data.deviceId) return
    const device = deviceModel.getDeviceById(openId, this.data.deviceId)
    if (!device) {
      wx.showToast({ title: '设备不存在', icon: 'none' })
      wx.navigateBack()
      return
    }
    const typeIndex = this.data.typeOptions.findIndex(item => item.key === device.type)
    this.setData({
      form: {
        type: device.type,
        name: device.name,
        brand: device.brand,
        model: device.model,
        isDefault: !!device.isDefault
      },
      typeIndex: typeIndex >= 0 ? typeIndex : 0
    })
    wx.setNavigationBarTitle({
      title: '编辑设备'
    })
  },

  getOpenId() {
    const app = getApp()
    return (app && app.globalData && app.globalData.openId) || auth.getStoredOpenId()
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
    if (this.data.isEdit) {
      this.loadDevice()
    }
  },

  onLoginDialogClose() {
    if (!this.data.userProfile) {
      this.setData({ showLoginDialog: true })
    }
  },

  onTypeChange(e) {
    const index = Number(e.detail.value) || 0
    const type = this.data.typeOptions[index].key
    this.setData({
      typeIndex: index,
      form: {
        ...this.data.form,
        type
      }
    })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      form: {
        ...this.data.form,
        [field]: value
      }
    })
  },

  onDefaultChange(e) {
    this.setData({
      form: {
        ...this.data.form,
        isDefault: e.detail.value
      }
    })
  },

  validateForm() {
    const { type, name, brand } = this.data.form
    if (!type) {
      return '请选择设备类型'
    }
    if (!name || !name.trim()) {
      return '请输入设备名称'
    }
    if (!brand || !brand.trim()) {
      return '请输入品牌'
    }
    return ''
  },

  handleSubmit() {
    const error = this.validateForm()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    const openId = this.getOpenId()
    if (!openId) {
      this.setData({ showLoginDialog: true })
      return
    }

    const payload = {
      ...this.data.form,
      id: this.data.deviceId || undefined
    }
    deviceModel.upsertDevice(openId, payload)
    wx.showToast({
      title: this.data.isEdit ? '已更新' : '已保存',
      icon: 'success'
    })
    setTimeout(() => {
      wx.navigateBack()
    }, 400)
  },

  handleDelete() {
    const openId = this.getOpenId()
    if (!openId || !this.data.deviceId) return
    wx.showModal({
      title: '删除设备',
      content: '确定删除该设备吗？删除后将无法在记录中快速选择。',
      confirmColor: '#d23c3c',
      success: (res) => {
        if (res.confirm) {
          deviceModel.deleteDevice(openId, this.data.deviceId)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack()
          }, 400)
        }
      }
    })
  }
})

