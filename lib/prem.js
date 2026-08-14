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
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import handler from "../handler.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prems = new Map()
const firstConnection = new Set()
const reconectando = new Map()
const reconnectTimer = new Map()

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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

async function createPremBot(number, ownerNumber) {
  const premNumber = cleanNumber(number)
  const sessionPath = path.join(process.cwd(), "Sessions", "Prems", premNumber)
  const configPath = path.join(process.cwd(), "subs", premNumber, "config.js")
  const configDir = path.join(process.cwd(), "subs", premNumber)

  const existingPrem = prems.get(premNumber)

  if (existingPrem?.sock?.user && !reconectando.get(premNumber)) {
    console.log(chalk.yellow(`[ PREM-BOT ${premNumber} ] ⚠️ Ya está conectado, omitiendo...`))
    return existingPrem.sock
  }

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true })
    console.log(chalk.cyan(`[ PREM-BOT ${premNumber} ] 📁 Carpeta Sessions creada`))
  }

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
    console.log(chalk.cyan(`[ PREM-BOT ${premNumber} ] 📁 Carpeta subs creada`))
  }

  if (!fs.existsSync(configPath)) {
    const premConfig = `export default {
  nombre: 'Chocola prem',
  nombre2: 'Chocola prem V1',
  prefix: '.',
  banner: 'https://n.uguu.se/RiVejJrB.jpeg',
  owner: ['5492644156919', '542646762285', '5219992042946'],
  version: '1.0.4',
  tipo: '💎 prem-bot',
  creador: '—͟͞ ⁱᵃᵐ Cuerbito 𒆜ᴼᶠⁱᶜⁱᵃˡ',
  canalId: '120363409173174836@newsletter',
  canalNombre: '💎 Chocola prem channel',
  premBot: true,
  premNumber: '${premNumber}',
  botowner: '5492644156919'
}`

    fs.writeFileSync(configPath, premConfig.trim())
    console.log(chalk.green(`[ PREM-BOT ${premNumber} ] 📄 Config creada en subs/${premNumber}/config.js`))
  } else {
    console.log(chalk.gray(`[ PREM-BOT ${premNumber} ] 📄 Config ya existe en subs/${premNumber}/config.js`))
  }

  let botConfig

  try {
    const configModule = await import(`file://${configPath}?update=${Date.now()}`)
    botConfig = configModule.default
  } catch (e) {
    botConfig = {
      nombre: "Chocola prem",
      nombre2: "Chocola prem V1",
      prefix: ".",
      banner: "https://n.uguu.se/RiVejJrB.jpeg",
      version: "1.0.4",
      tipo: "💎 prem-bot",
      premBot: true,
      premNumber: premNumber,
      owner: ["5492644156919"],
      botowner: ownerNumber || premNumber,
      canalId: "120363409173174836@newsletter",
      canalNombre: "💎 CHOCOLA PREM BOT OFC",
      creador: "5492644156919"
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()
  const logger = pino({ level: "silent" })

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    markOnlineOnConnect: true,
    syncFullHistory: false,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000
  })

  sock.isSubBot = false
  sock.isPremiumBot = true
  sock.isMainBot = false
  sock.sessionType = 'prem'
  sock.premNumber = premNumber

  global.forwardCounter ??= 0

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
    return _sendMessage(jid, content, options)
  }

  reconectando.delete(premNumber)

  if (reconnectTimer.get(premNumber)) {
    clearTimeout(reconnectTimer.get(premNumber))
    reconnectTimer.delete(premNumber)
  }

  prems.set(premNumber, {
    sock,
    ownerNumber,
    config: botConfig
  })

  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds()
    } catch (e) {}

    if (!firstConnection.has(premNumber)) {
      firstConnection.add(premNumber)
      console.log(chalk.green(`[ PREM-BOT ${premNumber} ] ✅ Credenciales guardadas`))
    }
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update
    const statusCode = lastDisconnect?.error?.output?.statusCode || 0

    if (connection === "open") {
      reconectando.delete(premNumber)

      if (reconnectTimer.get(premNumber)) {
        clearTimeout(reconnectTimer.get(premNumber))
        reconnectTimer.delete(premNumber)
      }

      console.log(chalk.green.bold(`[ PREM-BOT ${premNumber} ] ✅ Conectado como: ${botConfig.nombre || botConfig.name}`))
      console.log(chalk.cyan(`[ PREM-BOT ${premNumber} ] 📌 Prefijo: ${botConfig.prefix}`))
      console.log(chalk.cyan(`[ PREM-BOT ${premNumber} ] 📌 Tipo: ${botConfig.tipo || "prem-bot"}`))
      return
    }

    if (connection === "close") {
      if (reconectando.get(premNumber) || reconnectTimer.get(premNumber)) {
        return
      }

      if (
        statusCode === DisconnectReason.loggedOut ||
        statusCode === 401 ||
        statusCode === 403
      ) {
        console.log(chalk.red(`[ PREM-BOT ${premNumber} ] ❌ Sesión inválida o cerrada, eliminando...`))

        const currentPrem = prems.get(premNumber)
        safeEndSocket(currentPrem?.sock)

        prems.delete(premNumber)
        firstConnection.delete(premNumber)
        reconectando.delete(premNumber)

        if (reconnectTimer.get(premNumber)) {
          clearTimeout(reconnectTimer.get(premNumber))
          reconnectTimer.delete(premNumber)
        }

        safeRemoveDir(sessionPath)
        safeRemoveDir(configDir)

        return
      }

      if (
        statusCode === DisconnectReason.connectionReplaced ||
        statusCode === 440
      ) {
        console.log(chalk.yellow(`[ PREM-BOT ${premNumber} ] ⚠️ Conexión reemplazada por otra sesión (${statusCode})`))

        const currentPrem = prems.get(premNumber)
        safeEndSocket(currentPrem?.sock)

        prems.delete(premNumber)
        reconectando.delete(premNumber)

        return
      }

      reconectando.set(premNumber, true)

      const isRestartRequired =
        statusCode === DisconnectReason.restartRequired ||
        statusCode === 515

      const delay = isRestartRequired ? 1000 : 5000

      if (isRestartRequired) {
        console.log(chalk.yellow(`[ PREM-BOT ${premNumber} ] 🔁 Reinicio requerido por WhatsApp (${statusCode})`))
      } else {
        console.log(chalk.yellow(`[ PREM-BOT ${premNumber} ] 🔄 Reconectando... (${statusCode})`))
      }

      const timer = setTimeout(async () => {
        try {
          const currentPrem = prems.get(premNumber)

          if (currentPrem?.sock) {
            safeEndSocket(currentPrem.sock)
          }

          prems.delete(premNumber)

          console.log(chalk.cyan(`[ PREM-BOT ${premNumber} ] 🔌 Creando nuevo socket...`))
          await createPremBot(premNumber, ownerNumber)
        } catch (err) {
          console.log(chalk.red(`[ PREM-BOT ${premNumber} ] ❌ Error reconectando: ${err.message}`))
        } finally {
          reconectando.delete(premNumber)
          reconnectTimer.delete(premNumber)
        }
      }, delay)

      reconnectTimer.set(premNumber, timer)
    }
  })

  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages?.[0]

      if (!msg?.message) return
      if (msg.key?.remoteJid === "status@broadcast") return

      const premPlugins = new Map()
      const pluginsDir = path.join(process.cwd(), "plugins")

      if (fs.existsSync(pluginsDir)) {
        const pluginFiles = fs
          .readdirSync(pluginsDir)
          .filter(file => file.endsWith(".js"))

        for (const file of pluginFiles) {
          try {
            const filePath = path.join(pluginsDir, file)
            const fileUrl = `file://${filePath}?update=${Date.now()}`
            const pluginModule = await import(fileUrl)
            const pluginData = pluginModule.default || pluginModule

            if (pluginData.name) {
              premPlugins.set(pluginData.name.toLowerCase(), pluginData)

              if (Array.isArray(pluginData.alias)) {
                for (const alias of pluginData.alias) {
                  premPlugins.set(String(alias).toLowerCase(), pluginData)
                }
              }
            }
          } catch (err) {}
        }
      }

      await handler(sock, msg, premPlugins, botConfig)
    } catch (err) {}
  })

  return sock
}

