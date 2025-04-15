const { app, BrowserWindow } = require('electron')
const path = require('path')

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('in-process-gpu')

app.whenReady().then(() => {
    // Create the window with the specified dimensions and properties
    const win = new BrowserWindow({
        width: 600,
        height: 300,
        resizable: true,
        webPreferences: {
            nodeIntegration: true, // 🟢 Enable Node.js integration
            devTools: true  // 🟢 Ensure dev tools are enabled
        }
    })

    win.webContents.openDevTools()

    const indexPath = path.join(__dirname, '.funky-temp', 'index.html')
    win.loadFile(indexPath)
})
