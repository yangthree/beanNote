const auth = require('../../utils/auth.js')
const beanModel = require('../../utils/beanInventoryModel.js')

Page({
  data: {
    userProfile: null,
    showLoginDialog: false,
    isEdit: false,
    beanId: '',
    roastOptions: beanModel.ROAST_LEVELS,
    roastIndex: 0,
    form: {
      name: '',
      brand: '',
      roastLevel: beanModel.ROAST_LEVELS[0].label,
      origin: '',
      totalWeight: '',
      currentWeight: '',
      roastDate: '',
      openDate: '',
      notes: ''
    }
  },

  onLoad(options) {
    if (options && options.id) {
      this.setData({
        beanId: options.id,
        isEdit: true
      })
      wx.setNavigationBarTitle({
        title: '编辑库存'
      })
    }
  },

  onShow() {
    this.ensureUserAndInit()
  },

  ensureUserAndInit() {
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
      this.setData({ showLoginDialog: true })
      return
    }

    this.setData({
      userProfile: profile,
      showLoginDialog: false
    })

    if (this.data.isEdit) {
      this.loadBean()
    }
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
    const roastIndex = this.data.roastOptions.findIndex(item => item.label === bean.roastLevel)
    this.setData({
      form: {
        name: bean.name,
        brand: bean.brand,
        roastLevel: bean.roastLevel,
        origin: bean.origin,
        totalWeight: bean.totalWeight.toString(),
        currentWeight: bean.currentWeight.toString(),
        roastDate: bean.roastDate,
        openDate: bean.openDate,
        notes: bean.notes
      },
      roastIndex: roastIndex >= 0 ? roastIndex : 0
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
    if (this.data.isEdit) {
      this.loadBean()
    }
  },

  onLoginDialogClose() {
    if (!this.data.userProfile) {
      this.setData({ showLoginDialog: true })
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      form: {
        ...this.data.form,
        [field]: e.detail.value
      }
    })
  },

  onRoastChange(e) {
    const index = Number(e.detail.value) || 0
    this.setData({
      roastIndex: index,
      form: {
        ...this.data.form,
        roastLevel: this.data.roastOptions[index].label
      }
    })
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      form: {
        ...this.data.form,
        [field]: e.detail.value
      }
    })
  },

  validateForm() {
    const { name, roastLevel, totalWeight, currentWeight, roastDate } = this.data.form
    if (!name || !name.trim()) {
      return '请输入豆子名称'
    }
    if (!roastLevel) {
      return '请选择烘焙程度'
    }
    const total = Number(totalWeight)
    if (!total || total <= 0) {
      return '请输入总重量（>0）'
    }
    const current = Number(currentWeight || totalWeight)
    if (Number.isNaN(current) || current < 0) {
      return '请输入剩余重量'
    }
    if (current > total) {
      return '剩余重量不能大于总重量'
    }
    if (!roastDate) {
      return '请选择烘焙日期'
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
      id: this.data.beanId || undefined,
      ...this.data.form,
      totalWeight: Number(this.data.form.totalWeight),
      currentWeight: Number(
        this.data.form.currentWeight === '' ? this.data.form.totalWeight : this.data.form.currentWeight
      )
    }
    beanModel.upsertBean(openId, payload)
    wx.showToast({
      title: this.data.isEdit ? '已更新' : '已保存',
      icon: 'success'
    })
    setTimeout(() => {
      wx.navigateBack()
    }, 500)
  },

  handleDelete() {
    if (!this.data.isEdit || !this.data.beanId) return
    const openId = this.getOpenId()
    if (!openId) return
    wx.showModal({
      title: '删除库存',
      content: '确定删除该条库存记录吗？',
      confirmColor: '#d23c3c',
      success: (res) => {
        if (res.confirm) {
          beanModel.deleteBean(openId, this.data.beanId)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 400)
        }
      }
    })
  }
})

