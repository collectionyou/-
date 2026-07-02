import { BrowserWindow } from 'electron';
import { setCron } from './system/cron';
import type BackendServiceManager from './system/backend';

const setupCron = (
  mainWindow: BrowserWindow,
  _bsm: BackendServiceManager,
) => {
  // Keep lightweight UI refresh only. Avoid startup health checks and sync loops
  // so service connections happen when the user actually loads apps/tasks.
  setCron('*/5 * * * * *', () => {
    mainWindow.webContents.send('refresh-config');
  });
};

export default setupCron;
