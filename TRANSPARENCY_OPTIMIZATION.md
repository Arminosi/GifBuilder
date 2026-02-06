# 透明度算法优化

## 更改概述

优化了 GIF 生成器的透明度算法，使每一帧都能单独计算并使用自己的透明色键（transparency key color），而不是所有帧共享一个透明色。

## 主要改进

### 1. 每帧独立透明色计算

**之前的实现：**
- 在生成 GIF 之前，扫描所有帧找到一个全局未使用的颜色
- 所有帧共享同一个透明色键
- 如果某个颜色在任何一帧中被使用，就不能作为透明色

**现在的实现：**
- 每一帧单独计算自己未使用的颜色作为透明色键
- 不同的帧可以使用不同的透明色
- 每帧只需要找到在该帧中未使用的颜色即可

### 2. 优化的颜色查找算法

新的 `findUnusedColorForFrame` 函数：

1. **构建已使用颜色集合**：扫描帧中所有不透明像素（alpha >= 128），将其颜色存入 Set
2. **随机尝试**：尝试最多 10 个随机颜色，检查是否未被使用
3. **系统搜索**：如果随机尝试失败，进行系统性搜索（步长为 17）
4. **性能优化**：使用 Set 数据结构，查找复杂度为 O(1)

### 3. 两种透明模式支持

#### 自动透明模式（默认）
- 每帧自动计算未使用的颜色
- 在 `addFrame` 时为每帧单独指定 `transparent` 选项
- 不设置全局 GIF 透明色

#### 自定义透明色模式
- 用户指定一个颜色作为透明色
- 所有帧共享这个透明色
- 在 GIF 初始化时设置全局透明色

## 代码变更

### 修改的函数

1. **`findUnusedColorForFrame`**（新函数）
   - 参数：`frameUrl: string, frameIndex: number`
   - 返回：`{ hex: number, str: string }`
   - 功能：为单个帧查找未使用的透明色

2. **`createGif` 函数内的帧处理循环**
   - 在处理每帧之前计算 `frameTransparentKey`
   - 使用帧特定的透明色填充背景
   - 在 `addFrame` 时传递帧特定的透明色选项

### 关键代码片段

```typescript
// 为每帧计算透明色
if (currentConfig.transparent) {
  if (globalTransparentKey) {
    // 使用全局自定义透明色
    frameTransparentKey = globalTransparentKey;
  } else {
    // 计算此帧的未使用颜色
    frameTransparentKey = await findUnusedColorForFrame(frame.previewUrl, i);
  }
}

// 使用帧特定的透明色填充背景
if (currentConfig.transparent && frameTransparentKey) {
  ctx.fillStyle = frameTransparentKey.str;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 为每帧单独指定透明色
const addFrameOptions: any = {
  copy: true,
  delay: frame.duration
};

if (currentConfig.transparent && frameTransparentKey && !globalTransparentKey) {
  addFrameOptions.transparent = frameTransparentKey.hex;
}

gif.addFrame(ctx, addFrameOptions);
```

## 优势

1. **更高的成功率**：每帧独立查找未使用颜色，即使某些颜色在其他帧中被使用也不影响
2. **更好的性能**：使用 Set 数据结构加速颜色查找
3. **更灵活**：支持自动和自定义两种透明模式
4. **更好的调试**：每帧都有日志输出，显示找到的透明色

## 兼容性

- 完全向后兼容现有的自定义透明色功能
- 不影响非透明模式的 GIF 生成
- 与压缩功能完全兼容

## 测试建议

1. 测试自动透明模式下的多帧 GIF
2. 测试自定义透明色模式
3. 测试包含大量颜色的帧
4. 验证控制台日志中每帧的透明色信息
