import {
  Browsers,
  makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import pino from "pino"
import chalk from "chalk"
import { cache } from './cache.js'
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import handler from "../handler.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mains = new Map()
const firstConnection = new Set()
const reconectando = new Map()
const reconnectTimer = new Map()

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function getPluginFiles(dir) {
  let files = []

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name)

    if (item.isDirectory()) {
      files.push(...getPluginFiles(fullPath))
    } else if (item.name.endsWith(".js")) {
      files.push(fullPath)
    }
  }

  return files
}

function cleanNumber(number = "") {
  return String(number).replace(/\D/g, "")
}

function safeEndSocket(sock) {
  try {
    if (sock?.end) sock.end()
  } catch (e) {}
}

function safeRemoveDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
  } catch (e) {}
}

async function createMainBot(number, ownerNumber) {
  const mainNumber = cleanNumber(number)
  const sessionPath = path.join(process.cwd(), "Sessions", "Mains", mainNumber)
  const configPath = path.join(process.cwd(), "subs", mainNumber, "config.js")
  const configDir = path.join(process.cwd(), "subs", mainNumber)

  const existingMain = mains.get(mainNumber)

  if (existingMain?.sock?.user &&!reconectando.get(mainNumber)) {
    console.log(chalk.yellow(`[ MAIN-BOT ${mainNumber} ] ⚠️ Ya está conectado, omitiendo...`))
    return existingMain.sock
  }

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true })
    console.log(chalk.cyan(`[ MAIN-BOT ${mainNumber} ] 📁 Carpeta Sessions creada`))
  }

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
    console.log(chalk.cyan(`[ MAIN-BOT ${mainNumber} ] 📁 Carpeta subs creada`))
  }

  if (!fs.existsSync(configPath)) {
    const mainConfig = `export default {
  nombre: 'GALAXIT MAIN',
  nombre2: 'GALAXIT MAIN V1',
  prefix: '.',
  banner: 'https://files.catbox.moe/41qoci.jpg',
  owner: ['5492644156919', '542646762285', '5219992042946'],
  version: '1.0.4',
  tipo: 'main-bot',
  creador: '—͟͞ ⁱᵃᵐ Cuerbito 𒆜ᴼᶠⁱᶜⁱᵃˡ',
  canalId: '120363409173174836@newsletter',
  canalNombre: 'GALAXIT BOT OFC',
  mainBot: true,
  mainNumber: '${mainNumber}',
  botowner: '${ownerNumber || mainNumber}'
}`

    fs.writeFileSync(configPath, mainConfig.trim())
    console.log(chalk.green(`[ MAIN-BOT ${mainNumber} ] 📄 Config creada en subs/${mainNumber}/config.js`))
  } else {
    console.log(chalk.gray(`[ MAIN-BOT ${mainNumber} ] 📄 Config ya existe en subs/${mainNumber}/config.js`))
  }

  let botConfig

  try {
    const configModule = await import(`file://${configPath}?update=${Date.now()}`)
    botConfig = configModule.default
  } catch (e) {
    botConfig = {
      nombre: "GALAXIT MAIN",
      nombre2: "GALAXIT MAIN V1",
      prefix: ".",
      banner: "https://files.catbox.moe/41qoci.jpg",
      version: "1.0.4",
      tipo: "main-bot",
      mainBot: true,
      mainNumber: mainNumber,
      owner: ["5492644156919"],
      botowner: ownerNumber || mainNumber,
      canalId: "120363409173174836@newsletter",
      canalNombre: "GALAXIT BOT OFC",
      creador: "5492644156919"
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  const groupCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 300,
    useClones: false
})

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger)
},

cachedGroupMetadata: async (jid) => {
    return groupCache.get(jid)
},

markOnlineOnConnect: true,
syncFullHistory: false,
defaultQueryTimeoutMs: 60000,
keepAliveIntervalMs: 30000,
connectTimeoutMs: 60000
  })
  
  const originalGroupMetadata = sock.groupMetadata.bind(sock)

