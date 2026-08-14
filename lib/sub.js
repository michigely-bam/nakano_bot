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

const subs = new Map()
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

async function createSubBot(number, ownerNumber) {
  const subNumber = cleanNumber(number)
  const sessionPath = path.join(process.cwd(), "Sessions", "Subs", subNumber)
  const configPath = path.join(process.cwd(), "subs", subNumber, "config.js")
  const configDir = path.join(process.cwd(), "subs", subNumber)

  const existingSub = subs.get(subNumber)

  if (existingSub?.sock?.user && !reconectando.get(subNumber)) {
    console.log(chalk.yellow(`[ SUB-BOT ${subNumber} ] ⚠️ Ya está conectado, omitiendo...`))
    return existingSub.sock
  }

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true })
    console.log(chalk.cyan(`[ SUB-BOT ${subNumber} ] 📁 Carpeta Sessions creada`))
  }

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
    console.log(chalk.cyan(`[ SUB-BOT ${subNumber} ] 📁 Carpeta subs creada`))
  }

  if (!fs.existsSync(configPath)) {
    const subConfig = `export default {
  nombre: 'Chocola',
  nombre2: '🎀 Chocola sub V1',
  prefix: '.',
  banner: 'https://h.uguu.se/BNjdamYS.jpeg',
  owner: ['5492644156919', '542646762285', '5219992042946'],
  version: '1.0.4',
  tipo: '🎀 sub-bot',
  creador: '—͟͞ ⁱᵃᵐ Cuerbito 𒆜ᴼᶠⁱᶜⁱᵃˡ',
  canalId: '120363409173174836@newsletter',
  canalNombre: '🎀 CHOCOLA NEKO SUB',
  subBot: true,
  mainNumber: '${subNumber}',
  botowner: '${ownerNumber || subNumber}'
}`

    fs.writeFileSync(configPath, subConfig.trim())
    console.log(chalk.green(`[ SUB-BOT ${subNumber} ] 📄 Config creada`))
  } else {
    console.log(chalk.gray(`[ SUB-BOT ${subNumber} ] 📄 Config ya existe`))
  }

  let botConfig

  try {
    const configModule = await import(`file://${configPath}?update=${Date.now()}`)
    botConfig = configModule.default
  } catch (e) {
    botConfig = {
      nombre: "GALAXIT",
      nombre2: "GALAXIT BOT OFC V1",
      prefix: ".",
      banner: "https://files.catbox.moe/41qoci.jpg",
      version: "1.0.3",
      tipo: "sub-bot",
      subBot: true,
      mainNumber: subNumber,
      owner: ["5492644156919"],
      botowner: ownerNumber || subNumber,
      canalId: "120363409173174836@newsletter",
      canalNombre: "GALAXIT BOT OFC ",
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

  // Establecer propiedades del sub-bot
  sock.isSubBot = true
  sock.isPremiumBot = false
  sock.isMainBot = false
  sock.sessionType = 'sub'
  sock.subNumber = subNumber

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

  reconectando.delete(subNumber)

  if (reconnectTimer.get(subNumber)) {
    clearTimeout(reconnectTimer.get(subNumber))
    reconnectTimer.delete(subNumber)
  }

  subs.set(subNumber, {
    sock,
    ownerNumber,
    config: botConfig
  })

  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds()
    } catch (e) {}

    if (!firstConnection.has(subNumber)) {
      firstConnection.add(subNumber)
      console.log(chalk.green(`[ SUB-BOT ${subNumber} ] ✅ Credenciales guardadas`))
    }
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update
    const statusCode = lastDisconnect?.error?.output?.statusCode || 0

    if (connection === "open") {
      reconectando.delete(subNumber)

      if (reconnectTimer.get(subNumber)) {
        clearTimeout(reconnectTimer.get(subNumber))
        reconnectTimer.delete(subNumber)
      }

      console.log(chalk.green.bold(`[ SUB-BOT ${subNumber} ] ✅ Conectado como: ${botConfig.nombre || botConfig.name}`))
      console.log(chalk.cyan(`[ SUB-BOT ${subNumber} ] 📌 Prefijo: ${botConfig.prefix}`))
      console.log(chalk.cyan(`[ SUB-BOT ${subNumber} ] 📌 Tipo: ${botConfig.tipo || "sub-bot"}`))

      // Registrar en globales
      if (!global.conns) global.conns = []
      const exists = global.conns.some(b => b.user?.id === sock.user?.id)
      if (!exists) {
        global.conns.push(sock)
        console.log(chalk.green(`[ SUB-BOT ${subNumber} ] 📌 Registrado en global.conns`))
      }

      return
    }

    if (connection === "close") {
      if (reconectando.get(subNumber) || reconnectTimer.get(subNumber)) {
        return
      }

      if (
        statusCode === DisconnectReason.loggedOut ||
        statusCode === 401 ||
        statusCode === 403
      ) {
        console.log(chalk.red(`[ SUB-BOT ${subNumber} ] ❌ Sesión inválida o cerrada, eliminando...`))

        const currentSub = subs.get(subNumber)
        safeEndSocket(currentSub?.sock)

        // Eliminar de globales
        if (global.conns) {
          global.conns = global.conns.filter(b => b.user?.id !== sock.user?.id)
        }

        subs.delete(subNumber)
        firstConnection.delete(subNumber)
        reconectando.delete(subNumber)

        if (reconnectTimer.get(subNumber)) {
          clearTimeout(reconnectTimer.get(subNumber))
          reconnectTimer.delete(subNumber)
        }

        safeRemoveDir(sessionPath)
        safeRemoveDir(configDir)

        return
      }

      if (
        statusCode === DisconnectReason.connectionReplaced ||
        statusCode === 440
      ) {
        console.log(chalk.yellow(`[ SUB-BOT ${subNumber} ] ⚠️ Conexión reemplazada por otra sesión (${statusCode})`))

        const currentSub = subs.get(subNumber)
        safeEndSocket(currentSub?.sock)

        // Eliminar de globales
        if (global.conns) {
          global.conns = global.conns.filter(b => b.user?.id !== sock.user?.id)
        }

        subs.delete(subNumber)
        reconectando.delete(subNumber)

        return
      }

      reconectando.set(subNumber, true)

      const isRestartRequired =
        statusCode === DisconnectReason.restartRequired ||
        statusCode === 515

      const delay = isRestartRequired ? 1000 : 5000

      if (isRestartRequired) {
        console.log(chalk.yellow(`[ SUB-BOT ${subNumber} ] 🔁 Reinicio requerido por WhatsApp (${statusCode})`))
      } else {
        console.log(chalk.yellow(`[ SUB-BOT ${subNumber} ] 🔄 Reconectando... (${statusCode})`))
      }

      const timer = setTimeout(async () => {
        try {
          const currentSub = subs.get(subNumber)

          if (currentSub?.sock) {
            safeEndSocket(currentSub.sock)
          }

          // Eliminar de globales
          if (global.conns) {
            global.conns = global.conns.filter(b => b.user?.id !== sock.user?.id)
          }

          subs.delete(subNumber)

          console.log(chalk.cyan(`[ SUB-BOT ${subNumber} ] 🔌 Creando nuevo socket...`))
          await createSubBot(subNumber, ownerNumber)
        } catch (err) {
          console.log(chalk.red(`[ SUB-BOT ${subNumber} ] ❌ Error reconectando: ${err.message}`))
        } finally {
          reconectando.delete(subNumber)
          reconnectTimer.delete(subNumber)
        }
      }, delay)

      reconnectTimer.set(subNumber, timer)
    }
  })

  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const msg = chatUpdate.messages?.[0]

      if (!msg?.message) return
      if (msg.key?.remoteJid === "status@broadcast") return

      const subPlugins = new Map()
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
              subPlugins.set(pluginData.name.toLowerCase(), pluginData)

              if (Array.isArray(pluginData.alias)) {
                for (const alias of pluginData.alias) {
                  subPlugins.set(String(alias).toLowerCase(), pluginData)
                }
              }
            }
          } catch (err) {}
        }
      }

      await handler(sock, msg, subPlugins, botConfig)
    } catch (err) {}
  })

  return sock
}

