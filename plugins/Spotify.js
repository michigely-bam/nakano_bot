import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

function getTempFilePath(extension) {
    return path.join(tempFolder, `spotify_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`);
}

export default {
    name: 'spotify',
    alias: ['sp'],
    description: 'Descarga música desde Spotify',
    category: 'download',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, replyWithContext, pushName, userNumber, senderJid, isSubBot } = options;
            const from = msg.key.remoteJid;
            
            // Verificar si es sub-bot
            const esSubBot = sock.isSubBot === true || isSubBot === true || config.subBot === true;
            
            if (esSubBot) {
                return await replyWithContext(`❀ *Este comando solo está disponible en prem-bots*`);
            }
            
            const url = args.join(' ').trim();
            
            if (!url) {
                return await replyWithContext(`*ᰔᩚ* Debes proporcionar un enlace de Spotify\n> Ejemplo: ${config.prefix}spotify https://open.spotify.com/track/xxxxx`);
            }
            
            if (!url.includes('spotify.com')) {
                return await replyWithContext(`*Link inválido*\n\n> Debes proporcionar un enlace de Spotify válido.`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            } catch (e) {}
            
            await replyWithContext(`*Buscando...*`);
            
            const apiUrl = `https://api.delirius.store/download/spotifydl?url=${encodeURIComponent(url)}`;
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            
            if (!response.data?.status || !response.data?.data) {
                throw new Error('No se encontró la canción');
            }
            
            const data = response.data.data;
            
            const title = data.title || 'Canción';
            const artist = data.author || 'Artista';
            const durationMs = data.duration || 0;
            const duration = durationMs ? formatDuration(durationMs) : 'N/A';
            const imageUrl = data.image || '';
            const downloadUrl = data.download || '';
            
            if (!downloadUrl) {
                throw new Error('No se pudo obtener el enlace de descarga');
            }
            
            let thumbnailBuffer = null;
            if (imageUrl) {
                try {
                    const thumbResponse = await axios.get(imageUrl, { 
                        responseType: 'arraybuffer',
                        timeout: 10000
                    });
                    thumbnailBuffer = Buffer.from(thumbResponse.data);
                } catch (e) {
                    console.log('Error descargando thumbnail:', e.message);
                }
            }
            
            const audioResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://spotify.com/'
                },
                timeout: 60000
            });
            
            const audioBuffer = Buffer.from(audioResponse.data);
            const sizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
            const nombreArchivo = title.replace(/[^a-zA-Z0-9]/g, '_');
            
            let caption = `꯭ꕤ゙ *Nombre › ${title}*\n`;
            caption += `ꕤ゙ *Artista › ${artist}*\n`;
            caption += `ꕤ゙ *Duración › ${duration}*\n`;
            caption += `ꕤ゙ *Tamaño › ${sizeMB} MB*\n\n`;
            caption += `> Solicitado por: ${pushName || 'Usuario'}`;
            
            if (thumbnailBuffer) {
                await sock.sendMessage(from, {
                    image: thumbnailBuffer,
                    caption: caption,
                    contextInfo: {
                        mentionedJid: senderJid ? [senderJid] : [],
                        forwardingScore: 9999999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            } else {
                await replyWithContext(caption);
            }
            
            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${nombreArchivo}.mp3`,
                ptt: false,
                contextInfo: {
                    mentionedJid: senderJid ? [senderJid] : [],
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Canción descargada: ${title} - ${artist} (${sizeMB} MB) por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en spotify:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ *Error:* ${error.message}\n\n> Verifica que el enlace sea válido y vuelve a intentarlo.`);
            } catch (e) {}
        }
    }
};

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}