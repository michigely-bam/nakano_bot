import { getDatabase } from "../../src/lib/ourin-database.js";
import { getGroupMode } from "../group/botmode.js";
import { fetchGroupsSafe } from "../../src/lib/ourin-jpm-helper.js";
import config from "../../config.js";
import fs from "fs";
import te from "../../src/lib/ourin-error.js";
let cachedThumb = null;
try {
  if (fs.existsSync("./assets/images/ourin.jpg")) {
    cachedThumb = fs.readFileSync("./assets/images/ourin.jpg");
  }
} catch (e) {}

const pluginConfig = {
  name: "jpm",
  alias: ["jasher", "jaser"],
  category: "jpm",
  description: "Kirim pesan ke semua grup (JPM)",
  usage: ".jpm <pesan>",
  example: ".jpm Halo semuanya!",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

function getContextInfo(title = "📢 ᴊᴘᴍ", body = "Jasa Pesan Massal") {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";

  const contextInfo = {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };

  if (cachedThumb) {
    contextInfo.externalAdReply = {
      title: title,
      body: body,
      thumbnail: cachedThumb,
      sourceUrl: config.saluran?.link || "",
      mediaType: 1,
      renderLargerThumbnail: true,
    };
  }

  return contextInfo;
}

async function handler(m, { sock }) {
  const db = getDatabase();

  if (m.isGroup) {
    const groupMode = getGroupMode(m.chat, db);
    if (groupMode !== "md" && groupMode !== "all") {
      return m.reply(
        `❌ *ᴍᴏᴅᴇ ᴛɪᴅᴀᴋ sᴇsᴜᴀɪ*\n\n> JPM hanya tersedia di mode MD\n\n\`${m.prefix}botmode md\``,
      );
    }
  }

  const text = m.fullArgs?.trim() || m.text?.trim();
  if (!text) {
    return m.reply(
      `📢 *JPM (JASA PESAN MASSAL)*\n\n` +
        `Sistem broadcast otomatis ke seluruh grup yang terdaftar.\n\n` +
        `*PENGGUNAAN:*\n` +
        `• *${m.prefix}jpm <pesan>* — Mengirim JPM teks biasa\n` +
        `• *${m.prefix}jpm (reply foto/video)* — Mengirim JPM dengan media\n\n` +
        `*FITUR LAIN:*\n` +
        `• *${m.prefix}jpmht* — JPM dengan mode Hidetag (tag semua member)\n` +
        `• *${m.prefix}autojpm* — Auto JPM dengan interval otomatis\n` +
        `• *${m.prefix}setdelayjpm* — Mengatur jeda pengiriman per grup\n` +
        `• *${m.prefix}stopjpm* — Menghentikan proses JPM yang sedang berjalan\n\n` +
        `*CONTOH:*\n` +
        `> \`${m.prefix}jpm Halo semuanya! Ini pesan otomatis dari owner.\``,
    );
  }

  if (global.statusjpm) {
    return m.reply(
      `❌ *ɢᴀɢᴀʟ*\n\n> JPM sedang berjalan. Ketik \`${m.prefix}stopjpm\` untuk menghentikan.`,
    );
  }

  m.react("📢");

  try {
    let mediaBuffer = null;
    let mediaType = null;
    const qmsg = m.quoted || m;

    if (qmsg.isImage) {
      try {
        mediaBuffer = await qmsg.download();
        mediaType = "image";
      } catch (e) {}
    } else if (qmsg.isVideo) {
      try {
        mediaBuffer = await qmsg.download();
        mediaType = "video";
      } catch (e) {}
    }

    const allGroups = await fetchGroupsSafe(sock);
    let groupIds = Object.keys(allGroups);

    const blacklist = db.setting("jpmBlacklist") || [];
    const blacklistedCount = groupIds.filter((id) =>
      blacklist.includes(id),
    ).length;
    groupIds = groupIds.filter((id) => !blacklist.includes(id));

    if (groupIds.length === 0) {
      m.react("❌");
      return m.reply(
        `❌ *ɢᴀɢᴀʟ*\n\n> Tidak ada grup yang ditemukan${blacklistedCount > 0 ? ` (${blacklistedCount} grup di-blacklist)` : ""}`,
      );
    }

    const jedaJpm = db.setting("jedaJpm") || 5000;

    await sock.sendMessage(
      m.chat,
      {
        text:
          `📢 *ᴊᴘᴍ*\n\n` +
          `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
          `┃ 📝 ᴘᴇsᴀɴ: \`${text.substring(0, 50)}${text.length > 50 ? "..." : ""}\`\n` +
          `┃ 📷 ᴍᴇᴅɪᴀ: \`${mediaBuffer ? mediaType : "Tidak"}\`\n` +
          `┃ 👥 ᴛᴀʀɢᴇᴛ: \`${groupIds.length}\` grup\n` +
          `┃ ⏱️ ᴊᴇᴅᴀ: \`${jedaJpm}ms\`\n` +
          `┃ 📊 ᴇsᴛɪᴍᴀsɪ: \`${Math.ceil((groupIds.length * jedaJpm) / 60000)} menit\`\n` +
          `╰┈┈⬡\n\n` +
          `> Memulai JPM ke semua grup...`,
        contextInfo: getContextInfo("📢 ᴊᴘᴍ", "Sending..."),
      },
      { quoted: m },
    );

    global.statusjpm = true;
    let successCount = 0;
    let failedCount = 0;

    const contextInfo = getContextInfo("📢 ᴊᴘᴍ", config.bot?.name || "Ourin");

    for (const groupId of groupIds) {
      if (global.stopjpm) {
        delete global.stopjpm;
        delete global.statusjpm;

        await sock.sendMessage(
          m.chat,
          {
            text:
              `⏹️ *ᴊᴘᴍ ᴅɪʜᴇɴᴛɪᴋᴀɴ*\n\n` +
              `╭┈┈⬡「 📊 *sᴛᴀᴛᴜs* 」\n` +
              `┃ ✅ ʙᴇʀʜᴀsɪʟ: \`${successCount}\`\n` +
              `┃ ❌ ɢᴀɢᴀʟ: \`${failedCount}\`\n` +
              `┃ ⏸️ sɪsᴀ: \`${groupIds.length - successCount - failedCount}\`\n` +
              `╰┈┈⬡`,
            contextInfo: getContextInfo("⏹️ ᴅɪʜᴇɴᴛɪᴋᴀɴ"),
          },
          { quoted: m },
        );
        return;
      }

      try {
        if (mediaBuffer) {
          await sock.sendMedia(groupId, mediaBuffer, text, null, {
            type: mediaType,
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true,
            },
          });
        } else {
          await sock.sendText(groupId, text, null, {
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true,
            },
          });
        }
        successCount++;
      } catch (err) {
        failedCount++;
      }

      await new Promise((resolve) => setTimeout(resolve, jedaJpm));
    }

    delete global.statusjpm;

    m.react("✅");
    await sock.sendMessage(
      m.chat,
      {
        text:
          `✅ *ᴊᴘᴍ sᴇʟᴇsᴀɪ*\n\n` +
          `╭┈┈⬡「 📊 *ʜᴀsɪʟ* 」\n` +
          `┃ ✅ ʙᴇʀʜᴀsɪʟ: \`${successCount}\`\n` +
          `┃ ❌ ɢᴀɢᴀʟ: \`${failedCount}\`\n` +
          `┃ 📊 ᴛᴏᴛᴀʟ: \`${groupIds.length}\`\n` +
          `╰┈┈⬡`,
        contextInfo: getContextInfo(
          "✅ sᴇʟᴇsᴀɪ",
          `${successCount}/${groupIds.length}`,
        ),
      },
      { quoted: m },
    );
  } catch (error) {
    delete global.statusjpm;
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
