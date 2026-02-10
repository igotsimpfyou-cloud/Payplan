const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data file location: Documents/PayPlanPro/data.json
const dataDir = path.join(app.getPath('documents'), 'PayPlanPro');
const dataFile = path.join(dataDir, 'data.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readData() {
  ensureDataDir();
  if (fs.existsSync(dataFile)) {
    try {
      return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function writeData(data) {
  ensureDataDir();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'PayPlan Pro',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
  });

  // In development, load from Vite dev server
  if (process.env.ELECTRON_DEV) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// IPC handlers for file-based storage
ipcMain.handle('storage:getItem', (_event, key) => {
  const data = readData();
  return data[key] !== undefined ? data[key] : null;
});

ipcMain.handle('storage:setItem', (_event, key, value) => {
  const data = readData();
  data[key] = value;
  writeData(data);
});

ipcMain.handle('storage:removeItem', (_event, key) => {
  const data = readData();
  delete data[key];
  writeData(data);
});

ipcMain.handle('storage:getAll', () => {
  return readData();
});

ipcMain.handle('storage:getDataPath', () => {
  return dataFile;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
