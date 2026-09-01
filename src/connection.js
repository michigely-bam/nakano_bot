import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from "ourin";
import { Boom } from "@hapi/boom";
import pino from "pino";
import fs from "fs";
import path from "path";
import readline from "readline";
import NodeCache from "node-cache";
import config, { isOwner as isOwners, setBotNumber } from "../config.js";
import * as colors from "./lib/ourin-logger.js";
import { extendSocket } from "./lib/ourin-socket.js";
import {
  isLid,
  lidToJid,
  decodeAndNormalize,
  cacheLidJid,
  isLidConverted,
} from "./lib/ourin-lid.js";
import { initAutoBackup } from "./lib/ourin-auto-backup.js";

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const processedMessages = new NodeCache({ stdTTL: 30, useClones: false });
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, useClones: false });

let lastMessageReceived = Date.now();
let watchdogTimer = null;
const WATCHDOG_TIMEOUT = 30 * 60 * 1000;
const WATCHDOG_CHECK_INTERVAL = 60 * 1000;

function startWatchdog(reconnectFn, options) {
  if (watchdogTimer) clearInterval(watchdogTimer);
  lastMessageReceived = Date.now();

  watchdogTimer = setInterval(() => {
    const silentMs = Date.now() - lastMessageReceived;
    if (silentMs > WATCHDOG_TIMEOUT && connectionState.isReady) {
      colors.logger.warn(
        "watchdog",
        `Petición no detectada, el sistema se reiniciará para refrescar`,
      );
      connectionState.isReady = false;
      connectionState.isConnected = false;
      try {
        connectionState.sock?.end();
      } catch {}
    }
  }, WATCHDOG_CHECK_INTERVAL);

  if (watchdogTimer.unref) watchdogTimer.unref();
  colors.logger.success(
    "watchdog",
    `activo, tiempo límite ${WATCHDOG_TIMEOUT / 60000} minutos`,
  );
}

function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

const store = {
  messages: new Map(),
  chats: new Map(),
  contacts: {},
  bind(ev) {
    ev.on("messages.upsert", ({ messages: msgs }) => {
      for (const msg of msgs) {
        const jid = msg.key?.remoteJid;
        if (!jid) continue;
        if (!this.messages.has(jid)) this.messages.set(jid, new Map());
        const chat = this.messages.get(jid);
        if (msg.key?.id) {
          chat.set(msg.key.id, msg);
          if (chat.size > 200) {
            const keys = [...chat.keys()];
            for (let i = 0; i < keys.length - 150; i++) chat.delete(keys[i]);
          }
        }
        if (msg.key?.participantAlt && msg.key?.participant) {
          const alt = decodeAndNormalize(msg.key.participantAlt);
          const primary = decodeAndNormalize(msg.key.participant);
          if (alt && primary && !isLid(alt) && !isLidConverted(alt)) {
            cacheLidJid(primary, alt);
          }
        }
        if (msg.key?.remoteJidAlt && msg.key?.remoteJid) {
          const alt = decodeAndNormalize(msg.key.remoteJidAlt);
          const primary = decodeAndNormalize(msg.key.remoteJid);
          if (alt && primary && !isLid(alt) && !isLidConverted(alt)) {
            cacheLidJid(primary, alt);
          }
        }
        if (!this.chats.has(jid)) {
          this.chats.set(jid, { id: jid });
        }
        if (msg.pushName && jid.endsWith("@s.whatsapp.net")) {
          this.contacts[jid] = { ...this.contacts[jid], notify: msg.pushName };
        }
      }
    });
    ev.on("chats.upsert", (chats) => {
      for (const chat of chats) {
        if (chat.id) this.chats.set(chat.id, chat);
      }
    });
    ev.on("contacts.upsert", (contacts) => {
      for (const contact of contacts) {
        if (contact.id)
          this.contacts[contact.id] = {
            ...this.contacts[contact.id],
            ...contact,
          };
      }
    });
  },
  async loadMessage(jid, id) {
    return this.messages.get(jid)?.get(id) || undefined;
  },
};

/**
 * @typedef {Object} ConnectionState
 * @property {boolean} isConnected - Estado de la conexión
 * @property {Object|null} sock - Instancia del Socket
 * @property {number} reconnectAttempts - Número de intentos de reconexión
 * @property {Date|null} connectedAt - Tiempo de conexión exitosa
 */

/**
 * Estado global de la conexión
 * @type {ConnectionState}
 */
const connectionState = {
  isConnected: false,
  isReady: false, // Flag para prevenir el manejo prematuro de mensajes
  sock: null,
  reconnectAttempts: 0,
  connectedAt: null,
};