async function getPairingCode(number) {
  const subNumber = cleanNumber(number)

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
        number: subNumber
      })
    }, 60000)

    async function requestCode() {
      if (resolved || codeRequested || !sock) return

      if (sock.user || sock.authState?.creds?.registered) {
        finish({
          status: "connected",
          code: null,
          number: subNumber
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
            number: subNumber
          })
          return
        }

        const code = await sock.requestPairingCode(subNumber)
        const formattedCode = code.match(/.{1,4}/g)?.join("-") || code

        console.log(chalk.cyan(`[ SUB-BOT ${subNumber} ] 🔑 Código: ${formattedCode}`))

        finish({
          status: "pending",
          code: formattedCode,
          number: subNumber
        })
      } catch (err) {
        console.log(chalk.red(`[ SUB-BOT ${subNumber} ] ❌ Error generando código: ${err.message}`))
        finish(err, true)
      }
    }

    try {
      sock = await createSubBot(subNumber, subNumber)

      if (sock.user || sock.authState?.creds?.registered) {
        finish({
          status: "connected",
          code: null,
          number: subNumber
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
            number: subNumber
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
      console.log(chalk.red(`[ SUB-BOT ${subNumber} ] ❌ Error: ${err.message}`))
      finish(err, true)
    }
  })
}

function getSubs() {
  return subs
}

function getSub(number) {
  return subs.get(cleanNumber(number))
}

function getConnectionStatus() {
  const subsArray = Array.from(subs.values())
  const active = subsArray.filter(sub => sub.sock?.user).length

  return {
    total: subs.size,
    active
  }
}

async function removeSub(number) {
  const subNumber = cleanNumber(number)
  const subData = subs.get(subNumber)

  if (subData?.sock) {
    safeEndSocket(subData.sock)
  }

  // Eliminar de globales
  if (global.conns && subData?.sock) {
    global.conns = global.conns.filter(b => b.user?.id !== subData.sock.user?.id)
  }

  subs.delete(subNumber)
  firstConnection.delete(subNumber)
  reconectando.delete(subNumber)

  if (reconnectTimer.get(subNumber)) {
    clearTimeout(reconnectTimer.get(subNumber))
    reconnectTimer.delete(subNumber)
  }

  const sessionPath = path.join(process.cwd(), "Sessions", "Subs", subNumber)
  const configDir = path.join(process.cwd(), "subs", subNumber)

  safeRemoveDir(sessionPath)
  safeRemoveDir(configDir)

  console.log(chalk.yellow(`[ SUB-BOT ${subNumber} ] 🗑️ Eliminado`))
}

export {
  createSubBot,
  getPairingCode,
  getSubs,
  getSub,
  removeSub,
  getConnectionStatus
}
