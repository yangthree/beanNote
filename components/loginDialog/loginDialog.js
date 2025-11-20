const auth = require('../../utils/auth.js')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(newVal) {
        if (newVal) {
          this.resetTempFields()
        }
      }
    },
    closable: {
      type: Boolean,
      value: true
    },
    defaultAvatar: {
      type: String,
      value: ''
    },
    defaultNickName: {
      type: String,
      value: ''
    }
  },

  data: {
    tempAvatarUrl: '',
    tempNickName: '',
    isLoggingIn: false
  },

  methods: {
    resetTempFields() {
      this.setData({
        tempAvatarUrl: this.data.defaultAvatar || '',
        tempNickName: this.data.defaultNickName || ''
      })
    },

    stopPropagation() {},

    handleMaskTap() {
      if (!this.data.closable || this.data.isLoggingIn) return
      this.triggerEvent('close')
    },

    onChooseAvatar(e) {
      const { avatarUrl } = e.detail || {}
      if (avatarUrl) {
        this.setData({ tempAvatarUrl: avatarUrl })
      }
    },

    onNickNameInput(e) {
      this.setData({ tempNickName: e.detail.value })
    },

    onNickNameBlur(e) {
      const value = (e.detail.value || '').trim()
      if (value) {
        this.setData({ tempNickName: value })
      }
    },

    async confirmLogin() {
      if (this.data.isLoggingIn) return

      if (!this.data.tempAvatarUrl) {
        wx.showToast({
          title: '请选择头像',
          icon: 'none'
        })
        return
      }

      const nick = (this.data.tempNickName || '').trim()
      if (!nick) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none'
        })
        return
      }

      this.setData({ isLoggingIn: true })
      wx.showLoading({ title: '登录中', mask: true })

      try {
        const openId = await auth.callLoginFunction()
        const profile = {
          nickName: nick,
          avatarUrl: this.data.tempAvatarUrl
        }

        auth.saveProfile(profile, openId)
        await auth.saveUserToCloud(openId, profile)

        this.triggerEvent('success', { profile, openId })
        this.triggerEvent('close')
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } catch (err) {
        wx.showToast({
          title: err.message || '登录失败，请重试',
          icon: 'none'
        })
      } finally {
        this.setData({ isLoggingIn: false })
        wx.hideLoading()
      }
    }
  }
})