sock.groupMetadata = async (jid) => {
    const cached = groupCache.get(jid)

    if (cached) return cached

    const metadata = await originalGroupMetadata(jid)

    if (metadata) {
        groupCache.set(jid, metadata)
    }

    return metadata
}

  sock.isSubBot = false
  sock.isPremiumBot = false
  sock.isMainBot = true
  sock.sessionType = 'main'
  sock.mainNumber = mainNumber

  global.forwardCounter ??= 0

    const mikuFrases = [
  
"💙 Cada día es una nueva oportunidad para aprender.",
"🌸 Gracias por confiar en mí.",
"📖 La historia siempre guarda una enseñanza.",
"🎧 A veces el silencio también es una respuesta.",
"🍵 Tómate las cosas con calma.",
"💙 Espero haberte sido de ayuda.",
"🌷 Sigue adelante, paso a paso.",
"⭐ Nunca dejes de aprender algo nuevo.",
"📚 Todo conocimiento tiene su valor.",
"🌼 Me alegra poder ayudarte.",
"💙 Gracias por usar MikuBot.",
"🌸 Espero que tengas un excelente día.",
"🍀 Confía en ti mismo y sigue avanzando.",
"🎶 Disfruta cada momento.",
"📖 Siempre hay algo nuevo por descubrir.",
"💙 Nos volveremos a encontrar en otro comando.",
"🌺 Que todo salga bien.",
"✨ Gracias por estar aquí.",
"🌷 Espero verte de nuevo muy pronto.",
"⭐ Cuídate y sigue disfrutando de MikuBot."
]
    
  const _sendMessage = sock.sendMessage.bind(sock)

  sock.sendMessage = async (jid, content = {}, options = {}) => {
    global.forwardCounter++
      
    if (global.forwardCounter >= 40) {
      global.forwardCounter = 0

      if (content && typeof content === 'object') {
        content.contextInfo = {
          ...(content.contextInfo || {}),
          isForwarded: true,
          forwardingScore: 999999,
          forwardedNewsletterMessageInfo: {
            newsletterJid: botConfig.canalId,
            newsletterName: botConfig.canalNombre,
            serverMessageId: 1
          }
        }
      }
    }
      
if (content?.text) {
    const frase = mikuFrases[Math.floor(Math.random() * mikuFrases.length)]
    content.text += `\n\n${frase}`
}

return _sendMessage(jid, content, options)
  }

  reconectando.delete(mainNumber)

  if (reconnectTimer.get(mainNumber)) {
    clearTimeout(reconnectTimer.get(mainNumber))
    reconnectTimer.delete(mainNumber)
  }

  mains.set(mainNumber, {
    sock,
    ownerNumber,
    config: botConfig
  })

  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds()
    } catch (e) {}

    if (!firstConnection.has(mainNumber)) {
      firstConnection.add(mainNumber)
      console.log(chalk.green(`[ MAIN-BOT ${mainNumber} ] ✅ Credenciales guardadas`))
    }
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update
    const statusCode = lastDisconnect?.error?.output?.statusCode || 0

    if (connection === "open") {
      reconectando.delete(mainNumber)

      if (reconnectTimer.get(mainNumber)) {
        clearTimeout(reconnectTimer.get(mainNumber))
        reconnectTimer.delete(mainNumber)
      }

      console.log(chalk.green.bold(`[ MAIN-BOT ${mainNumber} ] ✅ Conectado como: ${botConfig.nombre || botConfig.name}`))
      console.log(chalk.cyan(`[ MAIN-BOT ${mainNumber} ] 📌 Prefijo: ${botConfig.prefix}`))
      console.log(chalk.cyan(`[ MAIN-BOT ${mainNumber} ] 📌 Tipo: ${botConfig.tipo || "main-bot"}`))
      return
    }

    if (connection === "close") {
      if (reconectando.get(mainNumber) || reconnectTimer.get(mainNumber)) {
        return
      }

      if (
        statusCode === DisconnectReason.loggedOut ||
        statusCode === 401 ||
        statusCode === 403
      ) {
        console.log(chalk.red(`[ MAIN-BOT ${mainNumber} ] ❌ Sesión inválida o cerrada, eliminando...`))

        const currentMain = mains.get(mainNumber)
        safeEndSocket(currentMain?.sock)

        mains.delete(mainNumber)
        firstConnection.delete(mainNumber)
        reconectando.delete(mainNumber)

        if (reconnectTimer.get(mainNumber)) {
          clearTimeout(reconnectTimer.get(mainNumber))
          reconnectTimer.delete(mainNumber)
        }

        safeRemoveDir(sessionPath)
        safeRemoveDir(configDir)

        return
      }

      if (
        statusCode === DisconnectReason.connectionReplaced ||
        statusCode === 440
      ) {
        console.log(chalk.yellow(`[ MAIN-BOT ${mainNumber} ] ⚠️ Conexión reemplazada por otra sesión (${statusCode})`))

        const currentMain = mains.get(mainNumber)
        safeEndSocket(currentMain?.sock)

        mains.delete(mainNumber)
        reconectando.delete(mainNumber)

        return
      }

      reconectando.set(mainNumber, true)

      const isRestartRequired =
        statusCode === DisconnectReason.restartRequired ||
        statusCode === 515

      const delay = isRestartRequired ? 1000 : 5000

      if (isRestartRequired) {
        console.log(chalk.yellow(`[ MAIN-BOT ${mainNumber} ] 🔁 Reinicio requerido por WhatsApp (${statusCode})`))
      } else {
        console.log(chalk.yellow(`[ MAIN-BOT ${mainNumber} ] 🔄 Reconectando... (${statusCode})`))
      }

      const timer = setTimeout(async () => {
        try {
          const currentMain = mains.get(mainNumber)

          if (currentMain?.sock) {
            safeEndSocket(currentMain.sock)
          }

          mains.delete(mainNumber)

          console.log(chalk.cyan(`[ MAIN-BOT ${mainNumber} ] 🔌 Creando nuevo socket...`))
          await createMainBot(mainNumber, ownerNumber)
        } catch (err) {
          console.log(chalk.red(`[ MAIN-BOT ${mainNumber} ] ❌ Error reconectando: ${err.message}`))
        } finally {
          reconectando.delete(mainNumber)
          reconnectTimer.delete(mainNumber)
        }
      }, delay)

      reconnectTimer.set(mainNumber, timer)
    }
  })

  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages?.[0]

      if (!msg?.message) return
      if (msg.key?.remoteJid === "status@broadcast") return

      const mainPlugins = new Map()
