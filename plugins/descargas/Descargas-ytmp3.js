import fetch from 'node-fetch';

const EDWARD_API = 'https://dv-edward.onrender.com/api';
const EDWARD_KEY = 'edward';

function safeFileName(name) {
    return String(name || 'media').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'media';
}

function extractYouTubeUrl(text) {
    const m = String(text || '').match(/https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com|youtu\.be)\/[^\s]+/i);
    return m? m[0].trim() : '';
}

function isHttpUrl(v) { return /^https?:\/\//i.test(String(v || '')); }

async function buscarVideo(query) {
    const res = await fetch(`${EDWARD_API}/search/youtube?apiKey=${EDWARD_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.status ||!data.data?.length) throw new Error('No se encontraron resultados en YouTube.');
    return data.data[0];
}

async function descargarAudio(videoUrl, title) {
    const res = await fetch(`${EDWARD_API}/download/ytaudio?url=${encodeURIComponent(videoUrl)}&apiKey=${EDWARD_KEY}`);
    const json = await res.json();
    if (!json.status ||!json.result?.download_url) throw new Error('No se pudo obtener el audio.');

    return {
        fileName: safeFileName(json.result.title || title) + '.mp3',
        title: safeFileName(json.result.title || title),
        author: json.result.author || 'Desconocido',
        url: json.result.download_url,
        thumbnail: json.result.thumbnail || null
    };
}

export default {
    name: 'play',
    alias: ['yt', 'ytmp3', 'mp3', 'song', 'musica', 'cancion'],
    category: 'download',
    description: 'Busca y descarga audio de YouTube',
    async execute(sock, msg, { senderJid, args, text }) {
        const input = (text || args?.join(' ') || '').trim();
        const chatId = msg.key.remoteJid;

        const enviarTexto = (contenido) => sock.sendMessage(chatId, {
            text: contenido,
            mentions: senderJid? [senderJid] : []
        }, { quoted: msg });

        if (!input) {
            return enviarTexto(
                `🎵 *MIKU NAKANO-BOT - YOUTUBE*\n\nBusca y descarga audio de YouTube\nUso: *.play <nombre o link>*\nEjemplo: *.play Naruto Opening 1*\n\nBy *michigelybam*`
            );
        }

        if (isHttpUrl(input) &&!extractYouTubeUrl(input)) {
            return enviarTexto('❌ Envia un link valido de YouTube.');
        }

        let videoUrl = extractYouTubeUrl(input);
        let tituloBusqueda = input;

        try {
            if (!videoUrl) {
                const resultado = await buscarVideo(input);
                videoUrl = resultado.url;
                tituloBusqueda = resultado.title || input;
                await enviarTexto(`🔍 Encontrado: *${tituloBusqueda}*\nDescargando...`);
            } else {
                await enviarTexto('⏳ Descargando audio...');
            }

            const audio = await descargarAudio(videoUrl, tituloBusqueda);

            await sock.sendMessage(chatId, {
                audio: { url: audio.url },
                mimetype: 'audio/mpeg',
                fileName: audio.fileName
            }, { quoted: msg });

            if (audio.thumbnail) {
                await sock.sendMessage(chatId, {
                    image: { url: audio.thumbnail },
                    caption: `🎵 *${audio.title}*\nAutor: ${audio.author}\n\nBy *michigelybam*`
                }, { quoted: msg });
            } else {
                await enviarTexto(`✅ Descarga completada\n*${audio.title}*\n\nBy *michigelybam*`);
            }
        } catch (e) {
            console.error('[PLAY ERROR]', e.message);
            await enviarTexto(`❌ Error: ${e.message || 'Error al descargar.'}\n\nBy *michigelybam*`);
        }
    }
};