async function getPairingCode(number) {
  const premNumber = cleanNumber(number)

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
      const sessionPath = path.join(process.cwd(), "Sessions", "Prems", premNumber)
      if (fs.existsSync(sessionPath)) {
        safeRemoveDir(sessionPath)
      }
      const configDir = path.join(process.cwd(), "subs", premNumber)
      if (fs.existsSync(configDir)) {
        safeRemoveDir(configDir)
      }
      finish({
        status: "expired",
        code: null,
        number: premNumber
      })
    }, 60000)

    async function requestCode() {
      if (resolved || codeRequested || !sock) return

      if (sock.user || sock.authState?.creds?.registered) {
        finish({
          status: "connected",
          code: null,
          number: premNumber
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
            number: premNumber
          })
          return
        }

        const code = await sock.requestPairingCode(premNumber)
        const formattedCode = code.match(/.{1,4}/g)?.join("-") || code

        console.log(chalk.cyan(`[ PREM-BOT ${premNumber} ] 🔑 Código: ${formattedCode}`))

        finish({
          status: "pending",
          code: formattedCode,
          number: premNumber
        })
      } catch (err) {
        console.log(chalk.red(`[ PREM-BOT ${premNumber} ] ❌ Error generando código: ${err.message}`))
        const sessionPath = path.join(process.cwd(), "Sessions", "Prems", premNumber)
        if (fs.existsSync(sessionPath)) {
          safeRemoveDir(sessionPath)
        }
        const configDir = path.join(process.cwd(), "subs", premNumber)
        if (fs.existsSync(configDir)) {
          safeRemoveDir(configDir)
        }
        finish(err, true)
      }
    }

    try {
      sock = await createPremBot(premNumber, premNumber)

      if (sock.user || sock.authState?.creds?.registered) {
        finish({
          status: "connected",
          code: null,
          number: premNumber
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
            number: premNumber
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
      console.log(chalk.red(`[ PREM-BOT ${premNumber} ] ❌ Error: ${err.message}`))
      const sessionPath = path.join(process.cwd(), "Sessions", "Prems", premNumber)
      if (fs.existsSync(sessionPath)) {
        safeRemoveDir(sessionPath)
      }
      const configDir = path.join(process.cwd(), "subs", premNumber)
      if (fs.existsSync(configDir)) {
        safeRemoveDir(configDir)
      }
      finish(err, true)
    }
  })
}

function getPrems() {
  return prems
}

function getPrem(number) {
  return prems.get(cleanNumber(number))
}

function getConnectionStatus() {
  const premsArray = Array.from(prems.values())
  const active = premsArray.filter(prem => prem.sock?.user).length

  return {
    total: prems.size,
    active
  }
}

async function removePrem(number) {
  const premNumber = cleanNumber(number)
  const premData = prems.get(premNumber)

  if (premData?.sock) {
    safeEndSocket(premData.sock)
  }

  prems.delete(premNumber)
  firstConnection.delete(premNumber)
  reconectando.delete(premNumber)

  if (reconnectTimer.get(premNumber)) {
    clearTimeout(reconnectTimer.get(premNumber))
    reconnectTimer.delete(premNumber)
  }

  const sessionPath = path.join(process.cwd(), "Sessions", "Prems", premNumber)
  const configDir = path.join(process.cwd(), "subs", premNumber)

  safeRemoveDir(sessionPath)
  safeRemoveDir(configDir)

  console.log(chalk.yellow(`[ PREM-BOT ${premNumber} ] 🗑️ Eliminado`))
}

export {
  createPremBot,
  getPairingCode,
  getPrems,
  getPrem,
  removePrem,
  getConnectionStatus
}