const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// 后端服务进程
let serverProcess = null;

// 获取资源路径（打包后和开发时不同）
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, '..', relativePath);
}

// 获取用户数据路径
function getUserDataPath() {
  return app.getPath('userData');
}

// 启动后端服务
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = getResourcePath('server-prod.js');
    const userDataPath = getUserDataPath();
    
    // 设置环境变量传递用户数据路径
    const env = { 
      ...process.env, 
      USER_DATA_PATH: userDataPath,
      NODE_ENV: 'production'
    };

    serverProcess = spawn(process.execPath, [serverPath], {
      env,
      cwd: app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      if (data.toString().includes('服务已启动')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    // 如果5秒内没有收到启动成功消息，也继续
    setTimeout(resolve, 5000);
  });
}

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: '运费结算工具',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // 加载应用
  if (app.isPackaged) {
    // 生产模式：加载打包后的前端文件
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

// 应用就绪
app.whenReady().then(async () => {
  // 先启动后端服务
  try {
    await startServer();
    console.log('后端服务已启动');
  } catch (err) {
    console.error('后端服务启动失败:', err);
  }

  // 创建窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时
app.on('window-all-closed', () => {
  // 关闭后端服务
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
