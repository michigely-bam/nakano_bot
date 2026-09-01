import { default as axios } from "axios";
import te from "../../src/lib/ourin-error.js";
import config from "../../config.js";
const pluginConfig = {
  name: "spotify",
  alias: ["spotifysearch", "spsearch"],
  category: "search",
  description: "Cari lagu di Spotify",
  usage: ".spotify <query>",
  example: ".spotify neffex grateful",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m) {
  const query = m.text?.trim();

  if (!query) {
    return m.reply(
      `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `> \`${m.prefix}spotify <query>\`\n\n` +
        `> Contoh:\n` +
        `> \`${m.prefix}spotify neffex grateful\``,
    );
  }

  try {
    const res = await axios.get(
      `https://api.neoxr.eu/api/spotify-search?q=${encodeURIComponent(query)}&apikey=${config.APIkey.neoxr}`,
    );
    const results = res.data;
    if (!results.status) {
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak ditemukan hasil untuk *${query}*`);
    }

    const tracks = results.data;

    let txt = `🎵 *sᴘᴏᴛɪꜰʏ sᴇᴀʀᴄʜ*\n\n`;
    txt += `> Query: *${query}*\n\n`;

    tracks.forEach((t, i) => {
      txt += `*${i + 1}.* ${t.title}\n`;
      txt += `   ├ 🖼️ ${t.popularity}\n`;
      txt += `   ├ ${t.url}\n\n`;
    });

    txt += `> 💡 Download: \`${m.prefix}spdl <url>\` atau \`${m.prefix}spotplay ${query}\``;

    return m.reply(txt.trim());
  } catch (err) {
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
