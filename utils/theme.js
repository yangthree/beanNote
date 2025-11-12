// utils/theme.js
// 主题色封装工具

/**
 * 主题色配置
 */
const ThemeColors = {
  // 主色调
  primary: '#8B4513',           // 主色（棕色）
  primaryDark: '#6B3410',       // 主色深色（按下状态）
  primaryLight: '#A0522D',      // 主色浅色
  
  // 背景色
  background: '#F5F5DC',        // 页面背景（米色）
  backgroundLight: '#FFFFFF',   // 卡片背景（白色）
  backgroundGray: '#F5F5F5',    // 灰色背景
  
  // 文本色
  textPrimary: '#333333',       // 主要文本
  textSecondary: '#666666',     // 次要文本
  textTertiary: '#999999',      // 三级文本
  textDisabled: '#CCCCCC',      // 禁用文本
  textWhite: '#FFFFFF',         // 白色文本
  
  // 边框色
  border: '#E0E0E0',            // 默认边框
  borderLight: '#F0F0F0',       // 浅色边框
  borderDark: '#CCCCCC',        // 深色边框
  borderFocus: '#8B4513',       // 聚焦边框（主色）
  
  // 功能色
  success: '#4CAF50',           // 成功
  warning: '#FF9800',           // 警告
  error: '#FF6B6B',             // 错误/删除
  errorDark: '#FF5252',         // 错误深色（按下状态）
  info: '#2196F3',              // 信息
  
  // 特殊色
  star: '#FFD700',              // 星标（金色）
  starInactive: '#D3D3D3',      // 星标未激活（灰色）
  tag: '#F0E68C',               // 标签背景（卡其色）
  tagText: '#8B4513',           // 标签文字（主色）
  
  // 类型标签色
  typePourOver: {
    bg: '#E8F5E9',              // 手冲背景
    text: '#2E7D32'             // 手冲文字
  },
  typeEspresso: {
    bg: '#FFF3E0',              // 意式背景
    text: '#E65100'             // 意式文字
  },
  
  // 阴影
  shadow: 'rgba(0, 0, 0, 0.1)',      // 默认阴影
  shadowPrimary: 'rgba(139, 69, 19, 0.3)',  // 主色阴影
}

/**
 * 获取主题色
 * @param {string} key - 颜色键名
 * @param {string} variant - 变体（如 'bg', 'text'）
 * @returns {string} 颜色值
 */
function getColor(key, variant = null) {
  if (!ThemeColors[key]) {
    console.warn(`主题色 ${key} 不存在`)
    return '#000000'
  }
  
  // 如果是对象类型（如 typePourOver），根据 variant 返回对应属性
  if (typeof ThemeColors[key] === 'object' && variant) {
    return ThemeColors[key][variant] || ThemeColors[key]
  }
  
  return ThemeColors[key]
}

/**
 * 获取 rgba 颜色
 * @param {string} color - 十六进制颜色值
 * @param {number} opacity - 透明度 (0-1)
 * @returns {string} rgba 颜色值
 */
function getRgbaColor(color, opacity = 1) {
  // 移除 # 号
  color = color.replace('#', '')
  
  // 转换为 RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * 获取主题色 rgba
 * @param {string} key - 颜色键名
 * @param {number} opacity - 透明度 (0-1)
 * @returns {string} rgba 颜色值
 */
function getThemeRgba(key, opacity = 1) {
  const color = getColor(key)
  return getRgbaColor(color, opacity)
}

/**
 * 获取渐变色
 * @param {string} startKey - 起始颜色键名
 * @param {string} endKey - 结束颜色键名
 * @param {string} direction - 方向 ('to right', 'to bottom', 'to bottom right' 等)
 * @returns {string} 渐变 CSS 值
 */
function getGradient(startKey, endKey, direction = 'to right') {
  const startColor = getColor(startKey)
  const endColor = getColor(endKey)
  return `linear-gradient(${direction}, ${startColor}, ${endColor})`
}

/**
 * 颜色工具类 - 用于在 JS 中动态设置样式
 */
const ColorUtils = {
  /**
   * 获取按钮样式
   * @param {string} type - 按钮类型 ('primary', 'error', 'default')
   * @returns {object} 样式对象
   */
  getButtonStyle(type = 'primary') {
    const styles = {
      primary: {
        backgroundColor: getColor('primary'),
        color: getColor('textWhite'),
      },
      error: {
        backgroundColor: getColor('error'),
        color: getColor('textWhite'),
      },
      default: {
        backgroundColor: getColor('backgroundLight'),
        color: getColor('textPrimary'),
        borderColor: getColor('border'),
      }
    }
    return styles[type] || styles.primary
  },
  
  /**
   * 获取卡片样式
   * @param {boolean} withShadow - 是否带阴影
   * @returns {object} 样式对象
   */
  getCardStyle(withShadow = true) {
    return {
      backgroundColor: getColor('backgroundLight'),
      borderRadius: '16rpx',
      padding: '30rpx',
      ...(withShadow && {
        boxShadow: `0 2rpx 8rpx ${getColor('shadow')}`
      })
    }
  },
  
  /**
   * 获取输入框样式
   * @param {boolean} focused - 是否聚焦
   * @returns {object} 样式对象
   */
  getInputStyle(focused = false) {
    return {
      borderColor: focused ? getColor('borderFocus') : getColor('border'),
      backgroundColor: getColor('backgroundLight'),
    }
  },
  
  /**
   * 获取标签样式
   * @param {string} type - 标签类型 ('default', 'pourOver', 'espresso')
   * @returns {object} 样式对象
   */
  getTagStyle(type = 'default') {
    const styles = {
      default: {
        backgroundColor: getColor('tag'),
        color: getColor('tagText'),
      },
      pourOver: {
        backgroundColor: getColor('typePourOver', 'bg'),
        color: getColor('typePourOver', 'text'),
      },
      espresso: {
        backgroundColor: getColor('typeEspresso', 'bg'),
        color: getColor('typeEspresso', 'text'),
      }
    }
    return styles[type] || styles.default
  }
}

/**
 * 主题配置 - 用于 app.json 等配置文件
 */
const ThemeConfig = {
  navigationBar: {
    backgroundColor: getColor('primary'),
    textStyle: 'white',
  },
  tabBar: {
    color: getColor('textSecondary'),
    selectedColor: getColor('primary'),
    backgroundColor: getColor('backgroundLight'),
  },
  page: {
    backgroundColor: getColor('background'),
  }
}

// 导出模块
module.exports = {
  ThemeColors: ThemeColors,
  getColor: getColor,
  getRgbaColor: getRgbaColor,
  getThemeRgba: getThemeRgba,
  getGradient: getGradient,
  ColorUtils: ColorUtils,
  ThemeConfig: ThemeConfig
}

