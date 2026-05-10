const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('markdownEditorDesktop', {
  getStartupFiles: () => ipcRenderer.invoke('desktop:get-startup-files'),
  openMarkdownFiles: () => ipcRenderer.invoke('desktop:open-markdown-files'),
  saveMarkdownFile: (payload) => ipcRenderer.invoke('desktop:save-markdown-file', payload)
});
