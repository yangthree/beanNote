// utils/auth.js
// 微信登录逻辑封装

const PROFILE_KEY = 'userProfile'
const OPENID_KEY = 'userOpenId'

function getStoredProfile() {
  try {
    return wx.getStorageSync(PROFILE_KEY) || null
  } catch (err) {
    console.warn('读取用户信息失败', err)
    return null
  }
}

function getStoredOpenId() {
  try {
    return wx.getStorageSync(OPENID_KEY) || ''
  } catch (err) {
    console.warn('读取 openId 失败', err)
    return ''
  }
}

function saveProfile(profile, openId) {
  try {
    wx.setStorageSync(PROFILE_KEY, profile)
    if (openId) {
      wx.setStorageSync(OPENID_KEY, openId)
    }
  } catch (err) {
    console.warn('写入用户信息失败', err)
  }
  const app = getApp()
  if (app) {
    app.globalData.userProfile = profile
    if (openId) {
      app.globalData.openId = openId
    }
  }
}

function clearProfile() {
  try {
    wx.removeStorageSync(PROFILE_KEY)
    wx.removeStorageSync(OPENID_KEY)
  } catch (err) {
    console.warn('清除用户信息失败', err)
  }
  const app = getApp()
  if (app) {
    app.globalData.userProfile = null
    app.globalData.openId = ''
  }
}

function ensureCloud() {
  if (!wx.cloud) {
    throw new Error('当前基础库版本过低，请升级微信以使用云能力')
  }
}

function callLoginFunction() {
  ensureCloud()
  return wx.cloud.callFunction({ name: 'login' }).then(res => {
    if (res && res.result && res.result.openid) {
      return res.result.openid
    }
    throw new Error('未获取到 openId')
  })
}

function requestUserProfile() {
  return new Promise((resolve, reject) => {
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于展示发布者信息',
        success: resolve,
        fail: reject
      })
    } else {
      wx.getSetting({
        success(settings) {
          if (settings.authSetting['scope.userInfo']) {
            wx.getUserInfo({ success: resolve, fail: reject })
          } else {
            reject(new Error('未授权获取用户信息'))
          }
        },
        fail: reject
      })
    }
  })
}

async function login() {
  const profileRes = await requestUserProfile()
  const openId = await callLoginFunction()
  const profile = {
    nickName: profileRes.userInfo.nickName,
    avatarUrl: profileRes.userInfo.avatarUrl
  }
  saveProfile(profile, openId)
  return { profile, openId }
}

async function ensureLogin() {
  const storedProfile = getStoredProfile()
  const storedOpenId = getStoredOpenId()
  if (storedProfile && storedOpenId) {
    return {
      profile: storedProfile,
      openId: storedOpenId
    }
  }
  return login()
}

module.exports = {
  login,
  ensureLogin,
  getStoredProfile,
  getStoredOpenId,
  clearProfile
}