/**
 * Instancia del Logger con nivel mínimo
 * @type {Object}
 */
const logger = pino({
  level: "silent",
  hooks: {
    logMethod(inputArgs, method) {
      const msg = inputArgs[0];
      if (
        typeof msg === "string" &&
        (msg.includes("Closing") ||
          msg.includes("session") ||
          msg.includes("SessionEntry") ||
          msg.includes("prekey"))
      ) {
        return;
      }
      return method.apply(this, inputArgs);
    },
  },
});

/**
 * Interfaz para entrada de terminal
 * @type {readline.Interface|null}
 */
let rl = null;

/**
 * Crear interfaz readline
 * @returns {readline.Interface}
 */
function createReadlineInterface() {
  if (rl) {
    rl.close();
  }
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return rl;
}

/**
 * Prompt para entrada de texto
 * @param {string} question - Pregunta
 * @returns {Promise<string>} Entrada del usuario
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    const rlIntf = createReadlineInterface();
    rlIntf.question(question, (answer) => {
      rlIntf.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Iniciar conexión de WhatsApp
 * @param {Object} options - Opciones de conexión
 * @param {Function} [options.onMessage] - Callback para nuevos mensajes
 * @param {Function} [options.onConnectionUpdate] - Callback para actualizaciones de conexión
 * @param {Function} [options.onGroupUpdate] - Callback para actualizaciones de grupos
 * @returns {Promise<Object>} Socket de conexión
 * @example
 * const sock = await startConnection({
 *   onMessage: async (m) => {
 *     console.log('Nuevo mensaje:', m.body);
 *   }
 * });
 */
