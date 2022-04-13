const { app, BrowserWindow, shell } = require('electron')
//const { app } = require('electron').remote
// Module with utilities for working with file and directory paths.
const path = require('path')
// Module with utilities for URL resolution and parsing.
const url = require('url')
const crypto = require('crypto')
const axios = require('axios')
const http = require('http')
const fs = require('fs')
const tcpPortUsed = require('tcp-port-used')

//require('dotenv').config()

//let pathLocation = app.getAppPath()
//console.log(pathLocation)

let isServerStarted = false

function base64URLEncode(str) {
  return str
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest()
}
let verifier = base64URLEncode(crypto.randomBytes(32))
let challenge = base64URLEncode(sha256(verifier))

const loadToken = async (authCode1, redirectURI) => {
  logEverywhere('function called')
  const options = {
    method: 'POST',
    url: `https://rebit-sentinel-dev.us.auth0.com/oauth/token`,
    headers: {
      'content-type': 'application/json',
    },
    data: {
      grant_type: 'authorization_code',
      client_id: 'CA5y8VfOKeR5aEMbp3EUcKYyPKHFQDId',
      code_verifier: verifier,
      code: authCode1,
      redirect_uri: redirectURI,
    },
  }
  try {
    const response = await axios(options)
    let accessToken = response.data.access_token
    //logEverywhere('response from api' + JSON.stringify(response))
    logEverywhere('accesstoken' + accessToken)
  } catch (error) {
    logEverywhere('error aagya' + error)
  }
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let pathName
// Deep linked url
let deeplinkingUrl
let auth0RedirectURI
let authCode
let str
let finalAns
// Force Single Instance Application
const gotTheLock = app.requestSingleInstanceLock()
if (gotTheLock) {
  app.on('second-instance', (e, argv) => {
    // Someone tried to run a second instance, we should focus our window.

    // Protocol handler for win32
    // argv: An array of the second instance’s (command line / deep linked) arguments
    if (!isServerStarted) {
      if (process.platform == 'win32') {
        // Keep only command line / deep linked arguments
        deeplinkingUrl = argv.slice(1)
        logEverywhere('data from brwser ' + deeplinkingUrl)
        str = deeplinkingUrl.toString().split('code=')
        //auth0RedirectURI = deeplinkingUrl.toString().split('auth0RedirectURI=')
        //authCode = str.toString().split('auth0RedirectURI=')
        finalAns = str[1].split('&')

        loadToken(finalAns[0], finalAns[1].split('=')[1])
      }
      logEverywhere('Authorization Code ' + finalAns[0])
      logEverywhere('Redirect URI ' + finalAns[1].split('=')[1])
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
} else {
  app.quit()
  return
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  })

  // and load the index.html of the app.
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
    })
  )
  pathName = path.dirname(app.getAppPath())

  //require(`${pathName}\dotenv`).config()
  /* const server = http.createServer((req, res) => {
    const queryObject = url.parse(req.url, true).query
    loadToken(queryObject.code, queryObject.auth0RedirectURI)
    logEverywhere('from server' + queryObject)
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('test.html').pipe(res)
  })
  let currentPort = 8080

  tcpPortUsed.check(8080, '127.0.0.1').then(
    function (inUse) {
      isServerStarted = true
      console.log('Port 8080 usage: ' + inUse)
      server.listen(currentPort)
    },
    function (err) {
      console.error('Error on check:', err.message)
    }
  ) */

  let electronInvokeURI

  if (!isServerStarted) {
    electronInvokeURI = 'rebit://betsol'
  } else {
    electronInvokeURI = `http://127.0.0.1:${currentPort}`
  }
  /*  shell.openExternal(
    `http://localhost:3000/search?challenge=${challenge}&electronInvokeURI=${electronInvokeURI}`
  ) */

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Protocol handler for win32
  if (process.platform == 'win32') {
    // Keep only command line / deep linked arguments
    deeplinkingUrl = process.argv.slice(1)
  }
  logEverywhere('createWindow# ' + deeplinkingUrl)

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

if (!app.isDefaultProtocolClient('rebit')) {
  // Define custom protocol handler. Deep linking works on packaged versions of the application!
  app.setAsDefaultProtocolClient('rebit')
}

app.on('will-finish-launching', function () {
  // Protocol handler for osx
  app.on('open-url', function (event, url) {
    event.preventDefault()
    deeplinkingUrl = url
    logEverywhere('open-url# ' + deeplinkingUrl)
  })
})

// Log both at dev console and at running node console instance
function logEverywhere(s) {
  console.log(s)
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`console.log("${pathName}")  `)
  }
}
