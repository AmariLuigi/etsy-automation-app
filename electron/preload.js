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

    // Watermark Removal
    removeWatermark: (data) => ipcRenderer.invoke('runninghub:removeWatermark', data),

    // Account Status
    getAccountStatus: (data) => ipcRenderer.invoke('runninghub:accountStatus', data),
});
