// pages/index/index.js
const dataModel = require('../../utils/dataModel.js')

Page({
  data: {
    coffeeBeans: [],
    searchKeyword: '',
    showEmpty: false,
    filters: {
      type: '',      // 类型筛选：pourOver / espresso / ''
      brand: '',     // 品牌筛选
      minRating: 0   // 最低评分
    }
  },

  onLoad() {
    this.loadCoffeeBeans()
  },

  onShow() {
    // 每次显示页面时重新加载数据
    this.loadCoffeeBeans()
  },

  // 加载咖啡豆列表
  loadCoffeeBeans() {
    const beans = dataModel.searchBeans(this.data.searchKeyword, this.data.filters)
    this.setData({
      coffeeBeans: beans,
      showEmpty: beans.length === 0
    })
  },

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword
    })
    this.loadCoffeeBeans()
  },

  // 跳转到详情页（新增）
  goToAdd() {
    wx.navigateTo({
      url: '/pages/detail/detail'
    })
  },

  // 跳转到详情页（编辑）
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 删除咖啡豆
  deleteBean(e) {
    const id = e.currentTarget.dataset.id
    const that = this

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条咖啡豆记录吗？',
      success(res) {
        if (res.confirm) {
          dataModel.deleteBean(id)
          that.loadCoffeeBeans()
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  }
})

