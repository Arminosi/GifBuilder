<div align="center">

# ✨ GIF Builder ✨

**一个强大、纯前端的 GIF 制作与编辑工具**
<br>
**A powerful, client-side GIF creation and editing tool**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[简体中文](#cn) | [English](#en)

<h3>
  🚀 <a href="https://gif.qwq.team" target="_blank">Live Demo / 在线演示</a> 🚀
</h3>

</div>

---

<a name="cn"></a>

## 📖 项目简介

**GifBuilder** 是一个基于 React 和 TypeScript 构建的现代化 Web 应用。它允许用户在浏览器中直接创建、编辑和生成 GIF 动图。
**无需上传图片到服务器**，所有处理均在本地完成，确保了数据的安全性和处理的高效性。

## ✨ 核心特性

| 功能模块 | 详细说明 |
| :--- | :--- |
| **🖼️ 帧管理** | • **批量上传**：支持多选图片上传<br>• **拖拽排序**：直观的拖放操作调整帧顺序<br>• **虚拟滚动**：流畅处理数千帧的大型项目<br>• **批量编辑**：统一调整时长、大小、位置 |
| **🎨 画布编辑** | • **可视化操作**：所见即所得的拖拽编辑<br>• **缩放控制**：滚轮缩放，精细调整<br>• **背景设置**：支持透明或自定义背景色<br>• **实时预览**：即时查看动画效果 |
| **⚡ 高性能** | • **Web Workers**：多线程生成 GIF，不阻塞 UI<br>• **参数调优**：自定义尺寸、画质、循环次数<br>• **透明处理**：支持指定颜色扣除（透明化） |
| **🛠️ 生产力** | • **撤销/重做**：完整的历史记录栈<br>• **快照系统**：本地保存工作区，随时恢复<br>• **多格式导出**：导出 GIF 或 ZIP 源码包 |

## 🚀 使用指南

1.  **📤 上传素材**
    点击左侧上传区域或直接将图片拖入网页。
2.  **🔢 调整顺序**
    在底部列表中拖拽图片调整播放顺序。
3.  **✏️ 编辑画面**
    点击底部的 "显示编辑器" 打开画布，拖拽调整图片位置或大小。
4.  **💾 生成导出**
    点击右上角的 "生成" 按钮，设置参数后导出 GIF。

## 🛠️ 本地开发

### 环境要求
*   Node.js (v16+)
*   npm 或 yarn

### 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/Arminosi/GifBuilder.git
cd GifBuilder

# 2. 安装依赖
npm install

# 3. 启动开发服务
npm run dev
```

访问 `http://localhost:5173` 开始开发。

### 构建部署

```bash
npm run build
```
构建产物位于 `dist` 目录，可直接部署到任何静态文件服务器。

## 📂 目录结构

```
src/
├── components/       # UI 组件 (编辑器、列表、模态框)
├── hooks/            # React Hooks (历史记录、状态管理)
├── utils/            # 工具库 (GIF 编码、文件处理)
├── App.tsx           # 应用入口
└── types.ts          # TypeScript 类型定义
```

## 📚 文档

完整的优化和技术文档请查看 **[docs 文件夹](./docs/)**：

- 🚀 [性能优化文档](./docs/) - 透明度、压缩、颜色平滑等优化
- 📊 [优化对比](./docs/OPTIMIZATION_COMPARISON.md) - 优化前后性能对比
- 🎯 [快速参考](./docs/QUICK_REFERENCE.md) - 快速查找优化技巧

---

<a name="en"></a>

## 📖 Introduction

**GifBuilder** is a modern web application built with React and TypeScript for creating and editing animated GIFs directly in the browser.
**No server upload required** - all processing happens locally, ensuring data privacy and high performance.

## ✨ Features

| Module | Description |
| :--- | :--- |
| **🖼️ Frame Manager** | • **Batch Upload**: Upload multiple images at once<br>• **Drag & Drop**: Reorder frames easily<br>• **Virtual List**: Handle thousands of frames smoothly<br>• **Batch Edit**: Adjust duration, size, position for all frames |
| **🎨 Canvas Editor** | • **Visual Editor**: WYSIWYG drag-and-drop editing<br>• **Zoom**: Zoom in/out for precision<br>• **Background**: Transparent or custom colors<br>• **Preview**: Real-time animation preview |
| **⚡ Performance** | • **Web Workers**: Non-blocking GIF generation<br>• **Customization**: Control size, quality, looping<br>• **Transparency**: Chroma key support |
| **🛠️ Productivity** | • **Undo/Redo**: Full history stack<br>• **Snapshots**: Save/Restore workspace locally<br>• **Export**: Download as GIF or ZIP archive |

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16+)
*   npm or yarn

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Arminosi/GifBuilder.git
cd GifBuilder

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit `http://localhost:5173`.

### Build

```bash
npm run build
```

## 📄 License

MIT License.

## 👤 Author

[Arminosi](https://github.com/Arminosi/GifBuilder/)
