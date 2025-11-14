// pages/batchUpload/batchUpload.js
// 批量上传页面

// 注意：由于小程序无法直接 require JSON 文件
// 需要将 JSON 数据复制到 utils/beansData.js 中
// 或者通过其他方式加载数据
let beansData = []
try {
  beansData = require('../../utils/beansData.js')
} catch (e) {
  console.warn('无法加载 beansData，请检查数据文件')
}

Page({
  data: {
    allRecords: [], // 所有待上传的记录
    currentIndex: 0, // 当前上传到的索引
    uploading: false, // 是否正在上传
    total: 0, // 总记录数
    successCount: 0, // 成功数量
    failCount: 0, // 失败数量
    currentBatch: 0, // 当前批次
    log: [], // 上传日志
    showImportDialog: false, // 显示导入对话框
    importText: '', // 导入的文本内容
    uploadButtonText: '开始上传' // 上传按钮文本
  },

  onLoad() {
    // 初始化数据
    this.initData()
  },

  /**
   * 初始化数据
   */
  initData() {
    // 尝试从本地存储读取数据
    let records = []
    try {
      const stored = wx.getStorageSync('batchUploadData')
      if (stored && Array.isArray(stored) && stored.length > 0) {
        records = stored
        this.addLog(`从本地存储加载 ${records.length} 条记录`)
      } else if (beansData && beansData.length > 0) {
        records = beansData
        this.addLog(`从代码文件加载 ${records.length} 条记录`)
      } else {
        this.addLog('未找到数据，请先导入 JSON 数据')
        wx.showModal({
          title: '提示',
          content: '未找到数据。请使用"导入数据"功能导入 JSON 数据。',
          showCancel: false
        })
        return
      }
    } catch (e) {
      console.error('加载数据失败:', e)
      records = beansData || []
    }

    this.setData({
      allRecords: records,
      total: records.length,
      currentIndex: 0,
      successCount: 0,
      failCount: 0,
      currentBatch: 0,
      log: []
    })
    this.updateUploadButtonText()
    this.addLog(`已加载 ${records.length} 条记录`)
  },

  /**
   * 添加日志
   */
  addLog(message) {
    const log = [...this.data.log, {
      time: new Date().toLocaleTimeString(),
      message: message
    }]
    this.setData({ log })
    console.log(`[批量上传] ${message}`)
  },

  /**
   * 更新上传按钮文本
   */
  updateUploadButtonText() {
    const { uploading, allRecords } = this.data
    let text = '开始上传'
    if (uploading) {
      text = '上传中...'
    } else if (allRecords.length > 0) {
      const batchSize = Math.min(5, allRecords.length)
      text = `上传下一批 (${batchSize}条)`
    } else {
      text = '全部完成'
    }
    this.setData({ uploadButtonText: text })
  },

  /**
   * 开始批量上传
   */
  async startUpload() {
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中...',
        icon: 'none'
      })
      return
    }

    if (this.data.currentIndex >= this.data.allRecords.length) {
      wx.showModal({
        title: '提示',
        content: '所有数据已上传完成',
        showCancel: false
      })
      return
    }

    const batchNum = this.data.currentBatch + 1
    const batchSize = Math.min(5, this.data.allRecords.length)
    wx.showModal({
      title: '确认上传',
      content: `准备上传第 ${batchNum} 批数据（${batchSize}条），是否继续？`,
      success: async (res) => {
        if (res.confirm) {
          await this.uploadBatch()
        }
      }
    })
  },

  /**
   * 上传一批数据（5条）
   */
  async uploadBatch() {
    this.setData({ uploading: true })
    this.updateUploadButtonText()

    const { allRecords, currentIndex, total } = this.data
    const batchSize = 5
    
    // 检查是否还有数据需要上传
    if (currentIndex >= allRecords.length) {
      this.setData({ uploading: false })
      this.updateUploadButtonText()
      wx.showModal({
        title: '完成',
        content: '所有数据已上传完成！',
        showCancel: false
      })
      return
    }

    // 获取当前批次的数据
    const batch = allRecords.slice(currentIndex, currentIndex + batchSize)

    if (batch.length === 0) {
      this.setData({ uploading: false })
      this.updateUploadButtonText()
      wx.showModal({
        title: '完成',
        content: '所有数据已上传完成！',
        showCancel: false
      })
      return
    }

    this.addLog(`开始上传第 ${this.data.currentBatch + 1} 批，共 ${batch.length} 条记录（索引 ${currentIndex + 1}-${currentIndex + batch.length}）`)

    wx.showLoading({
      title: `上传中 ${currentIndex + batch.length}/${total}`,
      mask: true
    })

    try {
      // 调用云函数
      console.log(`[批量上传] 调用云函数，批次大小: ${batch.length}`)
      // 调试：打印第一条记录的字段，确认 remarks 是否存在
      if (batch.length > 0) {
        console.log('[批量上传] 第一条记录示例:', {
          beanId: batch[0].beanId,
          beanName: batch[0].beanName,
          remarks: batch[0].remarks,
          notes: batch[0].notes,
          hasRemarks: !!batch[0].remarks,
          hasNotes: !!batch[0].notes
        })
      }
      const result = await wx.cloud.callFunction({
        name: 'batchPublishRecords',
        data: {
          records: batch,
          batchSize: batchSize,
          startIndex: 0
        }
      })

      console.log('[批量上传] 云函数返回结果:', result)

      wx.hideLoading()

      if (result && result.result && result.result.success) {
        const { successCount, failCount } = result.result
        
        // 更新统计和索引（不删除数据，只更新索引）
        const newIndex = currentIndex + batch.length
        this.setData({
          successCount: this.data.successCount + successCount,
          failCount: this.data.failCount + failCount,
          currentIndex: newIndex,
          currentBatch: this.data.currentBatch + 1
        })
        this.updateUploadButtonText()

        this.addLog(`✓ 第 ${this.data.currentBatch} 批上传完成: 成功 ${successCount} 条，失败 ${failCount} 条`)

        // 检查是否还有数据需要上传
        const remaining = allRecords.length - newIndex
        if (remaining > 0) {
          wx.showModal({
            title: '上传成功',
            content: `本批上传完成！\n成功: ${successCount} 条\n失败: ${failCount} 条\n\n还有 ${remaining} 条待上传，是否继续？`,
            success: (res) => {
              if (res.confirm) {
                // 继续上传下一批
                setTimeout(() => {
                  this.uploadBatch()
                }, 500)
              } else {
                this.setData({ uploading: false })
                this.updateUploadButtonText()
              }
            }
          })
        } else {
          // 全部完成
          this.setData({ uploading: false })
          this.updateUploadButtonText()
          wx.showModal({
            title: '全部完成！',
            content: `所有数据上传完成！\n总计: ${total} 条\n成功: ${this.data.successCount} 条\n失败: ${this.data.failCount} 条`,
            showCancel: false
          })
        }
      } else {
        this.setData({ uploading: false })
        this.updateUploadButtonText()
        const errorMsg = result?.result?.error || '未知错误'
        this.addLog(`✗ 上传失败: ${errorMsg}`)
        console.error('[批量上传] 上传失败:', result)
        wx.showModal({
          title: '上传失败',
          content: errorMsg,
          showCancel: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      this.setData({ uploading: false })
      this.updateUploadButtonText()
      const errorMsg = error.message || error.errMsg || '网络错误'
      this.addLog(`✗ 上传异常: ${errorMsg}`)
      console.error('[批量上传] 上传异常:', error)
      wx.showModal({
        title: '上传失败',
        content: errorMsg + '\n\n请检查：\n1. 云函数是否已部署\n2. 网络连接是否正常\n3. 查看控制台日志',
        showCancel: false
      })
    }
  },

  /**
   * 重置数据
   */
  resetData() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置所有数据吗？这将重新加载 JSON 文件。',
      success: (res) => {
        if (res.confirm) {
          this.initData()
          wx.showToast({
            title: '已重置',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 清空日志
   */
  clearLog() {
    this.setData({ log: [] })
    wx.showToast({
      title: '日志已清空',
      icon: 'success'
    })
  },

  /**
   * 显示导入对话框
   */
  showImportDialog() {
    this.setData({ 
      showImportDialog: true,
      importText: ''
    })
  },

  /**
   * 关闭导入对话框
   */
  closeImportDialog() {
    this.setData({ showImportDialog: false })
  },

  /**
   * 阻止事件冒泡（防止点击对话框内部时关闭）
   */
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },

  /**
   * 导入文本输入
   */
  onImportTextInput(e) {
    this.setData({ importText: e.detail.value })
  },

  /**
   * 清理 JSON 字符串中的无效值
   * 将 "nan"、NaN、NaT 等替换为 null，处理其他常见问题
   */
  cleanJsonString(jsonStr) {
    let cleaned = jsonStr
      // 替换字符串值中的 "nan" 为 null
      .replace(/:\s*"nan"/gi, ': null')
      .replace(/:\s*'nan'/gi, ': null')
      // 替换数组中的 "nan" 为 null
      .replace(/,\s*"nan"\s*,/gi, ', null,')
      .replace(/\[\s*"nan"\s*\]/gi, '[null]')
      .replace(/\[\s*"nan"\s*,/gi, '[null,')
      .replace(/,\s*"nan"\s*\]/gi, ', null]')
      // 替换 NaN（数值类型）为 null
      .replace(/:\s*NaN\b/g, ': null')
      // 替换 NaT（时间类型）为 null
      .replace(/:\s*"NaT"/g, ': null')
      .replace(/:\s*'NaT'/g, ': null')
    
    return cleaned
  },

  /**
   * 确认导入 JSON 数据
   */
  confirmImport() {
    const { importText } = this.data
    if (!importText || !importText.trim()) {
      wx.showToast({
        title: '请输入 JSON 数据',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在处理数据...',
      mask: true
    })

    try {
      // 先清理 JSON 字符串
      const cleanedJson = this.cleanJsonString(importText.trim())
      
      // 解析 JSON
      const data = JSON.parse(cleanedJson)
      
      if (Array.isArray(data) && data.length > 0) {
        // 进一步清理数据中的 nan 值，并补充 id 字段
        const cleanedData = data.map((record, index) => {
          const cleaned = { ...record }
          
          // 补充 id 字段：优先使用 beanId，如果没有则生成
          if (!cleaned.id) {
            if (cleaned.beanId) {
              // 使用 beanId 作为 id
              cleaned.id = cleaned.beanId
            } else {
              // 生成新的 id（使用时间戳 + 索引 + 随机字符串）
              cleaned.id = `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`
            }
          }
          
          // 确保 beanId 存在（用于云函数）
          if (!cleaned.beanId && cleaned.id) {
            cleaned.beanId = cleaned.id
          }
          
          // 清理 flavorNotes 数组中的 "nan"
          if (Array.isArray(cleaned.flavorNotes)) {
            cleaned.flavorNotes = cleaned.flavorNotes.filter(
              note => note !== 'nan' && note !== null && note !== undefined && note !== ''
            )
          }
          
          // 清理其他字段中的 "nan"
          Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === 'nan' || cleaned[key] === 'NaN') {
              cleaned[key] = null
            }
          })
          
          return cleaned
        })

        // 保存到本地存储
        wx.setStorageSync('batchUploadData', cleanedData)
        wx.hideLoading()
        this.setData({ showImportDialog: false })
        this.initData()
        wx.showToast({
          title: `已导入 ${cleanedData.length} 条记录`,
          icon: 'success'
        })
        this.addLog(`成功导入 ${cleanedData.length} 条记录`)
      } else {
        wx.hideLoading()
        wx.showToast({
          title: '数据格式错误：必须是数组',
          icon: 'none'
        })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({
        title: 'JSON 格式错误',
        icon: 'none',
        duration: 2000
      })
      console.error('JSON 解析失败:', e)
      this.addLog(`JSON 解析失败: ${e.message}`)
      
      // 显示更详细的错误信息
      const errorMsg = e.message || String(e)
      if (errorMsg.includes('position')) {
        const match = errorMsg.match(/position (\d+)/)
        if (match) {
          const pos = parseInt(match[1])
          const preview = importText.substring(Math.max(0, pos - 50), Math.min(importText.length, pos + 50))
          console.error('错误位置附近的文本:', preview)
          this.addLog(`错误位置: ${pos}，附近文本: ${preview.substring(0, 100)}...`)
        }
      }
    }
  }
})

