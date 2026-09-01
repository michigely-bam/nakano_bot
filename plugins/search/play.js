/**
 * Nama Plugin: Play
 * Pembuat Code: Zann
 * Saluran: https://whatsapp.com/channel/0029Vb7g5Qt90x2yn7bOlM2U
 */

import yts from "yt-search";
import axios from "axios";
import ytdl, { fallbackToMp3Buffer } from "../../src/scraper/ytdl.js";
const pluginConfig = {
  name: "play",
  alias: ["playaudio"],
  category: "search",
  description: "Putar musik dari YouTube (Siputzx API)",
  usage: ".play <query>",
  example: ".play komang",
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

async function getPlayAudioDownload(url) {
  try {
    const { data } = await axios.get(
      `https://api.nexray.eu.cc/downloader/v1/ytmp3?url=${encodeURIComponent(url)}`,
    );
    const download = data?.result?.url;
    const title = data?.result?.title;
    if (download) {
      return { download, title };
    }
  } catch {}

  const fallback = await ytdl(url, "mp3");
  if (fallback?.status && fallback?.dl) {
    return { download: fallback.dl, title: fallback.title, isFallback: true };
  }

  throw new Error(fallback?.mess || "Gagal mendapatkan audio play URL");
}

async function handler(m, { sock, text }) {
  const query = m.text?.trim();
  if (!query)
    return m.reply(`🎵 *ᴘʟᴀʏ*\n\n> Contoh:\n\`${m.prefix}play komang\``);

  m.react("🕐");

  try {
    const search = await yts(query);
    if (!search.videos.length) throw "Video tidak ditemukan";

    const video = search.videos[0];

    let info = `🎵 *NOW PLAYING*\n\n`;
    info += `📌 *Judul:* ${video.title}\n\n`;
    info += `*DETAIL*\n`;
    info += `👤 Channel: *${video.author.name}*\n`;
    info += `⏱️ Durasi: *${video.duration.timestamp}*\n`;
    info += `👀 Views: *${formatViews(video.views)}*\n`;
    info += `📅 Upload: *${video.ago}*\n`;
    info += `🆔 ID: \`${video.videoId}\`\n\n`;
    if (video.description) {
      const desc = video.description.substring(0, 150).replace(/\n/g, " ");
      info += `*Deskripsi:*\n_${desc}${video.description.length > 150 ? "..." : ""}_\n\n`;
    }
    info += `🔗 ${video.url}\n\n`;
    info += `_⏳ mengirim audio, harap tunggu..._`;

    await sock.sendPreview(
      m.chat,
      {
        caption: `${info}`,
        url: video.url,
        title: video.title,
        description: "YouTube Video",
        image: video.thumbnail,
        previewType: 1,
      },
      {
        quoted: m,
      },
    );

    const audio = await getPlayAudioDownload(video.url);

    if (audio.isFallback) {
      const mp3Buffer = await fallbackToMp3Buffer(audio.download);
      await sock.sendMessage(
        m.chat,
        {
          audio: mp3Buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${audio.title || video.title || "audio"}.mp3`,
        },
        { quoted: m },
      );
    } else {
      await sock.sendMedia(m.chat, audio.download, video.title, m, {
        type: "audio",
      });
    }

    m.react("✅");
  } catch (err) {
    console.error("[Play]", err);
    m.react("😭");
    m.reply(
      `Wahhh, fitur putar musiknya lagi ada kendala kak, coba lagi nanti yak, jangan spam`,
    );
  }
}

export { pluginConfig as config, handler };
