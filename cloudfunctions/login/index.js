const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    
    console.log('云函数 login 被调用')
    console.log('wxContext:', {
      OPENID: wxContext.OPENID,
      APPID: wxContext.APPID,
      UNIONID: wxContext.UNIONID
    })
    
    // 检查是否获取到 OpenID
    if (!wxContext.OPENID) {
      console.error('未获取到 OPENID')
      return {
        success: false,
        error: '未获取到用户 OpenID'
      }
    }
    
    // 返回 openid（小写，兼容客户端代码）
    const result = {
      success: true,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID || null
    }
    
    console.log('云函数 login 返回结果:', result)
    return result
  } catch (err) {
    console.error('云函数 login 执行错误:', err)
    return {
      success: false,
      error: err.message || '云函数执行失败'
    }
  }
}

