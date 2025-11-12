const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 云函数：发布咖啡豆记录到发现页
 * 将用户的豆单记录发布到 publish_records 集合
 */
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const { beanData } = event

    console.log('云函数 publishRecord 被调用')
    console.log('beanData:', beanData)
    console.log('OPENID:', wxContext.OPENID)

    // 验证必要参数
    if (!beanData) {
      return {
        success: false,
        error: '缺少豆单数据'
      }
    }

    if (!wxContext.OPENID) {
      return {
        success: false,
        error: '未获取到用户 OpenID'
      }
    }

    // 获取数据库引用
    const db = cloud.database()
    const publishRecordsCollection = db.collection('publish_records')

    // 准备发布数据
    const publishData = {
      beanId: beanData.beanId || beanData.id,
      userId: wxContext.OPENID,
      userName: beanData.userName,
      userAvatar: beanData.userAvatar,
      beanName: beanData.beanName,
      brand: beanData.brand || '',
      type: beanData.type === 'pourOver' ? 'Pour Over' : 'Espresso',
      roastLevel: beanData.roastLevel || '',
      origin: beanData.origin || '',
      flavorNotes: beanData.flavorNotes || [],
      rating: beanData.rating || 0,
      createTime: beanData.createTime || new Date(),
      publishTime: new Date()
    }

    // 检查是否已经发布过（根据 beanId 和 userId）
    const existingRecord = await publishRecordsCollection
      .where({
        beanId: publishData.beanId,
        userId: publishData.userId
      })
      .get()

    if (existingRecord.data.length > 0) {
      // 如果已发布，更新记录
      await publishRecordsCollection
        .doc(existingRecord.data[0]._id)
        .update({
          data: {
            ...publishData,
            publishTime: new Date()
          }
        })
      
      console.log('已更新发布记录')
      return {
        success: true,
        message: '发布成功（已更新）',
        recordId: existingRecord.data[0]._id
      }
    } else {
      // 新增发布记录
      const result = await publishRecordsCollection.add({
        data: publishData
      })
      
      console.log('新增发布记录成功:', result._id)
      return {
        success: true,
        message: '发布成功',
        recordId: result._id
      }
    }
  } catch (err) {
    console.error('云函数 publishRecord 执行错误:', err)
    return {
      success: false,
      error: err.message || '发布失败'
    }
  }
}

