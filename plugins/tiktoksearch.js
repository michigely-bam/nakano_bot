import axios from 'axios';
import {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} from "@whiskeysockets/baileys"; // <-- AQUI ESTABA EL ERROR

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function createVideoMessage(url, sock) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const { videoMessage } = await generateWAMessageContent(
      { video: buffer },
      { upload: sock.waUploadToServer }
    );
    return videoMessage;
  } catch (error) {
    console.error('Error creating video message:', error.message);
    throw error;
  }
}

export default {
  name: 'tiktoks',
  alias: ['tiktoksearch', 'ttss'],
  category: 'Buscador',
  description: 'Buscar y descargar videos de TikTok',

  async execute(sock, m, options) {
    const from = m.key.remoteJid;
    const textMsg = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const args = textMsg.trim().split(/ +/).slice(1);
    const text = args.join(' ').trim();

    if (!text) {
      const emptyMsg = `╔═══════════════════════════╗\n║ ♔ BÚSQUEDAS DE TIKTOK ♔ ║\n╚═══════════════════════════╝\n\n▸ Ingresa un término de búsqueda o un enlace...\n\n_.ttss <búsqueda o enlace>_`;
      return sock.sendMessage(from, { text: emptyMsg }, { quoted: m });
    }

    const isUrl = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|t\.)?tiktok\.com\/[^\s&]+/i.test(text);
    await sock.sendMessage(from, { react: { text: "🖤", key: m.key } });

    try {
      if (isUrl) {
        await sock.sendMessage(from, { text: `▸ Extrayendo ecos de tu enlace...\n\n"${text}"` }, { quoted: m });
        const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`);
        const data = res.data?.data;
        if (!data?.play &&!data?.images) return sock.sendMessage(from, { text: '《✧》Enlace inválido' }, { quoted: m });

        const { title, duration, author, type, images, music, play } = data;
        const caption = `▸ Título: ${title || 'Sin nombre'}\n▸ Autor: ${author?.nickname || 'Desconocido'}\n▸ Duración: ${duration?? 'Desconocida'}s`;

        if (type === 'image' && Array.isArray(images) && images.length) {
          for (let i = 0; i < Math.min(images.length, 10); i++) {
            const imgBuffer = await axios.get(images[i], { responseType: 'arraybuffer' });
            await sock.sendMessage(from, { image: Buffer.from(imgBuffer.data), caption: i === 0? caption : undefined }, { quoted: m });
          }
          return;
        }
        if (play) {
          const videoBuffer = await axios.get(play, { responseType: 'arraybuffer' });
          return sock.sendMessage(from, { video: Buffer.from(videoBuffer.data), caption }, { quoted: m });
        }
      }

      // BUSQUEDA
      await sock.sendMessage(from, { text: `▸ Rastreando el vacío por ti...\n\n"${text}"` }, { quoted: m });
      const form = new URLSearchParams();
      form.append('keywords', text);
      form.append('count', '20');
      form.append('cursor', '0');
      form.append('HD', '1');

      const res = await axios.post('https://tikwm.com/api/feed/search', form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0' }
      });

      let results = res.data?.data?.videos?.filter(v => v.play) || [];
      if (results.length < 2) return sock.sendMessage(from, { text: `《✧》No se encontraron resultados` }, { quoted: m });

      shuffleArray(results);
      const topResults = results.slice(0, 5); // bajé a 5 para que no pese tanto
      const cards = [];
      let counter = 1;

      for (const v of topResults) {
        try {
          const videoMedia = await createVideoMessage(v.play, sock);
          cards.push({
            body: { text: `▸ ${v.title}\n\n▸ Autor: ${v.author?.nickname || 'Desconocido'}\n▸ Duración: ${v.duration}s` },
            footer: { text: "✦ busqueda de tiktok ✦" },
            header: { title: v.title, hasMediaAttachment: true, videoMessage: videoMedia },
            nativeFlowMessage: { buttons: [] }
          });
        } catch (err) { console.error(err) }
      }

      const resultMsg = `╔═══════════════════════════╗\n║ ♔ ${topResults.length} HALLAZGOS ENCONTRADOS ♔ ║\n╚═══════════╝\n\n▸ Búsqueda: "${text}"`;
      const msg = generateWAMessageFromContent(from, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: { text: resultMsg },
              footer: { text: "✦ error404 de tiktok ✦" },
              header: { hasMediaAttachment: false },
              carouselMessage: { cards }
            })
          }
        }
      }, { quoted: m });

      await sock.relayMessage(from, msg.message, { messageId: msg.key.id });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
    }
  }
};