// utils/beansData.js
// 批量上传的 JSON 数据
// 注意：如果文件太大，可能需要分批导入

// 由于 JSON 文件很大，这里先导出空数组
// 实际使用时，需要将 JSON 数据复制到这里
// 或者使用其他方式加载数据

// 方法1：直接在这里粘贴 JSON 数据（如果数据量不是特别大）
// const beansData = [/* 粘贴 JSON 数组内容 */]

// 方法2：使用网络请求加载（推荐）
// 将 JSON 文件上传到云存储，然后通过 URL 加载

// 临时方案：返回空数组，让用户通过其他方式加载
const beansData = []

module.exports = beansData

