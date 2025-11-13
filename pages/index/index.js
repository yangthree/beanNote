// pages/index/index.js
// 首页（我的豆单）逻辑
// 负责：加载本地豆单数据、搜索过滤、跳转详情页、长按删除等交互
const dataModel = require('../../utils/dataModel.js')

Page({
  data: {
    coffeeBeans: [],        // 首页展示的咖啡豆卡片列表（已经映射为视图模型）
    searchKeyword: '',      // 搜索关键字（双向绑定搜索框）
    showEmpty: false,       // 是否展示空状态
    filterType: 'all',      // 筛选类型：'all' / 'pourOver' / 'espresso'
    filters: {              // 预留的筛选条件，当前版本仅使用 keyword
      type: '',             // pourOver / espresso / '' — 类型筛选
      brand: '',
      minRating: 0
    }
  },

  onLoad() {
    // 从本地存储读取上次的筛选状态
    const savedFilterType = wx.getStorageSync('filterType')
    if (savedFilterType && ['all', 'pourOver', 'espresso'].includes(savedFilterType)) {
      this.setData({ filterType: savedFilterType }, () => {
        this.updateFilters()
        this.loadCoffeeBeans()
      })
    } else {
      // 初次加载页时拉取数据
      this.loadCoffeeBeans()
    }
  },

  onShow() {
    // 从详情页返回时刷新列表，保持数据同步
    // 确保筛选条件已更新
    this.updateFilters()
    this.loadCoffeeBeans()
  },

  /**
   * 更新筛选条件
   * 根据 filterType 更新 filters.type
   */
  updateFilters() {
    const { filterType } = this.data
    const typeFilter = filterType === 'all' ? '' : filterType
    this.setData({
      filters: {
        ...this.data.filters,
        type: typeFilter
      }
    })
  },

  /**
   * 拉取并映射首页列表数据
   * 说明：
   * - dataModel.getHomeList 会返回已经格式化好的视图模型
   * - 处理完数据后根据列表长度决定是否展示空态
   */
  loadCoffeeBeans() {
    const { searchKeyword, filters } = this.data
    const beans = dataModel.getHomeList(searchKeyword, filters)

    this.setData({
      coffeeBeans: beans,
      showEmpty: beans.length === 0
    })
  },

  /**
   * 筛选类型切换事件
   * @param {Object} e - 事件对象，包含 data-type
   */
  onFilterTypeChange(e) {
    const { type } = e.currentTarget.dataset
    if (!type || type === this.data.filterType) return

    // 更新筛选类型
    this.setData({ filterType: type }, () => {
      // 更新筛选条件
      this.updateFilters()
      // 保存到本地存储
      wx.setStorageSync('filterType', type)
      // 重新加载数据
      this.loadCoffeeBeans()
    })
  },

  /**
   * 搜索框输入事件
   * - 更新关键字后重新加载数据
   * - 使用 setData 的回调保证 loadCoffeeBeans 在数据更新后执行
   */
  onSearchInput(e) {
    const keyword = e.detail.value || ''
    this.setData({ searchKeyword: keyword.trim() }, () => {
      this.loadCoffeeBeans()
    })
  },

  /**
   * 卡片点击：进入详情/编辑页面
   * @param {Object} e - 事件对象，包含 data-id
   */
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  /**
   * 长按卡片：展示操作菜单
   * - 当前仅提供删除操作，可扩展更多选项
   */
  showDeleteMenu(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.showActionSheet({
      itemList: ['删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deleteBean(id)
        }
      }
    })
  },

  /**
   * 删除记录并刷新列表
   * - 删除成功后提示用户，并重新拉取列表
   */
  deleteBean(id) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条咖啡豆记录吗？',
      success: (res) => {
        if (res.confirm) {
          dataModel.deleteBean(id)
          this.loadCoffeeBeans()
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 悬浮按钮：进入新增页面
   * - 默认进入手冲豆的新增流程
   */
  goToAdd() {
    wx.navigateTo({
      url: '/pages/detail/detail?mode=create&type=pourOver'
    })
  }
})
