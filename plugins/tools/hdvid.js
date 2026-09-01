import te from "../../src/lib/ourin-error.js";
import config from "../../config.js";
import videoenhancer from "../../src/scraper/hdvid.js";
const pluginConfig = {
  name: "hdvid",
  alias: ["hdvideo", "enhancevid", "hdv"],
  category: "tools",
  description: "Meningkatkan kualitas video menjadi HD dengan AI",
  usage: ".hdvid (reply video)",
  example: ".hdvid",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const isVideo = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");

  if (!isVideo) {
    return m.reply(
      `📹 *ʜᴅ ᴠɪᴅᴇᴏ ᴇɴʜᴀɴᴄᴇʀ*\n\n` +
        `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
        `┃ ◦ Reply video dengan \`${m.prefix}hdvid\`\n` +
        `┃ ◦ Kirim video dengan caption \`${m.prefix}hdvid\`\n` +
        `╰┈┈⬡\n\n` +
        `> ⚠️ Proses membutuhkan waktu 30-60 detik\n` +
        `> 💎 Fitur premium`,
    );
  }

  m.react("🕕");

  try {
    const videoBuffer = (await m?.quoted?.download()) || (await m.download());

    if (!videoBuffer || videoBuffer.length === 0) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Gagal mengunduh video!`);
    }

    if (videoBuffer.length > 50 * 1024 * 1024) {
      m.react("❌");
      return m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> Video terlalu besar! Maksimal 50MB.`);
    }

    await m.reply(
      `🎞️ *ʜᴅ ᴠɪᴅᴇᴏ ᴇɴʜᴀɴᴄᴇʀ*\n\n> Video sedang diupload dan diproses\n> Estimasi 30-120 detik tergantung durasi video`,
    );

    const result = await videoenhancer(videoBuffer, {
      filename: `hdvid-${Date.now()}.mp4`,
      apiKey: config.APIkey?.fgsi,
      pollIntervalMs: 3000,
      timeoutMs: 10 * 60 * 1000,
    });

    await sock.sendMedia(m.chat, result.resultUrl, null, m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `HDVID-${Date.now()}.mp4`,
    });

    m.react("✅");
  } catch (err) {
    console.log(err);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
