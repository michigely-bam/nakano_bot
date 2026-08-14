import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export default {
    name: 'canal',
    alias: ['c'],
    category: 'OWNER',

    async execute(sock, msg, { config, args }) {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const numeroLimpio = senderJid.split('@')[0].replace(/\D/g, '');

        const OWNERS = (config.owner || []).map(String);

        if (!OWNERS.includes(numeroLimpio)) return;

        if (!config.canalId) {
            return sock.sendMessage(
                from,
                { text: `❌ Falta configurar canalId en config.js` },
                { quoted: msg }
            );
        }

        const tempFiles = [];
        let statusMsg;

        try {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quotedMsg) {
                return sock.sendMessage(
                    from,
                    { text: `Responde a un audio/video/imagen/sticker con .canal @numero` },
                    { quoted: msg }
                );
            }

            const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const textoExtra = args.join(' ').replace(/@\d+/g, '').trim();

            const type = Object.keys(quotedMsg)[0];
            const messageContent = quotedMsg[type];

            statusMsg = await sock.sendMessage(
                from,
                { text: `⏳ Subiendo al canal...` },
                { quoted: msg }
            );

            const stream = await downloadContentFromMessage(
                messageContent,
                type.replace('Message', '')
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            let caption = textoExtra || messageContent.caption || '';

            if (mentionedJid.length > 0) {
                caption += `\n\n${mentionedJid.map(jid => `@${jid.split('@')[0]}`).join(' ')}`;
            }

            if (type === 'audioMessage' || type === 'documentMessage') {

                const tempId = Date.now();
                const inputFile = `./temp_${tempId}`;
                const outputFile = `./temp_${tempId}.ogg`;

                tempFiles.push(inputFile, outputFile);

                await fs.writeFile(inputFile, buffer);

                await execAsync(
                    `ffmpeg -i "${inputFile}" -c:a libopus -b:a 256k -ar 48000 -ac 2 -application audio "${outputFile}" -y`
                );

                const opusBuffer = await fs.readFile(outputFile);

                await sock.sendMessage(config.canalId, {
                    audio: opusBuffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    fileName: 'audio.ogg',
                    ptt: false,
                    caption,
                    mentions: mentionedJid
                });

            } else if (type === 'videoMessage') {

                await sock.sendMessage(config.canalId, {
                    video: buffer,
                    caption,
                    mentions: mentionedJid
                });

            } else if (type === 'imageMessage') {

                await sock.sendMessage(config.canalId, {
                    image: buffer,
                    caption,
                    mentions: mentionedJid
                });

            } else if (type === 'stickerMessage') {

                await sock.sendMessage(config.canalId, {
                    sticker: buffer
                });

                if (caption) {
                    await sock.sendMessage(config.canalId, {
                        text: caption,
                        mentions: mentionedJid
                    });
                }

            } else if (type === 'conversation' || type === 'extendedTextMessage') {

                const texto = type === 'conversation'
                    ? quotedMsg.conversation
                    : quotedMsg.extendedTextMessage.text;

                await sock.sendMessage(config.canalId, {
                    text: `📢 ${texto}\n${caption}`,
                    mentions: mentionedJid
                });
            }

            if (statusMsg) {
                await sock.sendMessage(from, {
                    text: `🌠 Enviado al canal correctamente`,
                    edit: statusMsg.key
                });
            }

        } catch (error) {

            console.error(error);

            if (statusMsg) {
                await sock.sendMessage(from, {
                    text: `❌ Error: ${error.message}`,
                    edit: statusMsg.key
                });
            } else {
                await sock.sendMessage(
                    from,
                    { text: `❌ Error: ${error.message}` },
                    { quoted: msg }
                );
            }

        } finally {

            for (const file of tempFiles) {
                await fs.unlink(file).catch(() => {});
            }
        }
    }
};