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
    console.log('beanData:', JSON.stringify(beanData, null, 2))
    console.log('OPENID:', wxContext.OPENID)
    console.log('环境ID:', cloud.DYNAMIC_CURRENT_ENV)

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

    // 准备发布数据（包含所有字段）
    console.log('准备发布数据，beanData.type:', beanData.type)
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
      altitude: beanData.altitude || '',
      processMethod: beanData.processMethod || '',
      roastDate: beanData.roastDate || '',
      pricePer100g: beanData.pricePer100g ?? null,
      flavorNotes: beanData.flavorNotes || [],
      rating: beanData.rating || 0,
      remarks: beanData.remarks || beanData.notes || '',
      // 手冲参数
      brewParams: beanData.brewParams || {},
      // 意式参数
      extractParams: beanData.extractParams || {},
      // 风味评分
      flavorScores: beanData.flavorScores || {},
      // 设备信息
      equipment: beanData.equipment || {},
      createTime: beanData.createTime || new Date(),
      publishTime: new Date()
    }

    console.log('准备插入的发布数据:', JSON.stringify(publishData, null, 2))

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
      console.log('准备新增发布记录到数据库')
      const result = await publishRecordsCollection.add({
        data: publishData
      })
      
      console.log('新增发布记录成功，_id:', result._id)
      console.log('返回结果:', result)
      return {
        success: true,
        message: '发布成功',
        recordId: result._id
      }
    }
  } catch (err) {
    console.error('云函数 publishRecord 执行错误:', err)
    console.error('错误堆栈:', err.stack)
    console.error('错误详情:', JSON.stringify(err, null, 2))
    return {
      success: false,
      error: err.message || err.errMsg || '发布失败',
      errorDetail: err.toString()
    }
  }
}

