# 风隅随笔设计规范

## 色相驱动系统（Hue System）

所有颜色派生自 `--hue-theme: 220deg`，改一个变量即可换整套配色。

### 4 层背景深度

| 变量 | 浅色模式 | 深色模式 | 用途 |
|---|---|---|---|
| `--c-bg` | `hsl(220 0% 100%)` | `hsl(220 0% 7%)` | 最底层页面背景 |
| `--c-bg-1` | `hsl(220 20% 98%)` | `hsl(220 10% 10%)` | 次要背景 |
| `--c-bg-2` | `hsl(220 10% 95%)` | `hsl(220 10% 14%)` | 第三层 |
| `--c-bg-3` | `hsl(220 10% 92%)` | `hsl(220 10% 18%)` | 最深背景层 |

### 卡片背景

所有卡片背景严格统一使用 `--ld-bg-card`：
- 浅色：`var(--c-bg)`
- 深色：`var(--c-bg-3)` → `hsl(220deg 10% 14%)`（与 b.ncii.cn 严格对齐）

不得使用 `:nth-child` 为不同卡片设置不同背景/渐变。

### 阴影系统

- 唯一阴影变量 `--ld-shadow`，派生自背景色（`color-mix()` 或透明度控制）
- 浅色：`hsl(220 10% 92%)`（`--c-bg-3`）
- 深色：`hsla(220 10% 10% / 50%)`
- 不设额外的 `--shadow-md`/`--shadow-lg` 硬编码变量

## 左侧栏规范

- **无背景色**（`background: none`，与 `--c-bg` 一致）
- **无右边框**（`border-right: none`）
- **底部区域无上边框**
- hover 仅改变文字颜色，无背景色变化
- 间距紧凑：`padding: 24px 16px 16px`
- 头像 64px
- 名称字号 `1.05rem`
- 导航项 `padding: 7px 10px`

## 搜索框

- 无 ⌘K 徽标，普通输入框
- 点击触发展开搜索弹窗（SearchModal）
- 无独立搜索页面

## 主题切换按钮

参考 b.ncii.cn pill 样式：
- `background: var(--c-bg-2)`
- `border-radius: 1rem`
- `padding: 2px`
- 激活项使用 `--ld-bg-card` 背景 + `--ld-shadow`
- 三选项：☀ Light / 🌙 Dark / 🖥 System

## 卡片 hover 规范

**严禁 hover 时出现边框变化！** 所有卡片 hover 仅限：
- `translateY(-2px)` 上限（文章列表可 `translateX(2px)`）
- 阴影增强，但不应影响布局
- `transition: all .2s`

## 右侧栏组件

只保留设计文档声明的两个卡片：
1. 天气时钟卡（SVG 时钟 + 日期 + 天气 mock）
2. 六边形雷达图卡（文章/天数/相册/动态/友链/书单），2 种模式切换

移除：快捷标签、友链、站点统计

## 文章列表卡片

参考 b.ncii.cn 的图片渐变过渡：
- 图片左侧，内容右侧
- `mask-image` 或 `linear-gradient` 过渡图片到内容区
- 标题字号 `0.95rem`
- 卡片间距 14px

## 文章详情页 TOC

- 无卡片背景（`background: none`，`box-shadow: none`）
- 扁平导航列表样式
- `border-left` hover 交互

## 搜索弹窗

- 命令面板式 modal
- 快捷键 `Ctrl+K` 触发
- ESC/点击蒙层关闭
- 实时过滤结果