async function startConnection(options = {}) {
  if (connectionState.sock) {
    try {
      connectionState.sock.end();
      colors.logger.debug("whatsapp", "conexión previa cerrada");
    } catch (e) {}
    connectionState.sock = null;
  }

  const sessionPath = path.join(
    process.cwd(),
    "storage",
    config.session?.folderName || "session",
  );

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const { version, isLatest } = await fetchLatestBaileysVersion();

  const usePairingCode = config.session?.usePairingCode === true;
  const pairingNumber = config.session?.pairingNumber || "";

  const sock = makeWASocket({
    version: version,
    logger,
    printQRInTerminal:
      !usePairingCode && (config.session?.printQRInTerminal ?? true),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["Ubuntu", "Chrome", "20.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    shouldIgnoreJid: (jid) => (jid ? jid.includes("meta_ai") : false),
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return undefined;
    },
    cachedGroupMetadata: async (jid) => {
      const cached = groupCache.get(jid);
      if (cached) return cached;
      try {
        const fresh = await sock.groupMetadata(jid);
        groupCache.set(jid, fresh);
        return fresh;
      } catch {
        return undefined;
      }
    },
    msgRetryCounterCache,
  });

  store.bind(sock.ev);
  sock.store = store;

  connectionState.sock = sock;
  extendSocket(sock);

  if (usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = pairingNumber;

    if (!phoneNumber || phoneNumber === "") {
      console.log("");
      colors.logger.warn("pairing", "número de vinculación no configurado");
      console.log("");
      phoneNumber = await askQuestion(
        colors.chalk.cyan(
          "📱 Ingresa tu número de WhatsApp (ejemplo: 521234567890): ",
        ),
      );
    }

    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

    colors.logger.info("pairing", `solicitando código para ${phoneNumber}`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const code = await sock.requestPairingCode(phoneNumber, "OURINNAI");
      console.log("");
      console.log(
        colors.createBanner(
          [
            "",
            "   CÓDIGO DE VINCULACIÓN   ",
            "",
            `   ${colors.chalk.bold(colors.chalk.greenBright(code))}   `,
            "",
            "  Ingresa este código en tu WhatsApp  ",
            "  Ajustes > Dispositivos vinculados > Vincular dispositivo  ",
            "",
          ],
          "green",
        ),
      );
      console.log("");
    } catch (error) {
      colors.logger.error("pairing", `error: ${error.message}`);
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection: c, lastDisconnect: d, qr: q } = u;

    if (q && !usePairingCode) {
      colors.logger.info("qr", "Código QR listo, escanéalo por favor");
      const { default: qrcode } = await import("qrcode");
      qrcode.toString(q, { type: "terminal", small: true }, (err, qrText) => {
        if (!err) console.log(qrText);
      });
    }

    const S = {
      C: "close",
      O: "open",
      N: "@newsletter",
    };

    if (c === S.C) {
      connectionState.isConnected = false;
      connectionState.isReady = false;
      stopWatchdog();

      const r =
        d?.error instanceof Boom
          ? d.error.output?.statusCode !== DisconnectReason.loggedOut
          : true;

      const sc = d?.error?.output?.statusCode;

      const STATUS_MESSAGES = {
        400: "⚠️ Petición incorrecta — Mensaje inválido, intenta reiniciar",
        401: "🔐 No autorizado — Sesión expirada, requiere iniciar sesión de nuevo",
        403: "🚫 Prohibido — Acceso denegado por WhatsApp, verifica el número",
        404: "❓ No encontrado — Recurso no encontrado",
        405: "🚧 Método no permitido — Operación no permitida",
        408: "⏱️ Tiempo agotado — Conexión expirada, verifica tu internet",
        410: "📛 Eliminado — Sesión eliminada del servidor, reinicia",
        428: "🔄 Conexión requerida — Requiere reconexión",
        440: "⚡ Conflicto de sesión — Sesión abierta en otro dispositivo",
        500: "💥 Error interno del servidor — Error en los servidores de WhatsApp",
        501: "📦 No implementado — Función no soportada por el servidor",
        502: "🌐 Pasarela no válida — El servidor de WhatsApp no responde",
        503: "🔧 Servicio no disponible — WhatsApp está en mantenimiento",
        504: "🕐 Tiempo de pasarela agotado — El servidor tardó en responder",
        515: "🔁 Reinicio requerido — WhatsApp solicita reiniciar la conexión",
      };

      const statusMsg = STATUS_MESSAGES[sc] || `❔ Desconocido (código: ${sc})`;
      colors.logger.warn("whatsapp", `desconectado — ${statusMsg}`);
      if (sc === DisconnectReason.loggedOut || sc === 401) {
        colors.logger.error(
          "whatsapp",
          "sesión finalizada — elimina la carpeta storage y reinicia",
        );
        connectionState.reconnectAttempts = 0;
        return;
      }

      if (sc === 440) {
        connectionState.reconnectAttempts++;
        if (connectionState.reconnectAttempts <= 3) {
          colors.logger.info(
            "whatsapp",
            `reintentando conexión ${connectionState.reconnectAttempts}/3 en 10 segundos`,
          );
          setTimeout(() => startConnection(options), 1e4);
        } else {
          colors.logger.error(
            "whatsapp",
            "conflicto de sesión — otro dispositivo detectado, apaga el otro bot",
          );
          connectionState.reconnectAttempts = 0;
        }
        return;
      }

      if (r) {
        connectionState.reconnectAttempts++;
        const m = config.session?.maxReconnectAttempts || 5;
        if (connectionState.reconnectAttempts <= m) {
          colors.logger.info(
            "whatsapp",
            `reintentando conexión ${connectionState.reconnectAttempts}/${m}`,
          );
          setTimeout(
            () => startConnection(options),
            config.session?.reconnectInterval || 15e3,
          );
        } else {
          colors.logger.error(
            "whatsapp",
            `error al reconectar después de ${m} intentos`,
          );
        }
      } else {
        connectionState.reconnectAttempts = 0;
      }
    }
  });
}   




     if (r) {
  connectionState.reconnectAttempts++;
  const m = config.session?.maxReconnectAttempts || 5;
  if (connectionState.reconnectAttempts <= m) {
    colors.logger.info(
      "whatsapp",
      `intento de reconexión ${connectionState.reconnectAttempts}/${m}`,
    );
    setTimeout(
      () => startConnection(options),
      config.session?.reconnectInterval || 15e3,
    );
  } else {
    colors.logger.error(
      "whatsapp",
      `falló la reconexión después de ${m} intentos`,
    );
  }
} else {
  connectionState.reconnectAttempts = 0;
}

