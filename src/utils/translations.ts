export type Language = 'en' | 'zh';

export interface FrameLabels {
  time: string;
  x: string;
  y: string;
  w: string;
  h: string;
}

export interface TranslationSchema {
  undo: string;
  redo: string;
  records: string;
  generate: string;
  dropHere: string;
  clickDrag: string;
  supports: string;
  canvasSettings: string;
  width: string;
  height: string;
  transparent: string;
  backgroundColor: string;
  batchActions: string;
  autoFit: string;
  fitMode: string;
  fitFill: string;
  fitContain: string;
  applyFit: string;
  setDuration: string;
  apply: string;
  nameAsc: string;
  nameDesc: string;
  removeAll: string;
  saveHistory: string;
  frames: string;
  dragReorder: string;
  noFrames: string;
  uploadStart: string;
  generating: string;
  ready: string;
  close: string;
  download: string;
  historyTitle: string;
  noRecords: string;
  restore: string;
  confirmClear: string;
  promptSave: string;
  confirmRestore: string;
  failed: string;
  viewOptions: string;
  frameSize: string;
  compactMode: string;
  autoSaved: string;
  clearHistory: string;
  confirmClearHistory: string;
  confirmAction: string;
  toggleSidebar: string;
  canvasEditor: string;
  selectFrameToEdit: string;
  frame: FrameLabels;
  selectedFrames: string;
  selectionProperties: string;
  showEditor: string;
  hideEditor: string;
  batchMove: string;
  exportZip: string;
  zipping: string;
  downloadZip: string;
  zipSaved: string;
  duplicate: string;
  duplicateShortcut: string;
  resetProperties: string;
  alignCenter: string;
  fitCanvas: string;
  fillCanvas: string;
  contextMenu: {
    copy: string;
    paste: string;
    duplicateHere: string;
    insertHere: string;
    resetProperties: string;
    alignCenter: string;
    fitCanvas: string;
    fillCanvas: string;
    downloadSelected: string;
    deleteSelected: string;
    cancel: string;
    setColor: string;
    noColor: string;
  };
  insertModal: {
    title: string;
    dropText: string;
    cancel: string;
  };
  frameInfo: string;
  batchMode: string;
  batchSelectMode: string;
  layoutMode: {
    auto: string;
    vertical: string;
    horizontal: string;
  };
  author: string;
  confirmReset: string;
  localProcessing: string;
  linkSelection: string;
  unlinkSelection: string;
  outputControl: {
    title: string;
    targetSize: string;
    unlimited: string;
    autoAdjust: string;
  };
  settings: string;
  history: string;
  noHistory: string;
  historyActions: {
    addFrames: string;
    reorderFrames: string;
    removeFrame: string;
    batchUpdate: string;
    updateFrame: string;
    resetFrame: string;
    transformFrame: string;
    clearAll: string;
    sortFrames: string;
    pasteFrames: string;
    duplicateFrames: string;
  };
  generation: {
    title: string;
    resultTitle: string;
    initializing: string;
    rendering: string;
    processingFrames: string;
    processingFrameN: string;
    compressing: string;
    compressionAttempt: string;
    completed: string;
    preparing: string;
  };
  bgRemoval: {
    title: string;
    pickColor: string;
    tolerance: string;
    applySelected: string;
    eyeDropper: string;
    remove: string;
    gifTransparent: string;
    enableGifTransparent: string;
    gifTransparentInfo: string;
    auto: string;
    manual: string;
  };
  preview: {
    play: string;
    pause: string;
  };
  autoDisableTransparent: string;
  transparentConfirm: {
    title: string;
    message: string;
    switch: string;
    keep: string;
  };
  craftWebsite: string;
  githubRepo: string;
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    undo: "Undo (Ctrl+Z)",
    redo: "Redo (Ctrl+Y)",
    records: "Snapshots",
    history: "History Stack",
    noHistory: "No history yet",
    generate: "Generate GIF",
    dropHere: "Drop images here",
    clickDrag: "Click or Drag images",
    supports: "Supports PNG, JPG, WEBP",
    canvasSettings: "Canvas Settings",
    width: "Width (px)",
    height: "Height (px)",
    transparent: "Transparent Background",
    backgroundColor: "Solid Color",
    batchActions: "Batch Actions",
    autoFit: "Auto Fit Frames",
    fitMode: "Fit Mode",
    fitFill: "Stretch / Fill",
    fitContain: "Keep Ratio / Contain",
    applyFit: "Resize All Frames",
    setDuration: "Set all duration (ms)",
    apply: "Apply",
    nameAsc: "Name Asc",
    nameDesc: "Name Desc",
    removeAll: "Remove All Frames",
    saveHistory: "Save Snapshot",
    frames: "Frames",
    dragReorder: "Drag to reorder",
    noFrames: "No frames yet.",
    uploadStart: "Upload images to get started.",
    generating: "Generating GIF...",
    ready: "GIF Ready!",
    close: "Close",
    download: "Download GIF",
    historyTitle: "Snapshots",
    noRecords: "No saved snapshots.",
    restore: "Restore",
    confirmClear: "Are you sure you want to clear all frames?",
    promptSave: "Enter a name for this history record:",
    confirmRestore: "Restore snapshot \"{name}\"? Current unsaved changes will be lost.",
    failed: "Failed to generate GIF. See console for details.",
    viewOptions: "View Options",
    frameSize: "Frame Size",
    compactMode: "Compact Mode",
    autoSaved: "Auto-save",
    clearHistory: "Clear History",
    confirmClearHistory: "Click again to confirm",
    confirmAction: "Click again to confirm",
    toggleSidebar: "Toggle Sidebar",
    canvasEditor: "Canvas Editor",
    selectFrameToEdit: "Select a frame from the list below to edit its position and size.",
    frame: {
      time: "Time (ms)",
      x: "X Pos",
      y: "Y Pos",
      w: "Width",
      h: "Height"
    },
    selectedFrames: "{count} Frames Selected",
    selectionProperties: "Selection Properties",
    showEditor: "Show Editor",
    hideEditor: "Hide Editor",
    batchMove: "Batch Move",
    exportZip: "Package ZIP",
    zipping: "Zipping...",
    downloadZip: "Download Source ZIP",
    zipSaved: "Auto-save (ZIP)",
    duplicate: "Duplicate Selected",
    duplicateShortcut: "Duplicate (Ctrl+D)",
    resetProperties: "Reset Properties",
    alignCenter: "Align Center",
    fitCanvas: "Fit Canvas (Keep Ratio)",
    fillCanvas: "Fill Canvas (Stretch)",
    contextMenu: {
      copy: "Copy (Ctrl+C)",
      paste: "Paste (Ctrl+V)",
      duplicateHere: "Duplicate Selected Here",
      insertHere: "Insert Images Here",
      resetProperties: "Reset Properties",
      alignCenter: "Align Center",
      fitCanvas: "Fit Canvas (Keep Ratio)",
      fillCanvas: "Fill Canvas (Stretch)",
      downloadSelected: "Download Selected",
      deleteSelected: "Delete Selected",
      cancel: "Cancel",
      setColor: "Set Color Tag",
      noColor: "No Color"
    },
    insertModal: {
      title: "Insert Images",
      dropText: "Drop or Click to Upload",
      cancel: "Cancel"
    },
    frameInfo: 'Frame Info',
    batchMode: "Batch Mode",
    batchSelectMode: "Batch Select",
    layoutMode: {
      auto: "Auto",
      vertical: "Vertical",
      horizontal: "Horizontal"
    },
    author: "Created by Arminosi",
    confirmReset: "Confirm?",
    localProcessing: "All operations are processed locally in your browser. No data is uploaded to any server.",
    linkSelection: "Link Selection",
    unlinkSelection: "Unlink Selection",
    outputControl: {
      title: "Output Control",
      targetSize: "Target Size",
      unlimited: "Unlimited",
      autoAdjust: "Will automatically adjust quality to meet size limit"
    },
    settings: "Settings",
    historyActions: {
      addFrames: "Add Frames",
      reorderFrames: "Reorder Frames",
      removeFrame: "Remove Frame",
      batchUpdate: "Batch Update",
      updateFrame: "Update Frame",
      resetFrame: "Reset Frame",
      transformFrame: "Transform Frame",
      clearAll: "Clear All",
      sortFrames: "Sort Frames",
      pasteFrames: "Paste Frames",
      duplicateFrames: "Duplicate Frames"
    },
    generation: {
      title: "Generating GIF...",
      resultTitle: "Result",
      initializing: "Initializing GIF encoder...",
      rendering: "Rendering GIF... {0}%",
      processingFrames: "Processing frames...",
      processingFrameN: "Processing frame {0}/{1}...",
      compressing: "File too large ({0}MB > {1}MB), compressing attempt {2}...",
      compressionAttempt: "[Compression {0}] ",
      completed: "Generation complete!",
      preparing: "Preparing..."
    },
    bgRemoval: {
      title: "Background Removal",
      pickColor: "Pick Color",
      tolerance: "Tolerance",
      applySelected: "Apply to Selected",
      eyeDropper: "Eye Dropper",
      remove: "Remove Background",
      gifTransparent: "Transparency Key",
      enableGifTransparent: "Enable GIF Transparency",
      gifTransparentInfo: "Selected color will be transparent in output GIF",
      auto: "Auto",
      manual: "Manual"
    },
    preview: {
      play: "Play Preview",
      pause: "Pause Preview"
    },
    autoDisableTransparent: "No transparent pixels detected, automatically switched to solid background",
    transparentConfirm: {
      title: "Transparent Image Detected",
      message: "The imported image(s) contain transparency. Would you like to switch to transparent background mode?",
      switch: "Switch to Transparent",
      keep: "Keep Current Settings"
    },
    craftWebsite: "Visit Craft Website",
    githubRepo: "View on GitHub"
  },
  zh: {
    undo: "撤销 (Ctrl+Z)",
    redo: "重做 (Ctrl+Y)",
    records: "历史存档",
    generate: "生成 GIF",
    dropHere: "拖放图片到此处",
    clickDrag: "点击或拖拽上传图片",
    supports: "支持 PNG, JPG, WEBP",
    canvasSettings: "画布设置",
    width: "宽度 (px)",
    height: "高度 (px)",
    transparent: "透明背景",
    backgroundColor: "纯色背景",
    batchActions: "批量操作",
    autoFit: "自动缩放",
    fitMode: "缩放模式",
    fitFill: "填充 / 拉伸",
    fitContain: "保持比例 / 适应",
    applyFit: "应用缩放",
    setDuration: "统一设置时长 (ms)",
    apply: "应用",
    nameAsc: "文件名正序",
    nameDesc: "文件名倒序",
    removeAll: "清空所有帧",
    saveHistory: "保存快照",
    frames: "帧列表",
    dragReorder: "拖拽可重新排序",
    noFrames: "暂无图片帧",
    uploadStart: "上传图片开始制作",
    generating: "正在生成 GIF...",
    ready: "GIF 制作完成!",
    close: "关闭",
    download: "下载 GIF",
    historyTitle: "历史快照",
    noRecords: "暂无历史记录",
    restore: "恢复",
    confirmClear: "确定要清空所有帧吗？",
    promptSave: "请输入此记录的名称:",
    confirmRestore: "确定恢复存档 \"{name}\" 吗？当前未保存的更改将丢失。",
    failed: "生成 GIF 失败，请查看控制台。",
    viewOptions: "视图选项",
    frameSize: "图标大小",
    compactMode: "紧凑模式",
    autoSaved: "自动保存",
    clearHistory: "清空历史",
    confirmClearHistory: "再次点击确认清空",
    confirmAction: "再次点击确认",
    toggleSidebar: "切换侧边栏",
    canvasEditor: "画布编辑",
    selectFrameToEdit: "在下方列表中选择一帧以编辑其位置和大小。",
    frame: {
      time: "时长 (ms)",
      x: "X 坐标",
      y: "Y 坐标",
      w: "宽度",
      h: "高度"
    },
    selectedFrames: "已选择 {count} 帧",
    selectionProperties: "选中帧属性",
    showEditor: "显示编辑器",
    hideEditor: "隐藏编辑器",
    batchMove: "批量移动",
    exportZip: "打包下载",
    zipping: "正在打包...",
    downloadZip: "下载原图压缩包",
    zipSaved: "自动保存 (ZIP)",
    duplicate: "复制选中帧",
    duplicateShortcut: "复制 (Ctrl+D)",
    resetProperties: "重置属性",
    alignCenter: "居中对齐",
    fitCanvas: "比例缩放适应画布",
    fillCanvas: "拉伸缩放适应画布",
    contextMenu: {
      copy: "复制 (Ctrl+C)",
      paste: "粘贴 (Ctrl+V)",
      duplicateHere: "复制选中帧到此处",
      insertHere: "插入图片到此处",
      resetProperties: "重置选中帧属性",
      alignCenter: "居中对齐",
      fitCanvas: "比例缩放适应画布",
      fillCanvas: "拉伸缩放适应画布",
      downloadSelected: "下载选中帧",
      deleteSelected: "删除选中帧",
      cancel: "取消",
      setColor: "设置颜色标记",
      noColor: "无颜色"
    },
    insertModal: {
      title: "插入图片",
      dropText: "拖拽或点击以上传插入",
      cancel: "取消"
    },
    frameInfo: "帧信息",
    batchMode: "批量模式",
    batchSelectMode: "批量选择",
    layoutMode: {
      auto: "自动",
      vertical: "纵向",
      horizontal: "横向"
    },
    author: "作者",
    confirmReset: "确认重置?",
    localProcessing: "所有操作均在本地浏览器完成，数据不会上传至服务器。",
    linkSelection: "关联选中",
    unlinkSelection: "取消关联",
    outputControl: {
      title: "输出控制",
      targetSize: "目标大小",
      unlimited: "不限制",
      autoAdjust: "设置后将自动调整质量以满足大小限制"
    },
    settings: "设置",
    history: "操作历史",
    noHistory: "暂无历史记录",
    historyActions: {
      addFrames: "添加帧",
      reorderFrames: "调整顺序",
      removeFrame: "删除帧",
      batchUpdate: "批量修改",
      updateFrame: "修改帧属性",
      resetFrame: "重置帧",
      transformFrame: "变换帧 (缩放/移动)",
      clearAll: "清空所有帧",
      sortFrames: "排序帧",
      pasteFrames: "粘贴帧",
      duplicateFrames: "复制帧"
    },
    generation: {
      title: "正在生成 GIF...",
      resultTitle: "生成结果",
      initializing: "正在初始化 GIF 编码器...",
      rendering: "正在渲染 GIF... {0}%",
      processingFrames: "正在处理帧画面...",
      processingFrameN: "正在处理第 {0}/{1} 帧...",
      compressing: "文件过大 ({0}MB > {1}MB)，正在进行第 {2} 次压缩...",
      compressionAttempt: "[压缩 {0}] ",
      completed: "生成完成！",
      preparing: "准备开始..."
    },
    bgRemoval: {
      title: "背景移除",
      pickColor: "选择颜色",
      tolerance: "容差",
      applySelected: "应用到选中帧",
      eyeDropper: "吸管工具",
      remove: "移除背景",
      gifTransparent: "透明色指定",
      enableGifTransparent: "启用 GIF 透明色",
      gifTransparentInfo: "选中的颜色将在输出的 GIF 中变为透明",
      auto: "自动",
      manual: "手动"
    },
    preview: {
      play: "播放预览",
      pause: "暂停预览"
    },
    autoDisableTransparent: "未检测到透明图片，自动为您关闭透明背景",
    transparentConfirm: {
      title: "检测到透明图片",
      message: "导入的图片包含透明通道，是否切换到透明背景模式？",
      switch: "切换到透明背景",
      keep: "保持当前设置"
    },
    craftWebsite: "访问制图匠网站",
    githubRepo: "查看 GitHub 仓库"
  }
};