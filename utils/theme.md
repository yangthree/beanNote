# 主题色封装工具使用说明

## 文件说明

- `theme.js` - 主题色 JavaScript 工具类，用于在 JS 文件中使用
- `theme.wxss` - 主题色样式文件，用于在 WXSS 文件中使用
- `theme.md` - 本文档

## 一、在 JavaScript 中使用

### 1. 引入模块

```javascript
const theme = require('../../utils/theme.js')
```

### 2. 获取颜色

```javascript
// 获取主色
const primaryColor = theme.getColor('primary')  // '#8B4513'

// 获取类型标签色
const pourOverBg = theme.getColor('typePourOver', 'bg')  // '#E8F5E9'
const pourOverText = theme.getColor('typePourOver', 'text')  // '#2E7D32'
```

### 3. 获取 RGBA 颜色

```javascript
// 获取带透明度的颜色
const primaryRgba = theme.getThemeRgba('primary', 0.5)  // 'rgba(139, 69, 19, 0.5)'

// 直接转换十六进制颜色
const customRgba = theme.getRgbaColor('#8B4513', 0.3)  // 'rgba(139, 69, 19, 0.3)'
```

### 4. 获取渐变色

```javascript
// 获取渐变 CSS 值
const gradient = theme.getGradient('primary', 'primaryLight', 'to right')
// 'linear-gradient(to right, #8B4513, #A0522D)'
```

### 5. 使用颜色工具类

```javascript
// 获取按钮样式
const buttonStyle = theme.ColorUtils.getButtonStyle('primary')
// { backgroundColor: '#8B4513', color: '#FFFFFF' }

// 获取卡片样式
const cardStyle = theme.ColorUtils.getCardStyle(true)  // 带阴影
// { backgroundColor: '#FFFFFF', borderRadius: '16rpx', ... }

// 获取输入框样式
const inputStyle = theme.ColorUtils.getInputStyle(true)  // 聚焦状态
// { borderColor: '#8B4513', backgroundColor: '#FFFFFF' }

// 获取标签样式
const tagStyle = theme.ColorUtils.getTagStyle('pourOver')
// { backgroundColor: '#E8F5E9', color: '#2E7D32' }
```

### 6. 使用主题配置

```javascript
// 获取导航栏配置（可用于动态设置）
const navConfig = theme.ThemeConfig.navigationBar
// { backgroundColor: '#8B4513', textStyle: 'white' }
```

### 完整示例

```javascript
// pages/index/index.js
const theme = require('../../utils/theme.js')

Page({
  data: {
    buttonStyle: theme.ColorUtils.getButtonStyle('primary'),
    cardStyle: theme.ColorUtils.getCardStyle(true),
  },
  
  onLoad() {
    // 动态设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: theme.getColor('primary'),
    })
  },
  
  handleButtonClick() {
    // 使用主题色
    const primaryColor = theme.getColor('primary')
    console.log('主色:', primaryColor)
  }
})
```

## 二、在 WXSS 中使用

### 1. 引入样式文件

在需要使用主题色的页面或组件的 `.wxss` 文件中引入：

```css
@import '../../utils/theme.wxss';
```

或者在 `app.wxss` 中全局引入：

```css
@import './utils/theme.wxss';
```

### 2. 使用颜色类

```html
<!-- 文本颜色 -->
<view class="theme-text-primary">主要文本</view>
<view class="theme-text-secondary">次要文本</view>
<view class="theme-primary">主色文本</view>

<!-- 背景颜色 -->
<view class="theme-primary-bg theme-text-white">主色背景</view>
<view class="theme-bg-light">浅色背景</view>

<!-- 边框颜色 -->
<view class="theme-border" style="border: 2rpx solid;">带边框</view>
```

### 3. 使用组件样式类

```html
<!-- 按钮 -->
<button class="theme-btn-primary">主要按钮</button>
<button class="theme-btn-error">错误按钮</button>
<button class="theme-btn-default">默认按钮</button>

<!-- 卡片 -->
<view class="theme-card">卡片内容</view>
<view class="theme-card-no-shadow">无阴影卡片</view>

<!-- 输入框 -->
<input class="theme-input" placeholder="请输入内容" />

<!-- 标签 -->
<view class="theme-tag">默认标签</view>
<view class="theme-tag-pour-over">手冲</view>
<view class="theme-tag-espresso">意式</view>
```

