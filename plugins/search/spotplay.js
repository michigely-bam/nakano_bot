import te from "../../src/lib/ourin-error.js";
import ourinApi from "../../src/lib/ourin-apimanager.js";

const pluginConfig = {
  name: "spotplay",
  alias: ["splay", "sp"],
  category: "search",
  description: "Putar musik dari Spotify",
  usage: ".spotplay <query>",
  example: ".spotplay neffex grateful",
  cooldown: 20,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query)
    return m.reply(`⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n> \`${m.prefix}spotplay <query>\``);

  m.react("🕕");

  try {
    const data = await ourinApi.azbry.spotplay(query, {
      timeout: 30000,
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!data?.status || !data?.result?.downloadLink) {
      throw new Error(data?.message || "Lagu Spotify tidak ditemukan");
    }

    const result = data.result;

    await sock.sendMedia(m.chat, result.downloadLink, null, m, {
      type: "audio",
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${result.artist || "Spotify"} - ${result.title || "audio"}.mp3`,
    });

    m.react("✅");
  } catch (e) {
    console.log(e);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
