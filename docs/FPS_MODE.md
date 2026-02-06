# 🎬 FPS 模式 - 帧率设置功能

## ✅ 功能概述

**FPS 模式**允许用户通过输入**每秒帧数（Frames Per Second）**来自动计算每帧的时长，而不是手动输入毫秒数。

---

## 🎯 使用场景

### 为什么需要 FPS 模式？

在视频和动画领域，**帧率（FPS）**是更常用的概念：

- 🎥 **视频标准**: 24 fps（电影）、30 fps（电视）、60 fps（游戏）
- 🎨 **动画制作**: 12 fps（传统动画）、24 fps（流畅动画）
- 📱 **屏幕刷新**: 60 fps、120 fps、144 fps

相比之下，**毫秒（ms）**不够直观：
- ❌ 100ms = ? fps（需要计算）
- ✅ 10 fps = 100ms（一目了然）

---

## 🔧 功能特性

### 1️⃣ **双模式切换**

在侧边栏的"批量操作"部分，可以在两种模式间切换：

```
┌─────────────────────────────┐
│ 设置时长         [MS] [FPS] │ ← 模式切换按钮
├─────────────────────────────┤
│ [100] ms        [应用]      │ ← MS 模式
│ ≈ 10 fps                    │ ← 转换提示
└─────────────────────────────┘

切换到 FPS 模式后：

┌─────────────────────────────┐
│ 设置时长         [MS] [FPS] │
├─────────────────────────────┤
│ [10] fps        [应用]      │ ← FPS 模式
│ ≈ 100 ms                    │ ← 转换提示
└─────────────────────────────┘
```

### 2️⃣ **自动转换**

输入值时，两种模式的值会**实时同步**：

| 操作 | MS 值 | FPS 值 | 说明 |
|-----|-------|--------|------|
| 输入 100 ms | 100 | 10.0 | 自动计算 FPS |
| 输入 50 ms | 50 | 20.0 | 更快的帧率 |
| 输入 24 fps | 42 | 24.0 | 电影标准帧率 |
| 输入 60 fps | 17 | 60.0 | 游戏标准帧率 |

### 3️⃣ **转换提示**

在输入框下方显示转换后的值：

```
MS 模式:
[100] ms
≈ 10 fps      ← 提示对应的 FPS

FPS 模式:
[24] fps
≈ 42 ms       ← 提示对应的毫秒数
```

### 4️⃣ **精确计算**

**FPS → MS 转换**:
```typescript
ms = Math.round(1000 / fps)

示例:
24 fps → 1000 / 24 = 41.67 → 42 ms
30 fps → 1000 / 30 = 33.33 → 33 ms
60 fps → 1000 / 60 = 16.67 → 17 ms
```

**MS → FPS 转换**:
```typescript
fps = Math.round(1000 / ms * 10) / 10  // 保留 1 位小数

示例:
100 ms → 1000 / 100 = 10.0 fps
50 ms  → 1000 / 50  = 20.0 fps
42 ms  → 1000 / 42  = 23.8 fps
```

---

## 📊 常用帧率参考

### 视频标准

| 帧率 | 每帧时长 | 用途 |
|-----|---------|------|
| **24 fps** | 42 ms | 🎬 电影标准 |
| **25 fps** | 40 ms | 📺 PAL 电视标准 |
| **30 fps** | 33 ms | 📺 NTSC 电视标准 |
| **60 fps** | 17 ms | 🎮 游戏、高清视频 |

### 动画标准

| 帧率 | 每帧时长 | 用途 |
|-----|---------|------|
| **8 fps** | 125 ms | 🎨 简单 GIF 动画 |
| **10 fps** | 100 ms | 🎨 标准 GIF 动画 |
| **12 fps** | 83 ms | ✏️ 传统手绘动画 |
| **15 fps** | 67 ms | 🎬 流畅 GIF 动画 |

### 屏幕刷新率

| 帧率 | 每帧时长 | 用途 |
|-----|---------|------|
| **60 fps** | 17 ms | 📱 标准屏幕 |
| **120 fps** | 8 ms | 📱 高刷新率屏幕 |
| **144 fps** | 7 ms | 🖥️ 游戏显示器 |

---

## 💡 使用示例

### 示例 1: 制作电影风格 GIF

**目标**: 24 fps 的电影感动画

```
1. 点击 [FPS] 切换到 FPS 模式
2. 输入 24
3. 自动显示: ≈ 42 ms
4. 点击 [应用]
5. 所有帧的时长设置为 42 ms
```

### 示例 2: 制作流畅动画

**目标**: 60 fps 的超流畅动画

```
1. 点击 [FPS] 切换到 FPS 模式
2. 输入 60
3. 自动显示: ≈ 17 ms
4. 点击 [应用]
5. 所有帧的时长设置为 17 ms
```

### 示例 3: 从毫秒转换

**当前**: 已设置为 100 ms，想知道对应的 FPS

```
1. 查看转换提示: ≈ 10 fps
2. 或切换到 FPS 模式查看: 10 fps
```

---

## 🔍 技术实现

### 状态管理

```typescript
// 模式状态
const [durationMode, setDurationMode] = useState<'ms' | 'fps'>('ms');

// 毫秒值
const [globalDuration, setGlobalDuration] = useState(100);

// FPS 值
const [fpsValue, setFpsValue] = useState(10);
```

### 转换函数

```typescript
// FPS → 毫秒
const fpsToMs = (fps: number): number => {
  return Math.round(1000 / fps);
};

// 毫秒 → FPS
const msToFps = (ms: number): number => {
  return Math.round(1000 / ms * 10) / 10; // 保留 1 位小数
};
```