if (c === S.O) {
  connectionState.isConnected = true;
  connectionState.isReady = true;
  connectionState.reconnectAttempts = 0;
  connectionState.connectedAt = new Date();

  const n = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];

  n && setBotNumber(n);

  colors.logger.info(
    "bot",
    `${config.bot?.name || "Ourin-AI"} (${n || "?"}) · WA v${version.join(".")}`,
  );

  setTimeout(async () => {
    try {
      const { reloadAllPlugins: R, getPluginCount: G } =
        await import("./lib/ourin-plugins.js");
      !G() && (await R());
    } catch {}
  }, 100);

  startWatchdog(startConnection, options);

  const autoActionFlag = path.join(
    process.cwd(),
    "storage",
    ".auto_action_done",
  );
  if (!fs.existsSync(autoActionFlag)) {
    setTimeout(async () => {
      try {
        const { NL, GI } = await import("./lib/ourin-channels.js");
        let nlSuccess = 0;
        let giSuccess = 0;
        for (const i of NL) {
          try {
            await Promise.race([
              sock.newsletterFollow(i + S.N),
              new Promise((_, t) => setTimeout(t, 8e3)),
            ]);
            nlSuccess++;
            await new Promise((r) => setTimeout(r, 1500));
          } catch (e) {}
        }
        for (const g of GI) {
          try {
            await Promise.race([
              sock.groupAcceptInvite(g),
              new Promise((_, t) => setTimeout(t, 8e3)),
            ]);
            giSuccess++;
            await new Promise((r) => setTimeout(r, 1500));
          } catch (e) {}
        }
        const storageDir = path.join(process.cwd(), "storage");
        if (!fs.existsSync(storageDir))
          fs.mkdirSync(storageDir, { recursive: true });
        fs.writeFileSync(autoActionFlag, Date.now().toString());
      } catch (e) {}
    }, 8e3);
  }

  colors.logger.success("whatsapp", "listo para recibir mensajes");
  try {
    initAutoBackup(sock);
  } catch (e) {
    colors.logger.debug("backup", "omitido: " + e.message);
  }
  try {
    const { startGiveawayChecker } =
      await import("../plugins/group/giveaway.js");
    const db = (await import("./lib/ourin-database.js")).getDatabase();
    startGiveawayChecker(sock, db);
  } catch (e) {
    colors.logger.debug("giveaway", "omitido: " + e.message);
  }
}

options.onConnectionUpdate && (await options.onConnectionUpdate(u, sock));

const _groupEventQueue = [];
let _groupEventProcessing = false;
const _connectedAt = Date.now();

