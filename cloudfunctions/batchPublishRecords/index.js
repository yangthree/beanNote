const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 云函数：批量发布咖啡豆记录到发现页
 * 用于批量导入 JSON 数据
 */
exports.main = async (event, context) => {
  try {
    const { records, batchSize = 20, startIndex = 0 } = event

    if (!records || !Array.isArray(records) || records.length === 0) {
      return {
        success: false,
        error: '缺少记录数据或数据格式不正确'
      }
    }

    // 限制单次处理数量，避免超时
    const maxRecords = Math.min(records.length - startIndex, batchSize)
    const recordsToProcess = records.slice(startIndex, startIndex + maxRecords)

    console.log(`开始批量上传: 总记录 ${records.length} 条，本次处理 ${recordsToProcess.length} 条（从第 ${startIndex + 1} 条开始）`)

    const db = cloud.database()
    const publishRecordsCollection = db.collection('publish_records')

    let successCount = 0
    let failCount = 0
    const errors = []

    // 准备数据
    const batchData = recordsToProcess.map((record, index) => {
      try {
        // 处理评分：将字符串评分转换为数字
        let rating = 0
        if (typeof record.rating === 'number') {
          rating = record.rating
        } else if (typeof record.rating === 'string') {
          // 处理 "4-", "4+", "4.5" 等格式
          const ratingStr = record.rating.replace(/[^0-9.]/g, '')
          rating = parseFloat(ratingStr) || 0
        }

        // 处理时间
        let createTime = new Date()
        if (record.createTime) {
          createTime = new Date(record.createTime)
          if (isNaN(createTime.getTime())) {
            createTime = new Date()
          }
        }

        let publishTime = new Date()
        if (record.publishTime) {
          // 处理 MongoDB 日期格式 { $date: "..." }
          if (record.publishTime.$date) {
            publishTime = new Date(record.publishTime.$date)
          } else if (typeof record.publishTime === 'string') {
            publishTime = new Date(record.publishTime)
          } else if (record.publishTime instanceof Date) {
            publishTime = record.publishTime
          }
          if (isNaN(publishTime.getTime())) {
            publishTime = new Date()
          }
        }

        // 处理类型：如果为空，默认为手冲
        let type = record.type || 'Pour Over'
        if (type === 'pourOver') {
          type = 'Pour Over'
        } else if (type === 'espresso') {
          type = 'Espresso'
        }

        // 处理备注字段
        const remarks = record.remarks || record.notes || ''
        
        // 调试：打印第一条记录的 remarks 信息
        if (index === 0) {
          console.log(`[批量上传] 第一条记录备注信息:`, {
            hasRemarks: !!record.remarks,
            hasNotes: !!record.notes,
            remarksValue: record.remarks,
            notesValue: record.notes,
            finalRemarks: remarks
          })
        }

        return {
          beanId: record.beanId || `batch_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          userId: record.userId || 'batch_import', // 批量导入使用固定 userId
          userName: record.userName || '批量导入',
          userAvatar: record.userAvatar || '',
          beanName: record.beanName || '',
          brand: record.brand || '',
          type: type,
          roastLevel: record.roastLevel || '',
          origin: record.origin || '',
          altitude: record.altitude || '',
          processMethod: record.processMethod || '',
          roastDate: record.roastDate || '',
          flavorNotes: Array.isArray(record.flavorNotes) ? record.flavorNotes : [],
          rating: rating,
          remarks: remarks,
          // 手冲参数
          brewParams: record.brewParams || {},
          // 意式参数
          extractParams: record.extractParams || {},
          // 风味评分
          flavorScores: record.flavorScores || {},
          // 设备信息
          equipment: record.equipment || {},
          createTime: createTime,
          publishTime: publishTime
        }
      } catch (err) {
        console.error(`数据转换失败 (索引 ${startIndex + index}):`, err.message)
        return null
      }
    }).filter(item => item !== null) // 过滤掉转换失败的数据

    console.log(`数据准备完成，有效记录 ${batchData.length} 条`)

    // 逐条插入（云数据库不支持真正的批量插入）
    for (let i = 0; i < batchData.length; i++) {
      const data = batchData[i]
      try {
        // 检查是否已存在（根据 beanId 和 userId）
        const existing = await publishRecordsCollection
          .where({
            beanId: data.beanId,
            userId: data.userId
          })
          .get()

        if (existing.data.length > 0) {
          // 已存在，跳过
          console.log(`[${i + 1}/${batchData.length}] 记录已存在，跳过: ${data.beanName}`)
          successCount++
          continue
        }

        // 插入新记录
        await publishRecordsCollection.add({
          data: data
        })
        successCount++
        
        // 每10条记录输出一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`进度: ${i + 1}/${batchData.length} (${Math.round((i + 1) / batchData.length * 100)}%)`)
        }
      } catch (err) {
        failCount++
        const errorInfo = {
          beanId: data.beanId,
          beanName: data.beanName,
          error: err.message || String(err)
        }
        errors.push(errorInfo)
        console.error(`[${i + 1}/${batchData.length}] ✗ 插入失败: ${data.beanName}`, err.message || err)
      }
    }

    const nextIndex = startIndex + recordsToProcess.length
    const hasMore = nextIndex < records.length

    console.log(`本次处理完成: 成功 ${successCount} 条，失败 ${failCount} 条`)
    if (hasMore) {
      console.log(`还有 ${records.length - nextIndex} 条记录待处理，下次从索引 ${nextIndex} 开始`)
    }

    return {
      success: true,
      total: records.length,
      processed: nextIndex,
      remaining: records.length - nextIndex,
      successCount: successCount,
      failCount: failCount,
      hasMore: hasMore,
      nextIndex: hasMore ? nextIndex : null,
      errors: errors.slice(0, 10) // 只返回前10个错误，避免数据过大
    }
  } catch (err) {
    console.error('批量上传云函数执行错误:', err)
    return {
      success: false,
      error: err.message || '批量上传失败'
    }
  }
}

