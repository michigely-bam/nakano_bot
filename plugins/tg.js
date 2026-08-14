import { TelegramClient, Api } from "teleproto"; // teleproto es el nuevo
import { StringSession } from "teleproto/sessions/index.js";
import 'dotenv/config' // npm i teleproto dotenv

// 🛡️ CONFIG TELEGRAM
const API_ID = parseInt(process.env.TELEGRAM_API_ID)
const API_HASH = process.env.TELEGRAM_API_HASH
const STRING_SESSION = process.env.TELEGRAM_SESSION
const TELEGRAM_DESTINO = "@MJnumbers_bot" // FIJO
const CHAT_WA_DESTINO = "PON_AQUI_TU_JID" // Ej: 51912345678@s.whatsapp.net o id del grupo

const telegramClient = new TelegramClient(new StringSession(STRING_SESSION), API_ID, API_HASH, {});
telegramClient.connect().then(() => console.log("✅ Puente a @MJnumbers_bot conectado"))

const delay = ms => new Promise(res => setTimeout(res, ms));

// 1. ESCUCHA RESPUESTAS DE TELEGRAM -> LAS MANDA A WA
telegramClient.addEventHandler(async (update) => {
    try {
        if (update.className === "UpdateNewMessage" && update.message) {
            const msg = update.message;
            if (msg.out) return; // ignora lo que tú envías
            
            const sender = await msg.getSender();
            if (sender.username === "MJnumbers_bot") { // Solo del bot
                
                let texto = msg.message || "";
                let media = null;
                
                if (msg.media) {
                    const buffer = await telegramClient.downloadMedia(msg.media);
                    media = buffer;
                }

                if (media) {
                    await global.sock.sendMessage(CHAT_WA_DESTINO, {
                        image: media,
                        caption: `╭⋯ 📥 *RESPUESTA DE @MJnumbers_bot* ⋯》\n┊ ${texto}\n╰⋯ 》`
                    });
                } else {
                    await global.sock.sendMessage(CHAT_WA_DESTINO, {
                        text: `╭⋯ 📥 *RESPUESTA DE @MJnumbers_bot* ⋯》\n┊ ${texto}\n╰⋯ 》`
                    });
                }
            }
        }
    } catch (e) { console.log("Error escuchando TG:", e) }
});

export default {
    name: 'bridge',
    alias: ['tg', 'send'],
    description: 'Puente directo con @MJnumbers_bot',
    category: 'herramientas',
    command: ['tg', 'send'],

    async execute(sock, msg, { args }) {
        global.sock = sock; // para usarlo en el listener de arriba
        const from = msg.key.remoteJid;
        const senderName = msg.pushName || "Usuario";
        const mensaje = args.join(" ") || "Sin texto";

        const { key } = await sock.sendMessage(from, { 
            text: `╭⋯ 📡 *ENVIANDO A @MJnumbers_bot* ⋯》\n┊ [░░░░] 0%\n╰⋯ 》` 
        }, { quoted: msg });

        try {
            let enviado = false;
            // Si respondes a una imagen/video
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                if (quoted.imageMessage) {
                    const media = await sock.downloadMediaMessage({ key: msg.message.extendedTextMessage.contextInfo, message: quoted });
                    await telegramClient.sendFile(TELEGRAM_DESTINO, { file: media, caption: `De WA: ${senderName}\n\n${mensaje}` });
                    enviado = true;
                }
            }
            
            if (!enviado) {
                // Mensaje de texto normal
                await telegramClient.sendMessage(TELEGRAM_DESTINO, { message: `De WA: ${senderName}\n\n${mensaje}` });
            }

            await delay(800);
            await sock.sendMessage(from, { 
                text: `╭⋯ 📡 *ENVIADO* ⋯》\n┊ [██████] 100%\n┊ Enviado a @MJnumbers_bot\n╰⋯ 》`, 
                edit: key 
            });

        } catch (e) {
            console.log(e)
            await sock.sendMessage(from, { text: `┊ ⊳ Error: ${e.message}` }, { quoted: msg });
        }
    }
}