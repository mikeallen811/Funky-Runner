const { app, BrowserWindow } = require('electron');
const path = require('path');

const base64 = process.argv[2];
const raw = Buffer.from(base64, 'base64').toString('utf8');
const defaultConfig = {
    width: 800,
    height: 600,
    title: 'default',
    webPreferences: {
        contextIsolation: false,
        nodeIntegration: true
    }
};

let config = {};
try {
    config = JSON.parse(raw);
} catch (err) {
    console.error('[!] Failed to parse window config:\n', raw);
    process.exit(1);
}

const electronConfig = { 
    ...defaultConfig, 
    ...config,
    webPreferences: {
        ...defaultConfig.webPreferences,
        ...config.webPreferences
    }
};

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('in-process-gpu');

app.whenReady().then(() => {
    const win = new BrowserWindow(electronConfig);

    if (electronConfig.title) {
        win.setTitle(electronConfig.title);
    }

    if (electronConfig.showMenuBar === false || electronConfig.showMenu === false) {
        win.setMenu(null); // 🟢 Remove the menu bar
    }

    const indexPath = path.join(__dirname, '.funky-temp', 'index.html');
    win.loadFile(indexPath);
});
