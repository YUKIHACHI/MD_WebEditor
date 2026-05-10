const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const markdownExtensions = new Set(['.md', '.markdown']);
const isDev = !app.isPackaged;

function isMarkdownFile(filePath) {
  return markdownExtensions.has(path.extname(filePath).toLowerCase());
}

function getLaunchFiles() {
  return process.argv.slice(1).filter(isMarkdownFile);
}

async function readMarkdownFile(filePath) {
  return {
    name: path.basename(filePath),
    path: filePath,
    content: await fs.readFile(filePath, 'utf8')
  };
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'Markdown Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173/');
  } else {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('desktop:get-startup-files', async () => {
  const files = await Promise.all(getLaunchFiles().map(readMarkdownFile));
  return files;
});

ipcMain.handle('desktop:open-markdown-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
  });

  if (result.canceled) return [];
  return Promise.all(result.filePaths.filter(isMarkdownFile).map(readMarkdownFile));
});

ipcMain.handle('desktop:save-markdown-file', async (_event, { filePath, suggestedName, content }) => {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      defaultPath: suggestedName,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
    });

    if (result.canceled || !result.filePath) return null;
    targetPath = result.filePath;
  }

  await fs.writeFile(targetPath, content, 'utf8');

  return {
    name: path.basename(targetPath),
    path: targetPath
  };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
