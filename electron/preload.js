const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Dialog
    openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

    // Folder operations
    analyzeFolder: (folderPath) => ipcRenderer.invoke('folder:analyze', folderPath),

    // File operations
    readFileAsBase64: (filePath) => ipcRenderer.invoke('file:readAsBase64', filePath),

    // Platform info
    platform: process.platform,

    // AI Generation
    generateContent: (data) => ipcRenderer.invoke('runninghub:generate', data),

    // Image Upload
    uploadImage: (data) => ipcRenderer.invoke('runninghub:uploadImage', data),

    // Watermark Removal
    removeWatermark: (data) => ipcRenderer.invoke('runninghub:removeWatermark', data),

    // Account Status
    getAccountStatus: (data) => ipcRenderer.invoke('runninghub:accountStatus', data),

    // Cancel Task
    cancelTask: (data) => ipcRenderer.invoke('runninghub:cancel', data),

    // Event listeners
    onTaskId: (callback) => ipcRenderer.on('runninghub:task-id', (event, taskId) => callback(taskId)),

    // Media Export
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    saveFile: (folderPath, fileName, dataUrl) => ipcRenderer.invoke('file:save', folderPath, fileName, dataUrl),

    // Rclone / Google Drive
    rcloneGenerateLink: (remotePath) => ipcRenderer.invoke('rclone:generateLink', remotePath),
    rcloneCopyToDrive: (localPath, remotePath) => ipcRenderer.invoke('rclone:copyToDrive', localPath, remotePath),

    // Video AI-App Generation
    generateVideoAiApp: (data) => ipcRenderer.invoke('runninghub:generateVideoAiApp', data),

    // STL Analysis
    openStlDialog: () => ipcRenderer.invoke('dialog:openStl'),
    analyzeStl: (filePath) => ipcRenderer.invoke('stl:analyze', filePath),
});

