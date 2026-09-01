import ourinApi from "../../src/lib/ourin-apimanager.js";

const pluginConfig = {
  name: "rch",
  alias: ["frch", "reactch", "fakereactch", "fakerch"],
  category: "tools",
  description: "Kirim react ke post channel WhatsApp",
  usage: ".rch <link_post> <emoji>",
  example: ".rch https://whatsapp.com/channel/xxx/123 😂😍",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];

  if (args.length < 2) {
    return m.reply(
      `⚠️ *ꜰᴏʀᴍᴀᴛ sᴀʟᴀʜ!*\n\n` +
        `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
        `┃ \`${m.prefix}rch <link_post> <emoji>\`\n` +
        `╰┈┈⬡\n\n` +
        `📌 *Contoh:*\n` +
        `\`${m.prefix}rch https://whatsapp.com/channel/xxx/123 😂\`\n` +
        `\`${m.prefix}rch https://whatsapp.com/channel/xxx/123 😂😱🔥\``,
    );
  }

  const link = args[0];
  const emoji = args.slice(1).join("");

  if (!link.includes("whatsapp.com/channel")) {
    return m.reply(
      `❌ *ʟɪɴᴋ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ*\n\n> Link harus dari channel WhatsApp!`,
    );
  }

  if (!emoji) {
    return m.reply(`❌ *ᴇᴍᴏᴊɪ ᴋᴏsᴏɴɢ*\n\n> Masukkan emoji untuk react!`);
  }

  m.react("🕕");

  try {
    const data = await ourinApi.apiFaa.reactChannel(
      {
        url: link,
        react: emoji,
      },
      { timeout: 30000 },
    );

    if (data?.status) {
      m.react("✅");
      await m.reply(
        `✅ *ʀᴇᴀᴄᴛ sᴇɴᴛ!*\n\n` +
          `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
          `┃ 🔗 Target: \`${data.info?.destination || link}\`\n` +
          `┃ 🎭 Emoji: ${data.info?.reaction_used?.replace(/,/g, " ") || emoji.replace(/,/g, " ")}\n` +
          `╰┈┈⬡`,
      );
    } else {
      throw new Error(data?.message || "Gagal mengirim reaksi");
    }
  } catch (err) {
    m.react("❌");
    await m.reply(
      `❌ *ɢᴀɢᴀʟ ᴍᴇɴɢɪʀɪᴍ ʀᴇᴀᴋsɪ*\n\n` +
        `> Limit RCH habis, silahkan tunggu hari berikutnya hehe\n\n`,
    );
  }
}

export { pluginConfig as config, handler };