const pluginsDir = path.join(process.cwd(), "plugins")

if (fs.existsSync(pluginsDir)) {
  const pluginFiles = getPluginFiles(pluginsDir)

  for (const filePath of pluginFiles) {
          try { 
            const fileUrl = `file://${filePath}?update=${Date.now()}`
            const pluginModule = await import(fileUrl)
            const pluginData = pluginModule.default || pluginModule

            if (pluginData.name) {
              mainPlugins.set(pluginData.name.toLowerCase(), pluginData)

              if (Array.isArray(pluginData.alias)) {
                for (const alias of pluginData.alias) {
                  mainPlugins.set(String(alias).toLowerCase(), pluginData)
                }
              }
            }
          } catch (err) {
    console.error("Error cargando plugin:", filePath)
    console.error(err)
          }
        }
      }

      await handler(sock, msg, mainPlugins, botConfig)
    } catch (err) {}
  })

  return sock
}

async function getPairingCode(number) {
  const mainNumber = cleanNumber(number)

  return new Promise(async (resolve, reject) => {
    let resolved = false
    let codeRequested = false
    let sock = null

    function finish(data, isError = false) {
      if (resolved) return

      resolved = true
      clearTimeout(timeout)

      if (isError) {
        reject(data)
      } else {
        resolve(data)
      }
    }

    const timeout = setTimeout(() => {
      finish({
        status: "expired",
        code: null,
        number: mainNumber
      })
    }, 60000)

    async function requestCode() {
      if (resolved || codeRequested || !sock) return

      if (sock.user || sock.authState?.creds?.registered) {
        finish({
          status: "connected",
          code: null,
          number: mainNumber
        })
        return
      }

      codeRequested = true

      try {
        await sleep(1500)

        if (resolved) return

        if (sock.user || sock.authState?.creds?.registered) {
          finish({
            status: "connected",
            code: null,
            number: mainNumber
          })
          return
        }

        const code = await sock.requestPairingCode(mainNumber)
        const formattedCode = code.match(/.{1,4}/g)?.join("-") || code

        console.log(chalk.cyan(`[ MAIN-BOT ${mainNumber} ] 🔑 Código: ${formattedCode}`))

        finish({
          status: "pending",
          code: formattedCode,
          number: mainNumber
        })
      } catch (err) {
        console.log(chalk.red(`[ MAIN-BOT ${mainNumber} ] ❌ Error generando código: ${err.message}`))
        finish(err, true)
      }
    }

    try {
      sock = await createMainBot(mainNumber, mainNumber)

      if (sock.user || sock.authState?.creds?.registered) {
        finish({
          status: "connected",
          code: null,
          number: mainNumber
        })
        return
      }

      sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update

        if (resolved) return

        if (connection === "open") {
          finish({
            status: "connected",
            code: null,
            number: mainNumber
          })
          return
        }

        if (
          connection === "connecting" ||
          qr
        ) {
          await requestCode()
        }
      })

      await requestCode()
    } catch (err) {
      console.log(chalk.red(`[ MAIN-BOT ${mainNumber} ] ❌ Error: ${err.message}`))
      finish(err, true)
    }
  })
}

function getMains() {
  return mains
}

function getMain(number) {
  return mains.get(cleanNumber(number))
}

function getConnectionStatus() {
  const mainsArray = Array.from(mains.values())
  const active = mainsArray.filter(main => main.sock?.user).length

  return {
    total: mains.size,
    active
  }
}

async function removeMain(number) {
  const mainNumber = cleanNumber(number)
  const mainData = mains.get(mainNumber)

  if (mainData?.sock) {
    safeEndSocket(mainData.sock)
  }

  mains.delete(mainNumber)
  firstConnection.delete(mainNumber)
  reconectando.delete(mainNumber)

  if (reconnectTimer.get(mainNumber)) {
    clearTimeout(reconnectTimer.get(mainNumber))
    reconnectTimer.delete(mainNumber)
  }

  const sessionPath = path.join(process.cwd(), "Sessions", "Mains", mainNumber)
  const configDir = path.join(process.cwd(), "subs", mainNumber)

  safeRemoveDir(sessionPath)
  safeRemoveDir(configDir)

  console.log(chalk.yellow(`[ MAIN-BOT ${mainNumber} ] 🗑️ Eliminado`))
}

export {
  createMainBot,
  getPairingCode,
  getMains,
  getMain,
  removeMain,
  getConnectionStatus
}