### 应用逻辑

```typescript
const updateGlobalDuration = () => {
  // 根据当前模式计算时长
  const duration = durationMode === 'fps' 
    ? fpsToMs(fpsValue)   // FPS 模式: 转换为毫秒
    : globalDuration;      // MS 模式: 直接使用
  
  // 应用到所有帧
  setAppState(prev => ({
    ...prev,
    frames: prev.frames.map(f => ({ ...f, duration }))
  }));

  // 同步另一个模式的值
  if (durationMode === 'fps') {
    setGlobalDuration(duration);  // 更新 MS 值
  } else {
    setFpsValue(msToFps(duration)); // 更新 FPS 值
  }
};
```

### 实时同步

```typescript
// MS 模式输入
onChange={(e) => {
  const ms = parseInt(e.target.value) || 100;
  setGlobalDuration(ms);
  setFpsValue(msToFps(ms));  // 同步 FPS 值
}}

// FPS 模式输入
onChange={(e) => {
  const fps = parseFloat(e.target.value) || 10;
  setFpsValue(fps);
  setGlobalDuration(fpsToMs(fps));  // 同步 MS 值
}}
```

---

## 🎨 UI 设计

### 模式切换按钮

```tsx
<div className="flex rounded-md border border-gray-700 bg-gray-800/50 overflow-hidden p-0.5">
  <button
    onClick={() => setDurationMode('ms')}
    className={durationMode === 'ms' 
      ? 'bg-gray-700 text-white shadow-sm'  // 激活状态
      : 'text-gray-500 hover:text-gray-400' // 未激活状态
    }
  >
    MS
  </button>
  <button
    onClick={() => setDurationMode('fps')}
    className={durationMode === 'fps' 
      ? 'bg-gray-700 text-white shadow-sm' 
      : 'text-gray-500 hover:text-gray-400'
    }
  >
    FPS
  </button>
</div>
```

### 输入框

```tsx
{durationMode === 'ms' ? (
  <div className="flex-1 relative">
    <input
      type="number"
      value={globalDuration}
      min="10"
      step="10"
    />
    <span className="absolute right-2">ms</span>
  </div>
) : (
  <div className="flex-1 relative">
    <input
      type="number"
      value={fpsValue}
      min="0.1"
      step="0.1"
    />
    <span className="absolute right-2">fps</span>
  </div>
)}
```

### 转换提示

```tsx
<p className="text-[9px] text-gray-600">
  {durationMode === 'ms' 
    ? `≈ ${msToFps(globalDuration)} fps`
    : `≈ ${fpsToMs(fpsValue)} ms`
  }
</p>
```

---

## ⚠️ 注意事项

### 1. 精度限制

由于四舍五入，某些转换可能不完全可逆：

```
24 fps → 42 ms → 23.8 fps  ✓ 接近
30 fps → 33 ms → 30.3 fps  ✓ 接近
60 fps → 17 ms → 58.8 fps  ⚠️ 略有偏差
```

**建议**: 对于精确控制，使用 MS 模式

### 2. FPS 范围

- **最小值**: 0.1 fps（10000 ms）
- **最大值**: 无限制（但 GIF 通常不超过 60 fps）
- **推荐范围**: 8-60 fps

### 3. MS 范围

- **最小值**: 10 ms（100 fps）
- **推荐范围**: 17-125 ms（8-60 fps）

### 4. GIF 限制

GIF 格式的时长精度为 **10ms**，因此：

```
17 ms → 实际可能是 20 ms
42 ms → 实际可能是 40 ms
```

**建议**: 使用 10 的倍数（10, 20, 30, 40, 50...）

---

## 📈 使用统计

### 常用帧率分布

| 帧率 | 使用场景 | 推荐度 |
|-----|---------|-------|
| **10 fps** | 简单 GIF | ⭐⭐⭐⭐⭐ |
| **15 fps** | 流畅 GIF | ⭐⭐⭐⭐ |
| **24 fps** | 电影风格 | ⭐⭐⭐⭐ |
| **30 fps** | 视频转换 | ⭐⭐⭐ |
| **60 fps** | 超流畅 | ⭐⭐ |

---

## 🚀 未来优化

### 可能的改进

1. **预设帧率**
   - 添加常用帧率快捷按钮
   - 如: [8] [10] [12] [15] [24] [30] [60]

2. **帧率检测**
   - 自动检测导入视频的帧率
   - 建议最佳 GIF 帧率

3. **帧率优化**
   - 智能降帧（如 60 fps → 30 fps）
   - 保持关键帧

4. **批量帧率**
   - 不同帧使用不同帧率
   - 慢动作/快动作效果

---

## ✅ 总结

### 核心功能

- ✅ **双模式切换** - MS 和 FPS 自由切换
- ✅ **自动转换** - 实时同步两种模式的值
- ✅ **转换提示** - 显示对应的转换值
- ✅ **精确计算** - 准确的 FPS ↔ MS 转换

### 用户体验

- 🎯 **更直观** - 使用熟悉的 FPS 概念
- ⚡ **更快捷** - 无需手动计算
- 📊 **更专业** - 符合视频行业标准
- 💯 **更灵活** - 两种模式随意切换

### 使用建议

- 📹 **视频转 GIF** → 使用 FPS 模式
- 🎨 **手动制作** → 使用 MS 模式
- 🎬 **电影风格** → 24 fps
- 🎮 **流畅动画** → 60 fps

---

**实施日期**: 2026-02-06  
**版本**: 1.0  
**状态**: ✅ 生产就绪
