⸻

CoffeeNote 小程序 PRD —— 咖啡豆详情页（Detail Page）

版本号：DetailPage_V1
功能类型：新增页面（完善豆子记录体系）
适用端：微信小程序
编写时间：2025-11-13
关联版本：基于 V1/V2/V3 架构扩展

⸻

1. 页面目标

提供一个结构化、美观、简洁的咖啡豆详情展示页，用于展示用户创建的某一款咖啡豆的完整信息，包括：
	•	基础信息
	•	风味标签
	•	冲煮参数
	•	用户笔记
	•	编辑入口
	•	分享能力

页面是用户复盘咖啡豆体验的核心页面。

⸻

2. 用户场景

场景 1：查看自己的咖啡豆记录

用户从豆单列表点击某条记录 → 查看详细信息。

场景 2：查看他人分享的豆单记录

从「发现」进入 → 详情页只读模式。

场景 3：对某条记录进行修改

从详情页点击右下角编辑按钮 → 跳转到编辑页。

⸻

3. 页面结构与模块说明

以下结构与视觉稿保持一致。

⸻

3.1 顶部导航（返回 / 分享）

元素：
	•	返回 icon
	•	分享 icon（微信原生分享）

交互：
	•	返回：返回上一页
	•	分享：调起微信分享面板

⸻

3.2 咖啡豆封面图
	•	来源：用户上传图片 thumbnail
	•	无图 → 使用系统默认图
	•	图片比例：4:3
	•	点击后期可扩展预览大图（本版本不做）

⸻

3.3 标题区（名称 + 产区）

字段：
	•	名称：name
	•	产区：originRegion
例如：「埃塞俄比亚 · 耶加雪菲」

⸻

3.4 标签模块（风味 / 氛围标签）

示例标签：
	•	柑橘
	•	果香浓
	•	耶加雪菲

来源： flavorTags[]

规则：
	•	最多展示 4 个
	•	超过折叠为“…更多”
	•	样式保持浅色背景、咖色描边

⸻

3.5 基础信息卡片

显示字段：

字段名	示例	数据字段
烘焙度	浅烘	roastLevel
处理法	水洗	processMethod
海拔	1900m	altitude
烘焙日期	2023-10-15	roastDate

规则：
	•	日期格式 YYYY-MM-DD
	•	为空不展示该字段行

⸻

3.6 冲煮参数卡片

示例内容：

字段	示例	数据字段
粉水比	1:15	ratio
研磨度	中粗	grindLevel
水温	92°C	temperature
时间	2’30”	brewTime

规则：
	•	brewTime 展示格式：mm:ss
	•	若为意式豆子（type=espresso）→ 后续版本适配意式参数模板

⸻

3.7 用户笔记模块

展示字段：note

规则：
	•	最长 1000 字
	•	支持换行
	•	不支持富文本

⸻

1. 页面跳转关系

发现页 → 详情页（只读）


⸻

5. 数据结构（沿用 v1/v2/v3）

{
  "id": "string",
  "thumbnail": "string",
  "name": "string",
  "originRegion": "string",
  "flavors": ["string"],
  "roastLevel": "string",
  "processMethod": "string",
  "altitude": "number",
  "roastDate": "string",
  "ratio": "string",
  "temperature": "number",
  "grindLevel": "string",
  "brewTime": "string",
  "note": "string",
  "type": "pour" | "espresso"
}


1. 异常处理

无网络
	•	提示「加载失败，请检查网络」
	•	显示重试按钮

记录不存在 / 已删除
	•	展示「记录不存在或已被删除」
	•	点击按钮返回上一页

字段缺失
	•	不展示空字段
	•	保持卡片结构不塌陷

⸻

8. UI 规范还原要求
	•	卡片圆角：12px
	•	模块间距：16px
	•	标题字体：PingFang SC Semibold 20px
	•	正文字体：PingFang SC Regular 14px
	•	标签底色：#EFE8DA
	•	图标颜色：#5A4632
	•	页面背景色：#F9F7F5

⸻
