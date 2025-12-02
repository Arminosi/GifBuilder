# GIF Builder

[English](#english) | [简体中文](#simplified-chinese)

**Live Demo**: [gif.qwq.team](https://gif.qwq.team)

<a name="english"></a>

It is powerful, web-based tool for creating and editing animated GIFs, built with React and TypeScript.~

## Features

- **Frame Management**:
  - Batch upload images to create animation frames.
  - Drag and drop to reorder frames easily.
  - **Virtualized List**: Optimized rendering for handling thousands of frames smoothly.
  - Batch edit frame properties (duration, position, size).
  - Copy/Paste frames support.

- **Canvas Editor**:
  - Interactive visual editor to position and resize frames on the canvas.
  - **Zoom Controls**: Zoom in/out or use auto-fit mode for precise editing.
  - Support for transparent backgrounds or custom background colors.
  - Real-time preview of frame adjustments.

- **GIF Generation**:
  - High-performance GIF generation using Web Workers (`gif.js`) to keep the UI responsive.
  - Customizable output settings:
    - Canvas dimensions (Width/Height)
    - Quality
    - Loop count
    - Background transparency

- **Productivity Tools**:
  - **Undo/Redo**: Full history support for all operations.
  - **Snapshots**: Save and restore your workspace state locally.
  - **Export**: Download generated GIFs or export all frames as a ZIP archive.
  - **Internationalization**: Support for English and Chinese (简体中文).

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Key Libraries**:
  - `@dnd-kit`: For accessible and performant drag-and-drop interactions.
  - `react-window` & `react-virtualized-auto-sizer`: For efficient list virtualization.
  - `gif.js`: For client-side GIF encoding.
  - `jszip`: For zipping frame images.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GifBuilder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173`.

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
GifBuilder/
├── components/           # React components
│   ├── CanvasEditor.tsx  # Visual editor for frames
│   ├── FrameItem.tsx     # Individual frame component
│   └── VirtualFrameList.tsx # Virtualized list container
├── hooks/                # Custom hooks
│   └── useHistory.ts     # Undo/Redo logic
├── utils/                # Utility functions
│   ├── gifHelper.ts      # GIF generation logic
│   ├── storage.ts        # IndexedDB/LocalStorage wrappers
│   └── translations.ts   # i18n strings
├── App.tsx               # Main application logic
└── types.ts              # TypeScript interfaces
```

## License

MIT

## Author

[Arminosi](https://github.com/Arminosi/GifBuilder/)

---

<a name="simplified-chinese"></a>

# GIF 生成器 (GIF Builder)

**在线演示**: [gif.qwq.team](https://gif.qwq.team)

一个基于 React 和 TypeScript 构建的强大 Web 端 GIF 制作与编辑工具。

## 功能特性

- **帧管理**:
  - 批量上传图片创建动画帧。
  - 拖拽排序帧。
  - **虚拟化列表**: 优化渲染，流畅处理数千帧。
  - 批量编辑帧属性（持续时间、位置、尺寸）。
  - 支持复制/粘贴帧。

- **画布编辑器**:
  - 交互式可视化编辑器，调整画布上的帧位置和大小。
  - **缩放控制**: 放大/缩小或使用自动适应模式进行精确编辑。
  - 支持透明背景或自定义背景色。
  - 实时预览帧调整。

- **GIF 生成**:
  - 使用 Web Workers (`gif.js`) 进行高性能 GIF 生成，保持 UI 响应。
  - 可自定义输出设置：
    - 画布尺寸 (宽/高)
    - 画质
    - 循环次数
    - 背景透明度

- **生产力工具**:
  - **撤销/重做**: 支持所有操作的完整历史记录。
  - **快照**: 本地保存和恢复工作区状态。
  - **导出**: 下载生成的 GIF 或将所有帧导出为 ZIP 压缩包。
  - **国际化**: 支持英语和中文（简体中文）。

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **核心库**:
  - `@dnd-kit`: 用于实现无障碍且高性能的拖拽交互。
  - `react-window` & `react-virtualized-auto-sizer`: 用于高效的列表虚拟化渲染。
  - `gif.js`: 用于客户端 GIF 编码。
  - `jszip`: 用于打包帧图片。

## 快速开始

### 前置要求

- Node.js (推荐 v16 或更高版本)
- npm 或 yarn

### 安装

1. 克隆仓库:
   ```bash
   git clone <repository-url>
   cd GifBuilder
   ```

2. 安装依赖:
   ```bash
   npm install
   ```

3. 启动开发服务器:
   ```bash
   npm run dev
   ```

4. 打开浏览器访问 `http://localhost:5173`。

### 生产环境构建

创建生产环境构建:

```bash
npm run build
```

构建后的文件将位于 `dist` 目录中。

## 项目结构

```
GifBuilder/
├── components/           # React 组件
│   ├── CanvasEditor.tsx  # 画布可视化编辑器
│   ├── FrameItem.tsx     # 单个帧组件
│   └── VirtualFrameList.tsx # 虚拟化列表容器
├── hooks/                # 自定义 Hooks
│   └── useHistory.ts     # 撤销/重做逻辑
├── utils/                # 工具函数
│   ├── gifHelper.ts      # GIF 生成逻辑
│   ├── storage.ts        # IndexedDB/LocalStorage 封装
│   └── translations.ts   # 国际化字符串
├── App.tsx               # 主应用逻辑
└── types.ts              # TypeScript 接口定义
```

## 许可证

MIT

## 作者

[Arminosi](https://github.com/Arminosi/GifBuilder/)
