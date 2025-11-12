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
  return wx.cloud.callFunction({ 
    name: 'login',
    data: {} // 即使不需要参数，也传一个空对象
  }).then(res => {
    console.log('=== 云函数 login 完整返回结果 ===')
    console.log('res:', JSON.stringify(res, null, 2))
    console.log('res.errMsg:', res?.errMsg)
    console.log('res.result:', res?.result)
    console.log('res.result 类型:', typeof res?.result)
    console.log('================================')
    
    // 检查云函数调用是否成功
    if (!res || res.errMsg !== 'cloud.callFunction:ok') {
      console.error('云函数调用失败:', res)
      throw new Error(`云函数调用失败: ${res?.errMsg || '未知错误'}`)
    }
    
    // 检查返回结果
    if (res.result) {
      console.log('res.result 内容:', res.result)
      
      // 如果云函数返回了 success 字段
      if (res.result.success === false) {
        throw new Error(res.result.error || '云函数执行失败')
      }
      
      // 兼容多种返回格式：
      // 1. res.result.openid (我们自定义的格式)
      // 2. res.result.OPENID (大写格式)
      // 3. res.result.userInfo.openId (微信默认格式)
      let openid = null
      
      if (res.result.openid) {
        openid = res.result.openid
      } else if (res.result.OPENID) {
        openid = res.result.OPENID
      } else if (res.result.userInfo && res.result.userInfo.openId) {
        openid = res.result.userInfo.openId
      }
      
      if (openid) {
        console.log('成功获取到 openid:', openid)
        return openid
      }
      
      // 如果 result 是对象但没有 openid，打印所有键
      if (typeof res.result === 'object') {
        console.log('res.result 的所有键:', Object.keys(res.result))
        if (res.result.userInfo) {
          console.log('res.result.userInfo 的所有键:', Object.keys(res.result.userInfo))
        }
      }
    }
    
    // 如果 result 为空或没有 openid，可能是云函数未部署或返回格式不对
    console.error('云函数返回数据异常，完整数据:', JSON.stringify(res, null, 2))
    throw new Error('未获取到 openId，请检查云函数返回格式。完整返回数据已打印到控制台')
  }).catch(err => {
    console.error('调用云函数 login 失败:', err)
    // 如果是云函数未找到的错误
    if (err.errMsg && err.errMsg.includes('function not found')) {
      throw new Error('云函数 login 未部署，请在云开发控制台部署该云函数')
    }
    throw err
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

/**
 * 保存用户信息到云数据库 users 集合
 * @param {String} openId - 用户 OpenID
 * @param {Object} profile - 用户信息（nickName, avatarUrl）
 */
async function saveUserToCloud(openId, profile) {
  try {
    ensureCloud()
    const db = wx.cloud.database()
    const usersCollection = db.collection('users')
    
    // 查询用户是否已存在
    const queryResult = await usersCollection.where({
      _openid: openId
    }).get()
    
    const userData = {
      nickName: profile.nickName,
      avatarUrl: profile.avatarUrl,
      updateTime: new Date()
    }
    
    if (queryResult.data.length > 0) {
      // 用户已存在，更新信息
      await usersCollection.doc(queryResult.data[0]._id).update({
        data: userData
      })
      console.log('用户信息已更新到云数据库')
    } else {
      // 用户不存在，创建新记录
      userData.createTime = new Date()
      await usersCollection.add({
        data: userData
      })
      console.log('用户信息已保存到云数据库')
    }
  } catch (err) {
    console.error('保存用户信息到云数据库失败:', err)
    // 不抛出错误，避免影响登录流程
  }
}

async function login() {
  const profileRes = await requestUserProfile()
  
  // 调试：打印授权时获取到的原始数据
  console.log('=== 授权获取到的原始数据 ===')
  console.log('profileRes:', JSON.stringify(profileRes, null, 2))
  console.log('profileRes.userInfo:', profileRes.userInfo)
  console.log('nickName:', profileRes.userInfo?.nickName)
  console.log('avatarUrl:', profileRes.userInfo?.avatarUrl)
  console.log('==========================')
  
  const openId = await callLoginFunction()
  const profile = {
    nickName: profileRes.userInfo.nickName,
    avatarUrl: profileRes.userInfo.avatarUrl
  }
  
  console.log('准备保存的用户信息:', profile)
  
  // 保存到本地存储
  saveProfile(profile, openId)
  
  // 保存到云数据库
  await saveUserToCloud(openId, profile)
  
  return { profile, openId }
}

async function ensureLogin() {
  const storedProfile = getStoredProfile()
  const storedOpenId = getStoredOpenId()
  if (storedProfile && storedOpenId) {
    // 即使本地有缓存，也尝试更新云数据库中的用户信息（静默更新）
    saveUserToCloud(storedOpenId, storedProfile).catch(err => {
      console.warn('静默更新用户信息失败:', err)
    })
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
  clearProfile,
  callLoginFunction,
  saveProfile,
  saveUserToCloud
}

