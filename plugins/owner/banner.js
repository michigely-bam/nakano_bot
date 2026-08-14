import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERHASH = '7eac01ee208c76d5f57056c68';

// Limpia números: quita @, :, espacios y deja solo dígitos
function cleanNumber(number) {
    if (!number) return '';
    let str = String(number);
    let cleaned = str.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

function generateUniqueFilename(mime) {
    let ext = 'jpg';
    if (mime.includes('jpeg')) ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    if (mime.includes('mp4')) ext = 'mp4';
    if (mime.includes('webm')) ext = 'webm';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${id}.${ext}`;
}

async function uploadToCatbox(buffer, mime) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', USERHASH);
    form.append('fileToUpload', buffer, { filename: generateUniqueFilename(mime) });

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
    });

    if (typeof res.data!== 'string' ||!res.data.startsWith('https://')) {
        throw new Error('Respuesta inválida de Catbox');
    }
    return res.data;
}

function getBotConfigPath(sock) {
    let botNumber = '';
    if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
    } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }

    if (!botNumber) return null;

    const subBotPath = path.join(process.cwd(), 'subs', botNumber, 'config.js');
    if (fs.existsSync(subBotPath)) {
        return { path: subBotPath, type: 'sub-bot', number: botNumber };
    }

    const mainPath = path.join(process.cwd(), 'config.js');
    if (fs.existsSync(mainPath)) {
        return { path: mainPath, type: 'main', number: botNumber };
    }

    return null;
}

export default {
    name: 'setbanner',
    alias: ['botbanner', 'banner'],
    description: 'Cambia el banner del bot (Solo dueño) - JPG/JPEG/MP4',
    category: 'sub-bot',

    execute: async (sock, msg, options) => {
        try {
            const { config, senderNumber, userNumber } = options;
            const from = msg.key.remoteJid;
            const replyWithContext = options.replyWithContext || ((text) => sock.sendMessage(from, { text }, { quoted: msg }));
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            const userNumberClean = cleanNumber(senderNumber || userNumber || '');

            // LEER AMBOS: global.owner y config.botowner
            let owners = [];
            if (global.owner) {
                owners = owners.concat(Array.isArray(global.owner)? global.owner : [global.owner]);
            }
            if (config.botowner) {
                owners = owners.concat(Array.isArray(config.botowner)? config.botowner : [config.botowner]);
            }
            // Limpiar y quitar duplicados
            owners = [...new Set(owners.map(n => cleanNumber(n)).filter(Boolean))];

            const isOwner = owners.includes(userNumberClean);

            if (!isOwner) {
                return await replyWithContext(`❀ *Solo el dueño de este bot puede cambiar su banner*`);
            }

            if (!quotedMsg) {
                return await replyWithContext(`♡ Responde a una imagen JPG/JPEG/PNG o un video MP4 para establecer como banner`);
            }

            const botConfig = getBotConfigPath(sock);
            if (!botConfig) throw new Error('No se pudo encontrar la configuración del bot');
            const configPath = botConfig.path;

            // DETECTAR SI ES IMAGEN O VIDEO
            const imageMessage = quotedMsg.imageMessage;
            const videoMessage = quotedMsg.videoMessage;
            let mediaMessage, mimetype, tipo;

            if (imageMessage) {
                mediaMessage = imageMessage;
                mimetype = imageMessage.mimetype || '';
                tipo = 'Imagen';
                if (!mimetype.includes('jpeg') &&!mimetype.includes('jpg') &&!mimetype.includes('png')) {
                    return await replyWithContext(`♡ Solo JPG, JPEG o PNG`);
                }
            } else if (videoMessage) {
                mediaMessage = videoMessage;
                mimetype = videoMessage.mimetype || '';
                tipo = 'Video';
                if (!mimetype.includes('mp4')) {
                    return await replyWithContext(`♡ Solo videos MP4. Los GIF y WebM no los acepta`);
                }
            } else {
                return await replyWithContext(`♡ Responde a una imagen o video MP4`);
            }

            const quotedMsgObj = {
                key: {
                    remoteJid: from,
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant,
                    fromMe: false
                },
                message: { [imageMessage? 'imageMessage' : 'videoMessage']: mediaMessage }
            };

            const mediaBuffer = await downloadMediaMessage(quotedMsgObj, 'buffer', {}, {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            });

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('Buffer de medio vacío');
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (mediaBuffer.length > maxSize) {
                throw new Error(`El archivo es demasiado grande. Máx 10MB`);
            }

            await sock.sendMessage(from, { react: { text: '☁️', key: msg.key } });

            const catboxUrl = await uploadToCatbox(mediaBuffer, mimetype);

            let configContent = fs.readFileSync(configPath, 'utf8');
            const bannerRegex = /(banner:\s*['"])([^'"]*)(['"])/;

            if (bannerRegex.test(configContent)) {
                configContent = configContent.replace(bannerRegex, `$1${catboxUrl}$3`);
            } else {
                if(configContent.includes('export default {')){
                    configContent = configContent.replace(/export default \{/, `export default {\n banner: '${catboxUrl}',`);
                }
            }

            fs.writeFileSync(configPath, configContent, 'utf8');
            if (options.config) options.config.banner = catboxUrl;

            await replyWithContext(`❀ *Banner actualizado*\n\n> Tipo: ${tipo}\n> Tamaño: ${(mediaBuffer.length / 1024).toFixed(2)} KB\n> URL: ${catboxUrl}\n\n> *Nota:* Si es MP4 no se reproducirá como banner, solo queda el link`);

            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('Error en setbanner:', error);
            const replyWithContext = options.replyWithContext || ((text) => sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg }));
            await replyWithContext(`🌼 Error: ${error.message}`);
        }
    }
};