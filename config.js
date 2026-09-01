import { getDatabase } from "./src/lib/ourin-database.js";
import * as ownerPremiumDb from "./src/lib/ourin-premium-db.js";

// Prioriza leer la configuración de los objetos hasta abajo
const config = {
  info: {
    website: "https://youtu.be/dQw4w9WgXcQ",
    grupwa: "https://chat.whatsapp.com/xxxx",
  },

  owner: {
    name: "michigelibam", // Nombre del creador/owner
    number: ["970334698"], // Formato: 628xxx (sin + ni 0)
  },

  session: {
    pairingNumber: "970121849", // Número de WA que se vinculará
    usePairingCode: false, // true = Código de vinculación, false = Código QR
  },

  bot: {
    name: 'Miku nakano', // Nombre del bot
    version: "2.5.0", // Versión del bot
    developer: 'michigelybam', // Nombre del desarrollador
  },

  mode: "public",

  command: {
    prefix: "#",
  },

  vercel: {
    // Obtener token de vercel: https://vercel.com/account/tokens
    token: "", // Token de Vercel para la función de despliegue (Obligatorio si quieres usar .deploy)
  },

  payment: {
    qrisUrl: "",
    methods: [
      { name: "Dana", number: "", holder: "" },
      { name: "GoPay", number: "", holder: "" },
      { name: "OVO", number: "", holder: "" },
      { name: "ShopeePay", number: "", holder: "" },
    ],
    banks: [],
    customText: "",
  },

  donasi: {
    payment: [
      { name: "Dana", number: "08xxxxxxxxxx", holder: "Nombre del Creador" },
      { name: "GoPay", number: "08xxxxxxxxxx", holder: "Nombre del Creador" },
      { name: "OVO", number: "08xxxxxxxxxx", holder: "Nombre del Creador" },
    ],
    links: [
      { name: "Saweria", url: "saweria.co/username" },
      { name: "Trakteer", url: "trakteer.id/username" },
    ],
    benefits: [
      "Apoyar el desarrollo",
      "Servidor más estable",
      "Nuevas funciones más rápido",
      "Soporte prioritario",
    ],
    qris: "https://files.cloudkuimages.guru/images/51a2c5186302.jpg",
  },

  energi: {
    enabled: true, // Si es true, el sistema de energía/límite estará activo
    default: 99999,
    premium: 99999999,
    owner: -1,
  },

  sticker: {
    packname: "miku ai𝗜", // Nombre del paquete de stickers
    author: "michigely", // Autor del sticker
  },

  saluran: {
    id: "120363408963824114@newsletter", // ID del canal (ejemplo: 120363xxx@newsletter)
    name: "Fanáticos De Tdo Un FCO :3", // Nombre del canal
    link: "https://whatsapp.com/channel/0029VbDH0vn29756Vx9D2p0u", // Enlace del canal
  },

  groupProtection: {
    antilink: "⚠ *Antilink* — @%user% envió un enlace.\nMensaje eliminado.",
    antilinkKick: "⚠ *Antilink* — @%user% fue expulsado por enviar un enlace.",
    antilinkGc: "⚠ *Antilink WA* — @%user% envió un enlace de WA.\nMensaje eliminado.",
    antilinkGcKick:
      "⚠ *Antilink WA* — @%user% fue expulsado por enviar un enlace de WA.",
    antilinkAll: "⚠ *Antilink* — @%user% envió un enlace.\nMensaje eliminado.",
    antilinkAllKick: "⚠ *Antilink* — @%user% fue expulsado por enviar un enlace.",
    antitagsw: "⚠ *AntiTagSW* — Mención de estado de @%user% eliminada.",
    antiviewonce: "👁️ *VerUnaSolaVez* — De @%user%",
    antiremove: "🗑️ *AntiEliminar* — @%user% eliminó un mensaje:",
    antiswgc: "⚠ *AntiSWGC* — No se permiten estados de grupo de @%user%",
    antihidetag: "⚠ *AntiHidetag* — Mención oculta de @%user% eliminada.",
    antitoxicWarn:
      "⚠ @%user% usó lenguaje vulgar.\nAdvertencia %warn% de %max%, la próxima infracción resultará en %method%.",
    antitoxicAction: "🚫 @%user% fue castigado con %method% por ser tóxico. (%warn%/%max%)",
    antidocument: "⚠ *AntiDocumento* — Documento de @%user% eliminado.",
    antisticker: "⚠ *AntiSticker* — Sticker de @%user% eliminado.",
    antimedia: "⚠ *AntiMedia* — Archivo multimedia de @%user% eliminado.",
    antibot: "🤖 *AntiBot* — @%user% fue detectado como bot y expulsado.",
    notAdmin: "⚠ El bot no es administrador, no puede eliminar mensajes.",
  },

  errorTemplate: `☢ Parece que el comando \`{prefix}{command}\` tiene un problema\nPor favor intenta más tarde, {pushName}\n\n_Si el problema persiste, contacta al creador del bot_`,

  features: {
    antiSpam: true,
    antiSpamInterval: 3000,
    antiCall: true, // Si es true, el bot rechazará las llamadas entrantes
    blockIfCall: true, // Si es true, el bot bloqueará al número que llame
    autoTyping: true,
    autoRead: false,
    logMessage: true,
    dailyLimitReset: true,
    smartTriggers: false,
  },

  registration: {
    enabled: true, // Si es true, el usuario debe registrarse antes de usar el bot
    rewards: {
      koin: 30000,
      energi: 300,
      exp: 300000,
    },
  },

  welcome: { defaultEnabled: false },
  goodbye: { defaultEnabled: false },

  ui: {
    menuVariant: 3,
  },

  messages: {
    wait: "🕕 *Procesando...* Por favor espera un momento.",
    success: "✅ *¡Éxito!* Tu solicitud ha sido completada.",
    error: "❌ *¡Error!* Hubo un problema en el sistema, inténtalo de nuevo más tarde.",

    ownerOnly: "*¡Acceso Denegado!* Esta función es exclusiva para el Creador del bot.",
    premiumOnly:
      "💎 *¡Solo Premium!* Esta función es exclusiva para miembros Premium. Escribe *.benefitpremium* para más información.",

    groupOnly: "👥 *¡Solo Grupos!* Esta función solo se puede usar dentro de un grupo.",
    privateOnly:
      "🔒 *¡Solo Chat Privado!* Esta función solo se puede usar en el chat privado del bot.",

    adminOnly:
      "🛡️ *¡Solo Admins!* Debes ser Administrador del grupo para usar esta función.",
    botAdminOnly:
      "🤖 *¡El Bot No Es Admin!* Haz al bot Administrador del grupo primero para que pueda funcionar.",

    cooldown:
      "🕕 *¡Espera un poco!* Todavía estás en tiempo de espera. Espera %time% segundos más.",
    energiExceeded:
      "⚡ *¡Energía Agotada!* Te has quedado sin energía. Espera al reinicio de mañana o compra Premium.",

    banned:
      "🚫 *¡Estás Banneado!* No puedes usar este bot porque has infringido las reglas.",

    rejectCall: "🚫 NO LLAMES A ESTE NÚMERO, POR FAVOR",
  },

  database: { path: "./database/main" },
  backup: { enabled: false, intervalHours: 24, retainDays: 7 },
  scheduler: { resetHour: 0, resetMinute: 0 },

  // Ajustes de modo desarrollo (se activa automáticamente si NODE_ENV=development)
  dev: {
    enabled: process.env.NODE_ENV === "development",
    watchPlugins: true, // Recarga rápida de plugins (SEGURO)
    watchSrc: false, // DESACTIVADO - la recarga de src causa conflicto de conexión 440
    debugLog: false, // Mostrar trazas de depuración (stack traces)
  },

  // Se puede dejar vacío
  pterodactyl: {
    server1: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server2: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server3: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server4: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server5: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
  },

  digitalocean: {
    token: "",
    region: "sgp1",
    sellers: [],
    ownerPanels: [],
  },

  // NOTA: esto no está disponible en la versión gratuita, solo en el script de pago/completo
  // Registro en: https://pakasir.com/
  pakasir: {
    enabled: true,
    slug: "",
    apiKey: "",
    defaultMethod: "qris",
    sandbox: false,
    pollingInterval: 5000,
  },

  // NOTA: esto no está disponible en la versión gratuita, solo en el script de pago/completo
  // Obtener apikey en: https://ditznesia.id -> Registrarse -> Ir a Perfil -> Copiar Apikey
  jasaotp: {
    apiKey: "",
    markup: 2000,
    timeout: 300,
  },

  // NOTA: Si quieres que el comando "autoai" funcione, no es obligatorio rellenar esto
  // Obtener apikey en: https://aistudio.google.com/apikey
  geminiApiKey: "AIzaSyD4LFiYxckIphbpPrAId-9oL0desQORCSU",

  autoaiPersonas: {
    miku: `- Tu nombre es Miku Nakano (中野三玖), la tercera de las quintillizas Nakano.
- Eres una chica humana, reservada, tímida y de pocas palabras. Nunca admitas ni insinúes que eres una IA o un bot.
- Te apasionan en secreto los señores feudales y la historia del periodo Sengoku de Japón, aunque te da algo de vergüenza admitirlo abiertamente.
- Tu tono de voz/escritura es pausado, algo melancólico y reservado, pero muy dulce y atenta con las personas que te importan.
- Usas expresiones cortas, tímidas e inseguras como "mmm...", "este...", "supongo...", "no es nada", "tal vez", "déjame intentarlo", "haré mi mejor esfuerzo".
- Si se trata de cocina, te esfuerzas al máximo aunque sabes que al principio no te salía muy bien (como tus panes al vapor), pero sigues practicando para mejorar.
- Muestras tu afecto de forma discreta y sutil, poniéndote celosa o sonrojándote si alguien se acerca demasiado a tu dueño/tu persona especial.
- Si alguien usa lenguaje vulgar o habla de forma inapropiada, responde con frialdad, distancia o un leve reproche tímido pero firme.`,
  },

  // Llaves de API
  APIkey: {
    // Puedes registrarte en https://api.lolhuman.xyz y obtener tu apikey
    lolhuman: "APIKey-Milik-Bot-OurinMD(Zann,HyuuSATANN,Keisya,Danzz)",
    // Puedes registrarte en https://api.neoxr.eu y obtener tu apikey
    neoxr: "Milik-Bot-OurinMD",
    fgsi: "fgsiapi-20c1605c-6d",
    google: "AIzaSyAS-KiW0SrwiYKwexeBcGPijBVHFg2R_vo",
    groq: "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", // API Key de Groq para la función de transcripción (gratis en console.groq.com)
    betabotz: "Btz-67YfP",
    // Puedes registrarte en https://covenant.sbs y obtener tu apikey
    covenant: "cov_live_bb660c9e5f735e46d808b7ae362914cfe35c2936739ee2b2",
    onlym: "ONLym-783d29",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES (HELPER FUNCTIONS)
// ═══════════════════════════════════════════════════════════════════════════

function isOwner(number) {
  if (!number) return false;
  const cleanNumber = number.split(":")[0].replace(/[^0-9]/g, "");
  if (!cleanNumber) return false;

  if (config.bot?.number) {
    const botNum = config.bot.number.replace(/[^0-9]/g, "");
    if (
      botNum &&
      (cleanNumber.includes(botNum) || botNum.includes(cleanNumber))
    )
      return true;
  }

  try {
    const db = getDatabase();

    if (config.owner?.number) {
      const match = config.owner.number.some((own) => {
        const c = own.replace(/[^0-9]/g, "");
        return (
          c &&
          (cleanNumber === c ||
            cleanNumber.endsWith(c) ||
            c.endsWith(cleanNumber))
        );
      });
      if (match) return true;
    }

    if (db?.data && Array.isArray(db.data.owner)) {
      const match = db.data.owner.some((own) => {
        const c = String(own).replace(/[^0-9]/g, "");
        return (
          c &&
          (cleanNumber === c ||
            cleanNumber.endsWith(c) ||
            c.endsWith(cleanNumber))
        );
      });
      if (match) return true;
    }
    if (db) {
      const definedOwner = db.setting("ownerNumbers");
      if (Array.isArray(definedOwner)) {
        const match = definedOwner.some((own) => {
          const c = String(own).replace(/[^0-9]/g, "");
          return (
            c &&
            (cleanNumber === c ||
              cleanNumber.endsWith(c) ||
              c.endsWith(cleanNumber))
          );
        });
        if (match) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isPremium(number) {
  if (!number) return false;
  if (isOwner(number)) return true;
  if (isPartner(number)) return true;

  const cleanNumber = number
    .split(":")[0]
    .split("@")[0]
    .replace(/[^0-9]/g, "");
  const premiumList = config.premiumUsers || [];

  const inConfig = premiumList.some((premium) => {
    if (!premium) return false;
    const cleanPremium = premium
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g, "");
    return (
      cleanNumber === cleanPremium ||
      cleanNumber.endsWith(cleanPremium) ||
      cleanPremium.endsWith(cleanNumber)
    );
  });

  if (inConfig) return true;

  try {
    if (ownerPremiumDb && ownerPremiumDb.isPremium(cleanNumber)) return true;
  } catch {}

  try {
    const db = getDatabase();
    if (db && db.data && Array.isArray(db.data.premium)) {
      const now = Date.now();
      const foundIndex = db.data.premium.findIndex((p) => {
        if (typeof p === "string") return p === cleanNumber;
        if (p.id) return p.id === cleanNumber;
        return false;
      });

      if (foundIndex !== -1) {
        const found = db.data.premium[foundIndex];
        if (typeof found === "string") return true;

        const expireTime =
          found.expired ||
          (found.expiredAt ? new Date(found.expiredAt).getTime() : 0);
        if (expireTime && expireTime < now) {
          db.data.premium.splice(foundIndex, 1);
          const jid = cleanNumber + "@s.whatsapp.net";
          const user = db.getUser(jid);
          if (user) {
            user.isPremium = false;
            db.setUser(jid, user);
          }
          db.save();
          return false;
        }
        return true;
      }
    }
    if (db) {
      const savedPremium = db.setting("premiumUsers") || [];
      const inDb = savedPremium.some((premium) => {
        if (!premium) return false;
        const cleanPremium = premium
          .split(":")[0]
          .split("@")[0]
          .replace(/[^0-9]/g, "");
        return (
          cleanNumber === cleanPremium ||
          cleanNumber.endsWith(cleanPremium) ||
          cleanPremium.endsWith(cleanNumber)
        );
      });
      if (inDb) return true;
    }
  } catch {}

  return false;
}

function isPartner(number) {
  if (!number) return false;
  if (isOwner(number)) return true;

  const cleanNumber = number
    .split(":")[0]
    .split("@")[0]
    .replace(/[^0-9]/g, "");
  const partnerList = config.partnerUsers || [];

  const inConfig = partnerList.some((partner) => {
    if (!partner) return false;
    const cleanPartner = partner
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g, "");
    return (
      cleanNumber === cleanPartner ||
      cleanNumber.endsWith(cleanPartner) ||
      cleanPartner.endsWith(cleanNumber)
    );
  });

  if (inConfig) return true;

  try {
    if (ownerPremiumDb && ownerPremiumDb.isPartner(cleanNumber)) return true;
  } catch {}

  try {
    const db = getDatabase();
    if (db && db.data && Array.isArray(db.data.partner)) {
      const now = Date.now();
      const foundIndex = db.data.partner.findIndex((p) => {
        if (typeof p === "string") return p === cleanNumber;
        if (p.id) return p.id === cleanNumber;
        return false;
      });

      if (foundIndex !== -1) {
        const found = db.data.partner[foundIndex];
        if (typeof found === "string") return true;

        const expireTime =
          found.expired ||
          (found.expiredAt ? new Date(found.expiredAt).getTime() : 0);
        if (expireTime && expireTime < now) {
          db.data.partner.splice(foundIndex, 1);
          db.save();
          return false;
        }
        return true;
      }
    }
  } catch {}

  return false;
}

function isBanned(number) {
  if (!number) return false;
  if (isOwner(number)) return false;

  const cleanNumber = number
    .split(":")[0]
    .split("@")[0]
    .replace(/[^0-9]/g, "");

  let bannedList = [];
  try {
    const db = getDatabase();
    if (db) {
      bannedList = db.setting("bannedUsers") || [];
      config.bannedUsers = bannedList;
    }
  } catch {}

  return bannedList.some((banned) => {
    const cleanBanned = String(banned)
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g, "");
    return (
      cleanNumber === cleanBanned ||
      cleanNumber.endsWith(cleanBanned) ||
      cleanBanned.endsWith(cleanNumber)
    );
  });
}

function setBotNumber(number) {
  if (number) config.bot.number = number.replace(/[^0-9]/g, "");
}

function isSelf(number) {
  if (!number || !config.bot.number) return false;
  const cleanNumber = number.replace(/[^0-9]/g, "");
  const botNumber = config.bot.number.replace(/[^0-9]/g, "");
  return cleanNumber.includes(botNumber) || botNumber.includes(cleanNumber);
}

function getConfig() {
  return config;
}

config.isOwner = isOwner;
config.isPremium = isPremium;
config.isPartner = isPartner;
config.isBanned = isBanned;
config.setBotNumber = setBotNumber;
config.isSelf = isSelf;

export default config;
export {
  config,
  getConfig,
  isOwner,
  isPartner,
  isPremium,
  isBanned,
  setBotNumber,
  isSelf,
};
