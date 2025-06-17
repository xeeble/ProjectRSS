const { app, BrowserWindow, contextBridge, ipcMain } = require('electron')
const path = require('node:path')
const { updateElectronApp } = require('update-electron-app')
const Parser = require('rss-parser');
updateElectronApp()

function createWindow() {
  const mainWindow = new BrowserWindow({
    icon: 'rss-512',
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
  
    }
  })

  mainWindow.loadFile('index.html')
}

ipcMain.handle('fetch-feed', async (event, feedUrl) => {
  const parser = new Parser();
  try {
    const feed = await parser.parseURL(feedUrl);
    return { feed };
  } catch (error) {
    return { error: error.message };
  }
});

app.whenReady().then(() => createWindow())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})