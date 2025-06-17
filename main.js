const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const { updateElectronApp } = require('update-electron-app')
updateElectronApp()

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => createWindow())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})