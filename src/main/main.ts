/* eslint global-require: off, no-console: off, promise/always-return: off */

import 'source-map-support/register';
import './system/logger';
import path from 'path';
import { app, BrowserWindow, shell } from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import setupIpcHandlers from './ipcHandlers';
import setupCron from './cron';
import BackendServiceManager from './system/backend';
import Server from './backend/backend';

let mainWindow: BrowserWindow | null = null;
let backendServiceManager: BackendServiceManager | null = null;

const stopBackendServiceManager = async () => {
  if (backendServiceManager) {
    await backendServiceManager.stop();
  }
};

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('lang', 'zh-CN');

app.on('window-all-closed', async () => {
  await stopBackendServiceManager();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await stopBackendServiceManager();
});

const originalUncaughtException = process.listeners('uncaughtException').pop();
process.removeAllListeners('uncaughtException');
process.on('uncaughtException', async (error, origin) => {
  console.error('An error occurred in the main process:', error);
  console.error(error.stack);
  await stopBackendServiceManager();
  originalUncaughtException?.(error, origin);
});

// Allow multiple desktop shortcuts or launches without blocking the next instance.
const gotTheLock = true;

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const createWindow = async () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  backendServiceManager = new BackendServiceManager(
    path.join(
      RESOURCES_PATH,
      process.env.BKEXE_PATH || './backend/__main__.exe',
    ),
  );

  await backendServiceManager.start();

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 528,
    height: 1024,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  if (!gotTheLock) {
    app.quit();
    return;
  }

  setupIpcHandlers(mainWindow, backendServiceManager);
  setupCron(mainWindow, backendServiceManager);

  const server = new Server(backendServiceManager.getPort(), mainWindow);
  server
    .start()
    .then(() => {
      console.log('Server started successfully');
    })
    .catch((err) => {
      console.error('Error starting server:', err);
    });

  mainWindow.loadURL(resolveHtmlPath('main.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (BrowserWindow.getAllWindows().length === 0) {
      app.quit();
    }
  });

  mainWindow.on('close', async () => {
    await stopBackendServiceManager();
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win !== mainWindow) {
        win.close();
      }
    });
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
