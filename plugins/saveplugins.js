import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

export default {
    name: 'saveplugins',
    alias: ['installplugins', 'upplugins'],
    category: 'owner',
    description: 'Instala plugins desde un .zip. Solo Owner',
    async execute(sock, msg, { isOwner }) {
        const chatId = msg.key.remoteJid;

        if (!isOwner) return sock.sendMessage(chatId, { text: '❌ Solo el owner puede usar esto' }, { quoted: msg });

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const document = msg.message?.documentMessage || quoted?.documentMessage;

        if (!document || !document.fileName?.endsWith('.zip')) {
            return sock.sendMessage(chatId, { 
                text: `📦 *MIKU BOT - INSTALADOR*\n\nEnvíame un archivo .zip y respóndelo con .saveplugins\nLos .js se guardarán en ./plugins/` 
            }, { quoted: msg });
        }

        await sock.sendMessage(chatId, { text: '⏳ Descargando y descomprimiendo... *Miku Bot*' }, { quoted: msg });

        try {
            const stream = await sock.downloadMediaMessage(msg.message.documentMessage ? msg : quoted);
            const zipPath = `./tmp/${document.fileName}`;
            
            if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
            fs.writeFileSync(zipPath, stream);

            const zip = new AdmZip(zipPath);
            const extractPath = './plugins/';
            
            if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath);
            zip.extractAllTo(extractPath, true);

            fs.unlinkSync(zipPath);

            const files = zip.getEntries().filter(e => e.entryName.endsWith('.js')).map(e => `✅ ${path.basename(e.entryName)}`);

            await sock.sendMessage(chatId, { 
                text: `✅ *MIKU BOT - PLUGINS INSTALADOS*\n\n${files.join('\n')}\n\n⚠️ Usa .restart para cargar los nuevos plugins` 
            }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(chatId, { text: `❌ Error: ${e.message}\n➮ Miku Bot` }, { quoted: msg });
        }
    }
}