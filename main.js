const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const getStoragePath = () => {
  if (!app.isPackaged) {
    return path.join(__dirname, 'oasa-favorites.json');
  }

  let exeDir = process.env.PORTABLE_EXECUTABLE_DIR;

  if (!exeDir || exeDir === 'NOT_SET') {
    try {
      const ppidCmd = `wmic process where processid=${process.pid} get parentprocessid`;
      const ppidOutput = execSync(ppidCmd, { encoding: 'utf8' });
      const ppid = ppidOutput.split('\n')[1].trim();

      const pathCmd = `wmic process where processid=${ppid} get executablepath`;
      const pathOutput = execSync(pathCmd, { encoding: 'utf8' });
      const parentExePath = pathOutput.split('\n')[1].trim();

      if (parentExePath && fs.existsSync(parentExePath)) {
        exeDir = path.dirname(parentExePath);
      }
    } catch (e) {
      console.error('Failed to resolve parent process path:', e);
    }
  }

  if (!exeDir) {
    exeDir = process.cwd();
  }

  return path.join(exeDir, 'oasa-favorites.json');
};

ipcMain.handle('get-favorites', () => {
  try {
    const filePath = getStoragePath();
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading favorites file:', err);
    return [];
  }
});

ipcMain.handle('save-favorites', (event, favorites) => {
  try {
    const filePath = getStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(favorites, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving favorites file:', err);
    return false;
  }
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    title: 'OASA Telematics Wrapper',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('https://telematics.oasa.gr/');

  mainWindow.webContents.on('did-finish-load', () => {
    const injectScriptPath = path.join(__dirname, 'renderer-inject.js');
    if (fs.existsSync(injectScriptPath)) {
      const injectScript = fs.readFileSync(injectScriptPath, 'utf8');
      mainWindow.webContents.executeJavaScript(injectScript)
        .catch(err => console.error('Failed to inject script:', err));
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});