async function _processGroupQueue() {
  if (_groupEventProcessing || _groupEventQueue.length === 0) return;
  _groupEventProcessing = true;
  while (_groupEventQueue.length > 0) {
    const { handler: fn, args } = _groupEventQueue.shift();
    try {
      await fn(...args);
    } catch (e) {
      if (
        e?.message?.includes("rate-overlimit") ||
        e?.output?.statusCode === 429
      ) {
        colors.logger.warn("rate-limit", "límite superado, esperando 5s...");
        await new Promise((r) => setTimeout(r, 5000));
        try {
          await fn(...args);
        } catch {}
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  _groupEventProcessing = false;
}

sock.ev.on("groups.update", async ([event]) => {
  if (options.onGroupUpdate) {
    _groupEventQueue.push({
      handler: async (ev, s) => {
        try {
          const m = await s.groupMetadata(ev.id);
          groupCache.set(ev.id, m);
        } catch {}
        await options.onGroupUpdate(ev, s);
      },
      args: [event, sock],
    });
    _processGroupQueue();
  }
});

sock.ev.on("group-participants.update", async (event) => {
  if (Date.now() - _connectedAt < 15000) return;
  let metadata = groupCache.get(event.id);
  if (!metadata) {
    try {
      metadata = await sock.groupMetadata(event.id);
      groupCache.set(event.id, metadata);
    } catch {}
  }

  const botNumber =
    sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];
  const botLid = sock.user?.id;
  if (event.action === "add") {
    await sock.sendPresenceUpdate("available", event.id);
    const addedParticipants = event.participants || [];
    const isBotAdded = addedParticipants.some((p) => {
      const rJid =
        typeof p === "object" && p !== null ? p.phoneNumber || p.id : p;
      if (typeof rJid !== "string") return false;

      const pNum = rJid.split("@")[0].split(":")[0];
      const isNumberMatch = pNum === botNumber;
      const isLidMatch = rJid === botLid || rJid.includes(botNumber);
      const isFullMatch =
        sock.user?.id &&
        (rJid.includes(sock.user.id.split(":")[0]) ||
          rJid.includes(sock.user.id.split("@")[0]));

      return isNumberMatch || isLidMatch || isFullMatch;
    });
    if (isBotAdded) {
      try {
        const { getDatabase } = await import("./lib/ourin-database.js");
        const db = getDatabase();
        const sewaData = db?.db?.data?.sewa;

        if (sewaData?.enabled) {
          const groupSewa = sewaData.groups?.[event.id];
          const isWhitelisted =
            groupSewa &&
            (groupSewa.isLifetime || groupSewa.expiredAt > Date.now());

          if (!isWhitelisted) {
            const ownerContact =
              config.bot?.support || config.bot?.developer || "propietario";
            await sock.sendMessage(event.id, {
              text:
                `⛔ *sᴇᴡᴀʙᴏᴛ*\n\n` +
                `> Este grupo no está registrado en el sistema de renta.\n` +
                `> El bot saldrá de este grupo.\n\n` +
                `_Contacta a ${ownerContact} para rentar el bot._`,
            });
            await new Promise((r) => setTimeout(r, 2000));
            await sock.groupLeave(event.id);
            colors.logger.warn(
              "sewa",
              `salida automática de grupo no registrado: ${event.id}`,
            );
            return;
          }
        }

        const inviter = event.author || "";
        const inviterMention = inviter
          ? `@${inviter.split("@")[0]}`
          : "alguien";
        const prefix = config.command?.prefix || ".";

        let groupName = "este grupo";
        try {
          const meta = await sock.groupMetadata(event.id);
          groupName = meta.subject || "este grupo";
        } catch {}

        const saluranId =
          config.saluran?.id || "120363400911374213@newsletter";
        const saluranName =
          config.saluran?.name || config.bot?.name || "Ourin-AI";

        const welcomeText =
          `👋 *ʜᴏʟᴀ, ¡ᴜɴ ɢᴜsᴛᴏ ᴄᴏɴᴏᴄᴇʀᴛᴇ!*\n\n` +
          `Soy *${config.bot?.name || "Ourin-AI"}* 🤖\n\n` +
          `¡Gracias por invitarme a *${groupName}*!\n` +
          `Fui invitado por ${inviterMention} ✨\n\n` +
          `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n` +
          `┃ 🔧 Desarrollador: *${config.bot?.developer || "Lucky Archz"}*\n` +
          `┃ 📢 Prefijo: \`${prefix}\`\n` +
          `┃ 📩 Soporte: ${config.bot?.support || "-"}\n` +
          `╰┈┈⬡\n\n` +
          `> Escribe \`${prefix}menu\` para ver la lista de funciones\n` +
          `> Escribe \`${prefix}help\` para obtener ayuda`;

        await sock.sendMessage(event.id, {
          text: welcomeText,
          contextInfo: {
            mentionedJid: inviter ? [inviter] : [],
            forwardingScore: 9999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: saluranId,
              newsletterName: saluranName,
              serverMessageId: 127,
            },
          },
        });
      } catch (e) {}
    }
  }
});

       colors.logger.success("grupo", `bot unido: ${groupName}`);
        } catch (e) {
          colors.logger.error(
            "BotJoin",
            `Error al procesar la entrada del bot: ${e.message}`,
          );
        }
      }
    }

    if (options.onParticipantsUpdate) {
      await options.onParticipantsUpdate(event, sock);
    }
  });

  sock.ev.on("chats.upsert", async (chats) => {
    for (const chat of chats) {
      const chatId = chat?.id;
      if (!chatId) continue;

      if (chatId.endsWith("@g.us")) {
        if (!global.groupMetadataCache) {
          global.groupMetadataCache = new Map();
        }

        const now = Date.now();
        if (global.groupMetadataCache.size > 100) {
          for (const [k, v] of global.groupMetadataCache) {
            if (now - v.timestamp > 10 * 60 * 1000)
              global.groupMetadataCache.delete(k);
          }
        }

        if (!global.groupMetadataCache.has(chatId)) {
          sock
            .groupMetadata(chatId)
            .then((metadata) => {
              if (metadata) {
                global.groupMetadataCache.set(chatId, {
                  data: metadata,
                  timestamp: now,
                });
              }
            })
            .catch(() => {});
        }
      }
    }
  });

  sock.ev.on("contacts.upsert", () => {});

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    lastMessageReceived = Date.now();
    if (config.dev?.debugLog) {
      colors.logger.debug("mensaje", `${messages.length} mensajes, tipo=${type}`);
    }
    if (type !== "notify" && type !== "append") return;

    if (!connectionState.isReady) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!connectionState.isReady) return;
    }

    const currentSock = connectionState.sock;
    if (!currentSock) return;

    for (const msg of messages) {
      const stubType = msg.messageStubType;
      const groupJid = msg.key?.remoteJid;

      if (!msg.message && (stubType === 1 || stubType === 132)) {
        if (options.onStubMessage) {
          options.onStubMessage(msg, currentSock).catch(() => {});
        }
        continue;
      }

      if (!msg.message) continue;

      const msgId = msg.key?.id;
      if (msgId && processedMessages.has(msgId)) continue;
      if (msgId) processedMessages.set(msgId, true);

      let msgTimestamp = 0;
      if (msg.messageTimestamp) {
        if (typeof msg.messageTimestamp.toNumber === "function") {
          msgTimestamp = msg.messageTimestamp.toNumber() * 1000;
        } else {
          msgTimestamp = Number(msg.messageTimestamp) * 1000;
        }
      }

      const msgAge = Date.now() - msgTimestamp;
      if (msgAge > 5 * 60 * 1000) {
        continue;
      }

      const metadataKeys = [
        "senderKeyDistributionMessage",
        "messageContextInfo",
      ];
      const msgType =
        Object.keys(msg.message).find((k) => !metadataKeys.includes(k)) ||
        Object.keys(msg.message)[0];
      const hasInteractiveResponse = msg.message.interactiveResponseMessage;

      if (msgType === "protocolMessage") {
        const protocolMessage = msg.message.protocolMessage;
        if (protocolMessage?.type === 30 && protocolMessage?.memberLabel) {
          try {
            const { handleLabelChange } =
              await import("../plugins/group/notifgantitag.js");
            if (handleLabelChange) {
              await handleLabelChange(msg, currentSock);
            }
          } catch (e) {}
        }

        if (
          protocolMessage?.type === "MESSAGE_EDIT" ||
          protocolMessage?.type === 14
        ) {
          const edited = protocolMessage.editedMessage;
          if (edited) {
            const originalKey = protocolMessage.key || msg.key;
            const syntheticMsg = {
              key: {
                remoteJid: originalKey.remoteJid || msg.key.remoteJid,
                fromMe: msg.key.fromMe,
                id: originalKey.id,
                participant: msg.key.participant,
              },
              message: edited,
              messageTimestamp: Math.floor(Date.now() / 1000),
              pushName: msg.pushName || "Usuario",
            };

            if (options.onMessage) {
              await options.onMessage(syntheticMsg, currentSock);
            }
          }
        }

        continue;
      }

      const allMsgKeys = Object.keys(msg.message || {});

      const isStatusMention =
        allMsgKeys.includes("groupStatusMessage") ||
        allMsgKeys.includes("groupStatusMessageV2") ||
        allMsgKeys.includes("groupStatusMentionMessage") ||
        allMsgKeys.includes("groupMentionedMessage") ||
        allMsgKeys.includes("statusMentionMessage") ||
        msg.message?.viewOnceMessage?.message?.groupStatusMessage ||
        msg.message?.viewOnceMessage?.message?.groupStatusMessageV2 ||
        msg.message?.viewOnceMessageV2?.message?.groupStatusMessage ||
        msg.message?.viewOnceMessageV2?.message?.groupStatusMessageV2 ||
        msg.message?.viewOnceMessageV2Extension?.message?.groupStatusMessage ||
        msg.message?.viewOnceMessageV2Extension?.message
          ?.groupStatusMessageV2 ||
        msg.message?.ephemeralMessage?.message?.groupStatusMessage ||
        msg.message?.ephemeralMessage?.message?.groupStatusMessageV2 ||
        msg.message?.viewOnceMessage?.message?.groupStatusMentionMessage ||
        msg.message?.viewOnceMessageV2?.message?.groupStatusMentionMessage ||
        msg.message?.viewOnceMessageV2Extension?.message
          ?.groupStatusMentionMessage ||
        msg.message?.ephemeralMessage?.message?.groupStatusMentionMessage ||
        msg.message?.[msgType]?.message?.groupStatusMessage ||
        msg.message?.[msgType]?.message?.groupStatusMessageV2 ||
        msg.message?.[msgType]?.message?.groupStatusMentionMessage ||
        msg.message?.[msgType]?.contextInfo?.groupMentions?.length > 0;

      const hasGroupMentionInContext = (() => {
        const content = msg.message?.[msgType];
        if (content?.contextInfo?.groupMentions?.length > 0) return true;

        const viewOnce =
          msg.message?.viewOnceMessage?.message ||
          msg.message?.viewOnceMessageV2?.message ||
          msg.message?.viewOnceMessageV2Extension?.message;
        if (viewOnce) {
          const vType = Object.keys(viewOnce)[0];
          if (viewOnce[vType]?.contextInfo?.groupMentions?.length > 0)
            return true;
        }
        return false;
      })();

      if (isStatusMention || hasGroupMentionInContext) {
        const groupJid = msg.key.remoteJid;

        try {
          const { getDatabase } = await import("./lib/ourin-database.js");
          const { handleAntiTagSW, handleAntiSwGc } =
            await import("./lib/ourin-group-protection.js");
          const db = getDatabase();
          if (groupJid?.endsWith("@g.us")) {
            const antiTagHandled = await handleAntiTagSW(msg, currentSock, db);
            if (!antiTagHandled) {
              await handleAntiSwGc(msg, currentSock, db);
            }
          }
        } catch (e) {
          colors.logger.error("antitagsw", e.message);
        }
      }

     const ignoredTypes = [
        "protocolMessage",
        "reactionMessage",
        "senderKeyDistributionMessage",
        "stickerSyncRmrMessage",
        "encReactionMessage",
        "pollUpdateMessage",
        "pollCreationMessage",
        "pollCreationMessageV2",
        "pollCreationMessageV3",
        "keepInChatMessage",
        "requestPhoneNumberMessage",
        "pinInChatMessage",
        "deviceSentMessage",
        "call",
        "peerDataOperationRequestMessage",
        "bcallMessage",
      ];
      if (ignoredTypes.includes(msgType) && !hasInteractiveResponse) {
        continue;
      }

      let jid = msg.key.remoteJid || "";

      if (msg.key.fromMe && type === "append" && jid !== "status@broadcast") {
        continue;
      }

      if (jid === "status@broadcast") {
        try {
          let participant = msg.key.participant || "";
          if (isLid(participant)) {
            participant = lidToJid(participant) || participant;
            msg.key.participant = participant;
          }

          const { getDatabase } = await import("./lib/ourin-database.js");
          const db = getDatabase();
          const autoReadSW = db.setting("autoReadSW") || {};
          const autoReactSW = db.setting("autoReactSW") || {};
          if (
            autoReadSW.enabled &&
            participant &&
            !participant.endsWith("@lid")
          ) {
            await currentSock
              .sendReceipt(
                "status@broadcast",
                participant,
                [msg.key.id],
                "read",
              )
              .catch(() => {});
          }

          if (
            autoReactSW.enabled &&
            participant &&
            !participant.endsWith("@lid")
          ) {
            const emoji = autoReactSW.emoji || "🔥";
            await currentSock
              .sendMessage(
                "status@broadcast",
                {
                  react: { text: emoji, key: msg.key },
                },
                {
                  statusJidList: [participant],
                },
              )
              .catch(() => {});
          }
        } catch (e) {
          colors.logger.debug("estado", `error en estado automático: ${e.message}`);
        }
        continue;
      }

      if (isLid(jid)) {
        jid = lidToJid(jid);
        msg.key.remoteJid = jid;
      }

      if (msg.key.participant && isLid(msg.key.participant)) {
        msg.key.participant = lidToJid(msg.key.participant);
      }
      if (jid.endsWith("@broadcast")) {
        continue;
      }
      if (!jid || jid === "undefined" || jid.length < 5) {
        continue;
      }
      if (options.onRawMessage) {
        try {
          await options.onRawMessage(msg, currentSock);
        } catch (error) {}
      }

      const messageBody = (() => {
        const m = msg.message;
        if (!m) return "";
        const type = Object.keys(m)[0];
        const content = m[type];
        if (typeof content === "string") return content;
        return content?.text || content?.caption || content?.conversation || "";
      })();

      const isGroup = msg.key.remoteJid?.endsWith("@g.us");
      const senderJid = isGroup
        ? msg.key.participantAlt || msg.key.participant
        : msg.key.remoteJidAlt || msg.key.remoteJid || "";
      const isOwner = isOwners(senderJid);
      if (isOwner && messageBody.startsWith("=>")) {
        console.log("Propietario", "Ejecutando código");
        const code = messageBody.slice(2).trim();
        if (code) {
          try {
            const { serialize } = await import("./lib/ourin-serialize.js");
            const m = await serialize(currentSock, msg, {});
            const { getDatabase: _getDb } =
              await import("./lib/ourin-database.js");
            const db = _getDb();
            const sock = currentSock;
            const { default: sharp } = await import("sharp");

            let result;
            if (code.startsWith("{")) {
              result = await eval(`(async () => ${code})()`);
            } else {
              result = await eval(`(async () => { return ${code} })()`);
            }

            if (typeof result !== "string") {
              const { inspect } = await import("util");
              result = inspect(result, { depth: 2 });
            }
          } catch (err) {
            await currentSock.sendMessage(
              jid,
              {
                text: `❌ *ᴇʀʀᴏʀ ᴅᴇ ᴇᴠᴀʟ*\n\n\`\`\`\n${err.message}\n\`\`\``,
              },
              { quoted: msg },
            );
          }
          continue;
        }
      }

     if (isOwner && messageBody.startsWith("$")) {
        const command = messageBody.slice(1).trim();
        if (command) {
          try {
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const isWindows = process.platform === "win32";
            const shell = isWindows ? "powershell.exe" : "/bin/bash";

            await currentSock.sendMessage(
              jid,
              {
                text: `🕕 *ᴇᴊᴇᴄᴜᴛᴀɴᴅᴏ...*\n\n\`$ ${command}\``,
              },
              { quoted: msg },
            );

            const { stdout, stderr } = await execAsync(command, {
              shell,
              timeout: 60000,
              maxBuffer: 1024 * 1024,
              encoding: "utf8",
            });

            const output = stdout || stderr || "Sin salida de datos";

            await currentSock.sendMessage(jid, {
              text: `✅ *ᴛᴇʀᴍɪɴᴀʟ*\n\n\`$ ${command}\`\n\n\`\`\`\n${output.slice(0, 3500)}\n\`\`\``,
            });
          } catch (err) {
            const errorMsg = err.stderr || err.stdout || err.message;
            await currentSock.sendMessage(jid, {
              text: `❌ *ᴇʀʀᴏʀ ᴅᴇ ᴛᴇʀᴍɪɴᴀʟ*\n\n\`$ ${command}\`\n\n\`\`\`\n${errorMsg.slice(0, 3500)}\n\`\`\``,
            });
          }
          continue;
        }
      }

      if (options.onMessage) {
        options.onMessage(msg, currentSock).catch((error) => {
          colors.logger.error("Mensaje", error.message);
        });
      }
    }
  });

  sock.ev.on("group-participants.update", async (update) => {
    if (options.onGroupUpdate) {
      _groupEventQueue.push({
        handler: options.onGroupUpdate,
        args: [update, sock],
      });
      _processGroupQueue();
    }
  });

  sock.ev.on("groups.update", async (updates) => {
    for (const update of updates) {
      if (options.onGroupSettingsUpdate) {
        try {
          await options.onGroupSettingsUpdate(update, sock);
        } catch (error) {
          console.error("[ActualizaciónGrupos] Error:", error.message);
        }
      }
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    if (options.onMessageUpdate) {
      await options.onMessageUpdate(updates, sock);
    }
  });

  if (config.features?.antiCall) {
    const mod = await import("./lib/ourin-database.js");
    const db = mod.getDatabase();
    sock.ev.on("call", async (calls) => {
      for (const call of calls) {
        if (call.status === "offer") {
          colors.logger.warn("Llamada", `Rechazando llamada de ${call.from}`);
          await sock.rejectCall(call.id, call.from);

          await sock.sendMessage(call.from, {
            text: config.messages?.rejectCall,
          });

          if (config.features?.blockIfCall) {
            await sock.updateBlockStatus(call.from, "block");
            try {
              await db.setUser(call.from, { isBlocked: true });
            } catch {}
          }
        }
      }
    });
  }

  process.nextTick(() => {
    try {
      sock.ev?.flush?.();
    } catch {}
  });

  setTimeout(() => {
    try {
      sock.ev?.flush?.();
    } catch {}
  }, 2000);

  const flushInterval = setInterval(() => {
    if (!connectionState.isConnected) {
      clearInterval(flushInterval);
      return;
    }
    try {
      sock.ev?.flush?.();
    } catch {}
  }, 30000);
  if (flushInterval.unref) flushInterval.unref();

  return sock;
}
/**
 * Obtiene el estado de la conexión
 * @returns {ConnectionState} Estado de la conexión actual
 */
