import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/ourin-error.js";
const pluginConfig = {
  name: "bratbahlil",
  alias: [],
  category: "sticker",
  description: "Membuat sticker brat bahlil",
  usage: ".bratbahlil <text>",
  example: ".bratbahlil Hai semua",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply(
      `🖼️ *BRAT BAHLIL*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratbahlil Hai semua\``,
    );
  }

  m.react("🕕");

  try {
    const url = `https://api.ourin.my.id/api/bratbahlil?text=${encodeURIComponent(text)}`;
    await sock.sendImageAsSticker(m.chat, url, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
    m.react("✅");
  } catch (error) {
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