### 4. 使用工具类

```html
<!-- 圆角 -->
<view class="theme-radius">8rpx 圆角</view>
<view class="theme-radius-lg">16rpx 圆角</view>
<view class="theme-radius-full">圆形</view>

<!-- 间距 -->
<view class="theme-p-md">内边距 30rpx</view>
<view class="theme-m">外边距 20rpx</view>

<!-- 文本 -->
<view class="theme-text-lg theme-text-bold">大号粗体文本</view>
<view class="theme-text-center">居中文本</view>

<!-- 阴影 -->
<view class="theme-shadow">默认阴影</view>
<view class="theme-shadow-primary">主色阴影</view>
```

### 完整示例

```html
<!-- pages/index/index.wxml -->
<view class="container">
  <view class="theme-card">
    <view class="theme-text-lg theme-text-primary theme-text-bold">
      咖啡豆名称
    </view>
    <view class="theme-tag-pour-over">手冲</view>
    <button class="theme-btn-primary theme-m">查看详情</button>
  </view>
</view>
```

```css
/* pages/index/index.wxss */
@import '../../utils/theme.wxss';

.container {
  padding: 20rpx;
  background-color: var(--theme-bg, #F5F5DC); /* 如果有 CSS 变量支持 */
}
```

## 三、可用的颜色键名

### 主色调
- `primary` - 主色 (#8B4513)
- `primaryDark` - 主色深色 (#6B3410)
- `primaryLight` - 主色浅色 (#A0522D)

### 背景色
- `background` - 页面背景 (#F5F5DC)
- `backgroundLight` - 卡片背景 (#FFFFFF)
- `backgroundGray` - 灰色背景 (#F5F5F5)

### 文本色
- `textPrimary` - 主要文本 (#333333)
- `textSecondary` - 次要文本 (#666666)
- `textTertiary` - 三级文本 (#999999)
- `textDisabled` - 禁用文本 (#CCCCCC)
- `textWhite` - 白色文本 (#FFFFFF)

### 边框色
- `border` - 默认边框 (#E0E0E0)
- `borderLight` - 浅色边框 (#F0F0F0)
- `borderDark` - 深色边框 (#CCCCCC)
- `borderFocus` - 聚焦边框 (#8B4513)

### 功能色
- `success` - 成功 (#4CAF50)
- `warning` - 警告 (#FF9800)
- `error` - 错误 (#FF6B6B)
- `errorDark` - 错误深色 (#FF5252)
- `info` - 信息 (#2196F3)

### 特殊色
- `star` - 星标 (#FFD700)
- `starInactive` - 星标未激活 (#D3D3D3)
- `tag` - 标签背景 (#F0E68C)
- `tagText` - 标签文字 (#8B4513)

### 类型标签色（对象类型）
- `typePourOver.bg` - 手冲背景 (#E8F5E9)
- `typePourOver.text` - 手冲文字 (#2E7D32)
- `typeEspresso.bg` - 意式背景 (#FFF3E0)
- `typeEspresso.text` - 意式文字 (#E65100)

## 四、最佳实践

1. **统一使用主题色工具**：避免在代码中直接写死颜色值，统一使用主题色工具
2. **优先使用样式类**：在 WXSS 中优先使用预定义的样式类，减少重复代码
3. **动态样式使用 JS 工具**：需要在 JS 中动态设置样式时，使用 `ColorUtils` 工具类
4. **保持一致性**：修改主题色时，只需在 `theme.js` 中修改 `ThemeColors` 对象即可

## 五、扩展主题色

如果需要添加新的颜色，只需在 `theme.js` 的 `ThemeColors` 对象中添加：

```javascript
const ThemeColors = {
  // ... 现有颜色
  customColor: '#FF0000',  // 新增自定义颜色
}
```

然后在代码中使用：

```javascript
const customColor = theme.getColor('customColor')
```

## 六、注意事项

1. 小程序不支持 CSS 变量，所以不能使用 `var(--theme-primary)` 这样的方式
2. 如果需要全局样式，建议在 `app.wxss` 中引入 `theme.wxss`
3. 颜色值使用十六进制格式，工具会自动处理 RGBA 转换
4. 样式类名都以 `theme-` 开头，避免与其他样式冲突

