import config from "../../config.js";
import te from "../../src/lib/ourin-error.js";
const pluginConfig = {
  name: "join",
  alias: ["joingrup", "joingroup", "gabung"],
  category: "owner",
  description: "Bot join ke grup via link invite",
  usage: ".join <link>",
  example: ".join https://chat.whatsapp.com/xxx",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function extractInviteCode(text) {
  const patterns = [
    /chat\.whatsapp\.com\/([a-zA-Z0-9]{20,})/i,
    /wa\.me\/([a-zA-Z0-9]{20,})/i,
    /^([a-zA-Z0-9]{20,})$/,
  ];

  for (const pattern of patterns) {
    const match = text?.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function handler(m, { sock }) {
  const input = m.args.join(" ").trim();

  if (!input) {
    return m.reply(
      `🔗 *ᴊᴏɪɴ ɢʀᴜᴘ*\n\n` +
        `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
        `┃ ◦ Kirim link invite grup\n` +
        `┃ ◦ Bot akan otomatis join\n` +
        `╰┈┈⬡\n\n` +
        `\`Contoh: ${m.prefix}join https://chat.whatsapp.com/xxx\``,
    );
  }

  const inviteCode = extractInviteCode(input);

  if (!inviteCode) {
    return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Link invite tidak valid`);
  }

  await m.react("🕕");

  try {
    const groupInfo = await sock.groupGetInviteInfo(inviteCode);

    if (!groupInfo) {
      await m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak dapat mengambil info grup`);
    }

    const botJid = sock.user?.id?.replace(/:.*@/, "@") || "";
    const isMember = groupInfo.participants?.some(
      (p) => p.id === botJid || p.id?.includes(sock.user?.id?.split(":")[0]),
    );

    if (isMember) {
      await m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Bot sudah menjadi member di grup ini`);
    }

    await sock.groupAcceptInvite(inviteCode);

    await m.react("✅");

    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";

    await m.reply({
      text:
        `✅ *ʙᴇʀʜᴀsɪʟ ᴊᴏɪɴ*\n\n` +
        `╭┈┈⬡「 📋 *ɪɴꜰᴏ ɢʀᴜᴘ* 」\n` +
        `┃ 🏠 ɴᴀᴍᴀ: *${groupInfo.subject || "Unknown"}*\n` +
        `┃ 👥 ᴍᴇᴍʙᴇʀ: *${groupInfo.size || groupInfo.participants?.length || 0}*\n` +
        `┃ 👤 ᴏᴡɴᴇʀ: *${groupInfo.owner?.split("@")[0] || "Unknown"}*\n` +
        `╰┈┈⬡`,
      contextInfo: {
        forwardingScore: 9999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: saluranId,
          newsletterName: saluranName,
          serverMessageId: 127,
        },
      },
    });
  } catch (error) {
    await m.react("❌");

    let errorMsg = error.message;
    if (errorMsg.includes("not-authorized")) {
      errorMsg = "Link sudah tidak valid atau expired";
    } else if (errorMsg.includes("gone")) {
      errorMsg = "Grup sudah tidak ada";
    } else if (errorMsg.includes("conflict")) {
      errorMsg = "Bot sudah menjadi member";
    }

    await m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
