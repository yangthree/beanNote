const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 云函数：获取发现页列表数据
 * 从 publish_records 集合按发布时间倒序获取数据，支持分页
 */
exports.main = async (event, context) => {
  try {
    const { page = 1, pageSize = 10, filterType = 'all', ratingFilter = null } = event

    console.log('云函数 getDiscoverList 被调用')
    console.log('参数:', { page, pageSize, filterType, ratingFilter })

    // 获取数据库引用
    const db = cloud.database()
    const _ = db.command
    const publishRecordsCollection = db.collection('publish_records')

    // 构建查询条件
    let query = publishRecordsCollection
    const whereClause = {}

    // 根据 filterType 添加筛选条件
    if (filterType === 'pourOver') {
      whereClause.type = 'Pour Over'
    } else if (filterType === 'espresso') {
      whereClause.type = 'Espresso'
    }

    // 评分筛选
    if (ratingFilter && ratingFilter.min !== undefined && ratingFilter.max !== undefined) {
      whereClause.rating = _.and([
        _.gte(Number(ratingFilter.min)),
        _.lte(Number(ratingFilter.max))
      ])
    }

    if (Object.keys(whereClause).length > 0) {
      query = query.where(whereClause)
    }

    // 计算跳过的记录数
    const skip = (page - 1) * pageSize

    // 查询数据：按 publishTime 倒序排列，分页获取
    const result = await query
      .orderBy('publishTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    console.log(`查询到 ${result.data.length} 条记录`)

    return {
      success: true,
      data: result.data,
      total: result.data.length,
      page: page,
      pageSize: pageSize,
      hasMore: result.data.length === pageSize // 如果返回的数据量等于 pageSize，说明可能还有更多数据
    }
  } catch (err) {
    console.error('云函数 getDiscoverList 执行错误:', err)
    return {
      success: false,
      error: err.message || '获取列表失败',
      data: []
    }
  }
}

