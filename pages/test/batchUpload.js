// pages/test/batchUpload.js
// 批量上传测试页面（临时使用，上传完成后可删除）

Page({
  data: {
    uploading: false,
    progress: 0,
    result: null
  },

  onLoad() {
    // 页面加载
  },

  /**
   * 批量上传 JSON 数据
   */
  async batchUpload() {
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中...',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认上传',
      content: '确定要批量上传 JSON 数据吗？这将上传所有记录到发现页。',
      success: async (res) => {
        if (res.confirm) {
          await this.startUpload()
        }
      }
    })
  },

  /**
   * 开始上传
   */
  async startUpload() {
    this.setData({ uploading: true, progress: 0 })

    try {
      // 读取 JSON 文件（需要先将文件内容复制到代码中）
      // 注意：小程序无法直接读取本地文件，需要手动复制数据
      const beansData = require('../../prd/beans_full.json')

      console.log(`准备上传 ${beansData.length} 条记录`)

      wx.showLoading({
        title: '上传中...',
        mask: true
      })

      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'batchPublishRecords',
        data: {
          records: beansData,
          batchSize: 50 // 每批50条
        }
      })

      wx.hideLoading()

      console.log('批量上传结果:', result.result)

      this.setData({
        uploading: false,
        result: result.result
      })

      wx.showModal({
        title: '上传完成',
        content: `总计: ${result.result.total} 条\n成功: ${result.result.successCount} 条\n失败: ${result.result.failCount} 条`,
        showCancel: false,
        success: () => {
          if (result.result.errors && result.result.errors.length > 0) {
            console.log('错误详情:', result.result.errors)
          }
        }
      })
    } catch (error) {
      wx.hideLoading()
      this.setData({ uploading: false })
      console.error('批量上传失败:', error)
      wx.showModal({
        title: '上传失败',
        content: error.message || '请检查网络连接和云函数配置',
        showCancel: false
      })
    }
  }
})

