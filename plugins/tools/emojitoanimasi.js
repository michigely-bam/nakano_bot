import axios from "axios";
import config from "../../config.js";
import path from "path";
import fs from "fs";
import te from "../../src/lib/ourin-error.js";
const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-OurinMD";

const pluginConfig = {
  name: "emojitoanimasi",
  alias: ["emoji2sticker", "emojisticker", "e2s"],
  category: "tools",
  description: "Konversi emoji ke sticker animasi",
  usage: ".emojitoanimasi <emoji>",
  example: ".emojitoanimasi 😳",
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

let thumbTools = null;
try {
  const p = path.join(process.cwd(), "assets/images/ourin-tools.jpg");
  if (fs.existsSync(p)) thumbTools = fs.readFileSync(p);
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

  if (thumbTools) {
    ctx.externalAdReply = {
      title,
      body,
      thumbnail: thumbTools,
      mediaType: 1,
      renderLargerThumbnail: false,
      sourceUrl: config.saluran?.link || "",
    };
  }

  return ctx;
}

async function handler(m, { sock }) {
  const emoji = m.text?.trim();

  if (!emoji) {
    return m.reply(
      `🎭 *ᴇᴍᴏᴊɪ ᴛᴏ ᴀɴɪᴍᴀsɪ*\n\n` +
        `> Konversi emoji ke sticker animasi\n\n` +
        `*Contoh:*\n` +
        `> \`${m.prefix}emojitoanimasi 😳\``,
    );
  }

  m.react("🎭");

  try {
    const apiUrl = `https://api.neoxr.eu/api/emojito?q=${encodeURIComponent(emoji)}&apikey=${NEOXR_APIKEY}`;
    const { data } = await axios.get(apiUrl, { timeout: 15000 });

    if (!data?.status || !data?.data?.url) {
      m.react("❌");
      return m.reply("❌ *ɢᴀɢᴀʟ*\n\n> Emoji tidak ditemukan atau API error");
    }

    const webpUrl = data.data.url;

    const webpRes = await axios.get(webpUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });
    const webpBuffer = Buffer.from(webpRes.data);

    await sock.sendMessage(
      m.chat,
      {
        sticker: webpBuffer,
        contextInfo: getContextInfo("🎭 EMOJI STICKER", emoji),
      },
      { quoted: m },
    );

    m.react("✅");
  } catch (error) {
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
