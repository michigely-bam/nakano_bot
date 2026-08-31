import axios from "axios";
import FormData from "form-data";
import config from "../../config.js";
import { downloadMediaMessage } from "ourin";
import path from "path";
import fs from "fs";
import { f } from "../../src/lib/ourin-http.js";
import te from "../../src/lib/ourin-error.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-OurinMD";

const pluginConfig = {
  name: "faceswap",
  alias: ["fs", "swapface"],
  category: "ai",
  description: "Tukar wajah dari 2 gambar",
  usage: ".faceswap (kirim/reply 2 gambar)",
  example: ".faceswap",
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

const faceswapSessions = new Map();

let thumbAI = null;
try {
  const p = path.join(process.cwd(), "assets/images/ourin-ai.jpg");
  if (fs.existsSync(p)) thumbAI = fs.readFileSync(p);
} catch {}

function getContextInfo(title, body) {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";

  const ctx = {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };

  if (thumbAI) {
    ctx.externalAdReply = {
      title,
      body,
      thumbnail: thumbAI,
      mediaType: 1,
      renderLargerThumbnail: false,
      sourceUrl: config.saluran?.link || "",
    };
  }

  return ctx;
}

async function uploadTo0x0(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: "application/octet-stream",
  });

  const res = await axios.post(
    "https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk",
    form,
    {
      headers: form.getHeaders(),
      timeout: 30000,
    },
  );

  if (!res.data?.status ? res.data.path : "") throw new Error("Upload gagal");
  return res.data;
}

async function handler(m, { sock }) {
  const session = faceswapSessions.get(m.sender);

  let imageBuffer = null;

  if (m.quoted?.message) {
    const quotedType = Object.keys(m.quoted.message)[0];
    if (quotedType === "imageMessage" || m.quoted.message?.imageMessage) {
      try {
        imageBuffer = await downloadMediaMessage(
          { key: m.quoted.key, message: m.quoted.message },
          "buffer",
          {},
        );
      } catch {}
    }
  }

  if (!imageBuffer && m.message) {
    const msgType = Object.keys(m.message)[0];
    if (msgType === "imageMessage" || m.message?.imageMessage) {
      try {
        imageBuffer = await m.download();
      } catch {}
    }
  }

  if (!session) {
    if (!imageBuffer) {
      return m.reply(
        `🔄 *ꜰᴀᴄᴇsᴡᴀᴘ*\n\n` +
          `> Tukar wajah dari 2 gambar\n\n` +
          `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
          `┃ 1. Kirim gambar pertama (wajah sumber)\n` +
          `┃ 2. Kirim gambar kedua (target)\n` +
          `╰┈┈┈┈┈┈┈┈⬡\n\n` +
          `> Kirim gambar pertama + caption \`${m.prefix}faceswap\``,
      );
    }

    await m.react("1️⃣");

    const sourceUrl = await uploadTo0x0(imageBuffer, "source.jpg");

    faceswapSessions.set(m.sender, {
      sourceUrl,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      faceswapSessions.delete(m.sender);
    }, 300000);

    return m.reply(
      `✅ *ɢᴀᴍʙᴀʀ 1 ᴅɪsɪᴍᴘᴀɴ*\n\n` +
        `> Sekarang kirim gambar kedua (target)\n` +
        `> dengan caption \`${m.prefix}faceswap\`\n\n` +
        `> ⏱️ Session berlaku 5 menit`,
    );
  }

  if (!imageBuffer) {
    return m.reply(
      `⚠️ *ᴋɪʀɪᴍ ɢᴀᴍʙᴀʀ ᴋᴇᴅᴜᴀ*\n\n` +
        `> Kirim gambar kedua (target) + caption \`${m.prefix}faceswap\``,
    );
  }

  await m.react("2️⃣");

  try {
    const targetUrl = await uploadTo0x0(imageBuffer, "target.jpg");

    await m.reply("🔄 *ᴍᴇᴍᴘʀᴏsᴇs...*\n\n> Menukar wajah, tunggu sebentar...");

    const apiUrl = `https://api.neoxr.eu/api/faceswap?source=${encodeURIComponent(session.sourceUrl)}&target=${encodeURIComponent(targetUrl)}&apikey=${NEOXR_APIKEY}`;

    const data = await f(apiUrl);

    faceswapSessions.delete(m.sender);

    if (!data?.status || !data?.data?.url) {
      m.react("❌");
      return m.reply("❌ *ɢᴀɢᴀʟ*\n\n> API tidak merespon atau error");
    }

    await sock.sendMedia(m.chat, data.data.url, null, m, {
      type: "image",
    });

    m.react("✅");
  } catch (error) {
    faceswapSessions.delete(m.sender);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
