import moment from "moment-timezone";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import { createWideDiscordCard } from "../../src/lib/ourin-welcome-card.js";
import { resolveAnyLidToJid } from "../../src/lib/ourin-lid.js";
import path from "path";
import fs from "fs";
import axios from "axios";
import te from "../../src/lib/ourin-error.js";
const pluginConfig = {
  name: "welcome",
  alias: ["wc"],
  category: "group",
  description: "Mengatur welcome message untuk grup",
  usage: ".welcome <on/off>",
  example: ".welcome on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
// eslint-disable-next-line require-await
async function buildWelcomeMessage(
  participant,
  groupName,
  groupDesc,
  memberCount,
  customMsg = null,
  groupOwner = "",
  prefix = ".",
) {
  const greetings = [
    `Akhirnya datang juga`,
    `Selamat datang`,
    `Welcome`,
    `Halo`,
    `Hai`,
    `Yokoso~`,
    `Ohayou~`,
  ];
  const quotes = [
    `Jangan jadi silent reader ya!`,
    `Santai aja, anggap rumah sendiri!`,
    `Yuk langsung gas ngobrol!`,
    `Siap-siap rame bareng!`,
    `Jangan malu-malu, kita semua temen!`,
    `Kalau bingung mulai, nyapa aja dulu 😄`,
  ];
  const emojis = ["🎐", "🌸", "✨", "💫", "🪸", "🔥", "💖"];
  const headers = [
    `🎐 Ohayou~ minna-san!
Hari ini kita kedatangan tomodachi baru 🌱
Yuk sambut bareng-bareng~`,
    `🌸 Ohayou minna-san!
Satu teman baru akhirnya join ✨
Semoga betah dan langsung nimbrung ya~`,
    `✨ Ohayou~!
Tomodachi baru datang bawa vibes baru 💫
Yoroshiku ne~ mari seru-seruan bareng!`,
    `🪸 Ohayou minna-san!
Grup ini nambah satu keluarga lagi 🤍
Tanoshii jikan o issho ni sugoso ne~`,
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const header = headers[Math.floor(Math.random() * headers.length)];
  const username = participant?.split("@")[0] || "User";
  const now = moment().tz("Asia/Jakarta");
  const dayNames = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
  };
  const dayId = dayNames[now.format("dddd")] || now.format("dddd");
  if (customMsg) {
    return customMsg
      .replace(/{user}/gi, `@${username}`)
      .replace(/{number}/gi, username)
      .replace(/{group}/gi, groupName || "Grup")
      .replace(/{desc}/gi, groupDesc || "")
      .replace(/{count}/gi, memberCount?.toString() || "0")
      .replace(/{owner}/gi, groupOwner || "Admin")
      .replace(/{date}/gi, now.format("DD/MM/YYYY"))
      .replace(/{time}/gi, now.format("HH:mm"))
      .replace(/{day}/gi, dayId)
      .replace(/{bot}/gi, config.bot?.name || "Ourin")
      .replace(/{prefix}/gi, prefix);
  }
  let msg = `
${header}
${emoji} ${greeting}, *@${username}* 💫
╭─〔 📌 *ɪɴꜰᴏ ɢʀᴏᴜᴘ* 〕─✧
│ 🏠 *Nama*     : \`${groupName}\`
│ 👥 *Member*   : ${memberCount}
│ 📅 *Tanggal*  : ${moment().tz("Asia/Jakarta").format("DD/MM/YYYY")}
╰──────────────────────✦
`;
  if (groupDesc) {
    msg += `
📝 *Deskripsi*
❝ ${groupDesc.slice(0, 120)}${groupDesc.length > 120 ? "..." : ""} ❞
`;
  }
  msg += `
✨ *Tips Hari Ini*
「 ${quote} 」
🌸 _Yoroshiku ne~ semoga betah ya!_ 🤍
`;
  return msg;
}
async function sendWelcomeMessage(sock, groupJid, participant, groupMeta) {
  try {
    const db = getDatabase();
    const groupData = db.getGroup(groupJid);
    if (groupData?.welcome !== true) return false;
    const welcomeType = db.setting("welcomeType") || 1;
    const realParticipant = resolveAnyLidToJid(
      participant,
      groupMeta?.participants || [],
    );
    const memberCount = groupMeta?.participants?.length || 0;
    const groupName = groupMeta?.subject || "Grup";
    let userName = realParticipant?.split("@")[0] || "User";
    let ppUrl =
      "https://cdn.gimita.id/download/pp%20kosong%20wa%20default%20(1)_1769506608569_52b57f5b.jpg";
    try {
      ppUrl = await sock.profilePictureUrl(realParticipant, "image");
    } catch {}
    const text = await buildWelcomeMessage(
      realParticipant,
      groupMeta?.subject,
      groupMeta?.descOwner,
      memberCount,
      groupData?.welcomeMsg,
      groupMeta?.owner?.split("@")[0] || "",
      config.command?.prefix || ".",
    );
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
    if (welcomeType === 2) {
      await sock.sendMessage(groupJid, {
        text: `Welcome *${userName}* 
Selamat Datang! di grup *${groupName}*`,
        title: ``,
        subtitle: groupName,
        footer: `Member ke-${memberCount}`,
        cards: [
          {
            image: { url: ppUrl },
            body: `Selamat datang di ${groupName}`,
            footer: "Semoga betah ya~",
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "👋 Halo " + "@" + userName,
                  id: "hi",
                }),
              },
            ],
          },
        ],
      });
    } else if (welcomeType === 3) {
      // Type 3: Image (PP) + Caption + Metadata
      await sock.sendMessage(groupJid, {
        image: { url: ppUrl },
        caption: text,
        contextInfo: {
          mentionedJid: [realParticipant],
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: `Welcome ${userName}`,
            body: `Member ke-${memberCount}`,
            thumbnailUrl: ppUrl,
            sourceUrl:
              config.saluran?.link ||
              "https://whatsapp.com/channel/0029VbB37bgBfxoAmAlsgE0t",
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      });
    } else if (welcomeType === 4) {
      await sock.sendMessage(groupJid, {
        text: `*Halo* @${userName} 👋
Selamat datang di grup *${groupName}* 🌸`,
        contextInfo: {
          mentionedJid: [realParticipant],
          forwardingScore: 9,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterName: config?.saluran?.name,
            newsletterJid: config?.saluran?.id,
          },
          externalAdReply: {
            title: `SELAMAT DATANG 👋`,
            body: `Member ke-${memberCount}`,
            thumbnailUrl: ppUrl,
            sourceUrl: config.info?.grupwa || "",
            mediaUrl: config.info?.grupwa || "",
            mediaType: 2,
            // renderLargerThumbnail: true
          },
        },
      });
    } else if (welcomeType === 5) {
      await sock.sendText(groupJid, text, null, {
        mentions: [realParticipant],
        contextInfo: {
          mentionedJid: [realParticipant],
          forwardingScore: 9,
          isForwarded: true,
          externalAdReply: {
            title: `SELAMAT DATANG 👋`,
            body: `Member ke-${memberCount}`,
            thumbnailUrl: ppUrl,
            sourceUrl: null,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      });
    } else {
      await sock.sendMessage(groupJid, {
        text: text,
        mentions: [realParticipant],
      });
    }
    return true;
  } catch (error) {
    console.error("Welcome Error:", error);
    return false;
  }
}
async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const sub = args[0]?.toLowerCase();
  const sub2 = args[1]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};
  const currentStatus = groupData.welcome === true;
  if (sub === "on" && sub2 === "all") {
    if (!m.isOwner) {
      return m.reply(config.messages.ownerOnly);
    }
    m.react("🕕");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      let count = 0;
      for (const groupId of groupIds) {
        db.setGroup(groupId, { welcome: true });
        count++;
      }
      m.react("✅");
      return m.reply(
        `✅ *ᴡᴇʟᴄᴏᴍᴇ ɢʟᴏʙᴀʟ ᴏɴ*\n\n` +
          `> Welcome diaktifkan di *${count}* grup!`,
      );
    } catch (err) {
      m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
  if (sub === "off" && sub2 === "all") {
    if (!m.isOwner) {
      return m.reply(config.messages.ownerOnly);
    }
    m.react("🕕");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      let count = 0;
      for (const groupId of groupIds) {
        db.setGroup(groupId, { welcome: false });
        count++;
      }
      m.react("✅");
      return m.reply(
        `❌ *ᴡᴇʟᴄᴏᴍᴇ ɢʟᴏʙᴀʟ ᴏꜰꜰ*\n\n` +
          `> Welcome dinonaktifkan di *${count}* grup!`,
      );
    } catch (err) {
      m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
  if (sub === "on") {
    if (currentStatus) {
      return m.reply(
        `⚠️ *ᴡᴇʟᴄᴏᴍᴇ ᴀʟʀᴇᴀᴅʏ ᴀᴄᴛɪᴠᴇ*\n\n` +
          `> Status: *✅ ON*\n` +
          `> Welcome sudah aktif di grup ini.\n\n` +
          `_Gunakan \`${m.prefix}welcome off\` untuk menonaktifkan._`,
      );
    }
    db.setGroup(m.chat, { welcome: true });
    return m.reply(
      `✅ *ᴡᴇʟᴄᴏᴍᴇ ᴀᴋᴛɪꜰ*\n\n` +
        `> Welcome message berhasil diaktifkan!\n` +
        `> Member baru akan disambut otomatis.\n\n` +
        `_Gunakan \`${m.prefix}setwelcome\` untuk custom pesan._`,
    );
  }
  if (sub === "off") {
    if (!currentStatus) {
      return m.reply(
        `⚠️ *ᴡᴇʟᴄᴏᴍᴇ ᴀʟʀᴇᴀᴅʏ ɪɴᴀᴄᴛɪᴠᴇ*\n\n` +
          `> Status: *❌ OFF*\n` +
          `> Welcome sudah nonaktif di grup ini.\n\n` +
          `_Gunakan \`${m.prefix}welcome on\` untuk mengaktifkan._`,
      );
    }
    db.setGroup(m.chat, { welcome: false });
    return m.reply(
      `❌ *ᴡᴇʟᴄᴏᴍᴇ ɴᴏɴᴀᴋᴛɪꜰ*\n\n` +
        `> Welcome message berhasil dinonaktifkan.\n` +
        `> Member baru tidak akan disambut.`,
    );
  }
  m.reply(
    `👋 *ᴡᴇʟᴄᴏᴍᴇ sᴇᴛᴛɪɴɢs*\n\n` +
      `> Status: *${currentStatus ? "✅ ON" : "❌ OFF"}*\n\n` +
      `\`\`\`━━━ ᴘɪʟɪʜᴀɴ ━━━\`\`\`\n` +
      `> \`${m.prefix}welcome on\` → Aktifkan\n` +
      `> \`${m.prefix}welcome off\` → Nonaktifkan\n` +
      `> \`${m.prefix}welcome on all\` → Global ON (owner)\n` +
      `> \`${m.prefix}welcome off all\` → Global OFF (owner)\n` +
      `> \`${m.prefix}setwelcome\` → Custom pesan\n` +
      `> \`${m.prefix}resetwelcome\` → Reset default`,
  );
}
export { pluginConfig as config, handler, sendWelcomeMessage };