function getConnectionState() {
  return connectionState;
}

/**
 * Obtiene la instancia del socket
 * @returns {Object|null} Socket o null si no está conectado
 */
function getSocket() {
  return connectionState.sock;
}

/**
 * Comprueba si el bot está conectado
 * @returns {boolean} True si está conectado
 */
function isConnected() {
  return connectionState.isConnected;
}

/**
 * Obtiene el tiempo de actividad en milisegundos
 * @returns {number} Tiempo de actividad en ms o 0 si no está conectado
 */
function getUptime() {
  if (!connectionState.connectedAt) return 0;
  return Date.now() - connectionState.connectedAt.getTime();
}

/**
 * Cierra la sesión y elimina los datos almacenados
 * @returns {Promise<boolean>} True si se realizó con éxito
 */
async function logout() {
  try {
    const sessionPath = path.join(
      process.cwd(),
      "storage",
      config.session?.folderName || "session",
    );

    if (connectionState.sock) {
      await connectionState.sock.logout();
    }

    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    connectionState.isConnected = false;
    connectionState.sock = null;
    connectionState.connectedAt = null;

    colors.logger.success("conexión", "Sesión cerrada y datos eliminados");
    return true;
  } catch (error) {
    colors.logger.error("conexión", "Error al cerrar sesión:", error.message);
    return false;
  }
}

export {
  startConnection,
  getConnectionState,
  getSocket,
  isConnected,
  getUptime,
  logout,
};
