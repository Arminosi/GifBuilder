# ZIP Import with Metadata Support

## 功能说明

GIF Builder 现在支持从 ZIP 压缩包导入帧序列，并能自动识别 `metadata.json` 文件来应用帧持续时间。

## 使用方法

### 基本 ZIP 导入

1. 将图片帧打包成 ZIP 文件（可以放在任意子文件夹中）
2. 拖放或选择 ZIP 文件导入
3. 所有图片将按文件名自然排序导入

支持的图片格式：PNG, JPG, JPEG, WEBP, GIF, BMP

### 带 metadata.json 的 ZIP 导入

如果 ZIP 包中包含 `metadata.json` 文件，程序会自动读取并应用帧持续时间。

#### metadata.json 格式

```json
{
  "generatedBy": "RM-Anim-Reconstructor",
  "defaultFrameDuration": 16,
  "totalFrames": 410,
  "frames": [
    {
      "file": "Seq_0000.png",
      "duration": 16,
      "frameIndex": 0
    },
    {
      "file": "Seq_0001.png",
      "duration": 32,
      "frameIndex": 1
    }
  ]
}
```

#### 字段说明

- `generatedBy` (可选): 生成工具标识
- `defaultFrameDuration` (可选): 默认帧持续时间（毫秒）
- `totalFrames` (可选): 总帧数
- `frames` (必需): 帧信息数组
  - `file`: 图片文件名（可以包含路径）
  - `duration`: 该帧的持续时间（毫秒）
  - `frameIndex`: 帧索引

#### 持续时间优先级

1. **metadata.json 中的帧持续时间** - 如果 metadata 中指定了该帧的 duration
2. **metadata.json 中的默认持续时间** - 如果设置了 defaultFrameDuration
3. **全局持续时间** - 应用程序的全局设置

## 示例

项目根目录下的 `example-metadata.json` 提供了一个完整的示例。

## 技术细节

- ZIP 文件会被递归扫描，支持任意深度的子文件夹
- 自动跳过 macOS 的 `__MACOSX` 资源文件和隐藏文件
- 使用自然排序算法，确保 `frame_2.png` 排在 `frame_10.png` 前面
- metadata.json 可以放在 ZIP 的任意位置
- 文件名匹配时会自动去除路径，只比较文件名
