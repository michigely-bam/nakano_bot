import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'savefile',
    alias: [],
    category: 'owner',

    async execute(sock, msg, { args, config, startTime, isOwner, pushName, userNumber, isGroup, isBotSelf }) {

        const jid = msg.key.remoteJid;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        // Solo owner
        if (!isOwner) {
            return await sock.sendMessage(jid, {
                text: `🌌 El comando \`${config.prefix}savefile\` no existe.\n> Usa ${config.prefix}help para ver mis comandos`
            });
        }

        // Verificar nombre
        if (!args || args.length === 0) {
            return await sock.sendMessage(jid, {
                text: `🌌 *Debes proporcionar el nombre de un archivo y responder a un texto*\n> *Ejemplo* » ${config.prefix}savefile plugins/ping.js\n> ${config.prefix}savefile index.js`
            });
        }

        // Verificar si respondió
        if (!quoted) {
            return await sock.sendMessage(jid, { text: `🌌 *Debes responder a un texto*` });
        }

        // Verificar tipo
        const messageType = Object.keys(quoted)[0];
        if (messageType!== 'conversation' && messageType!== 'extendedTextMessage') {
            return await sock.sendMessage(jid, { text: `🌌 *Debes responder a un texto*` });
        }

        // Obtener texto
        const texto = quoted.conversation || quoted.extendedTextMessage?.text || '';

        if (!texto.trim()) {
            return await sock.sendMessage(jid, { text: `🌌 *El texto está vacío*` });
        }

        // ===== DELAY RANDOM 1-3 SEGUNDOS =====
        await sock.sendPresenceUpdate('composing', jid).catch(() => {});
        const delay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(r => setTimeout(r, delay));
        // ======================================

        try {
            // Nombre del archivo
            const fileName = args[0];

            // Prevenir..
            if (fileName.includes('..')) {
                await sock.sendPresenceUpdate('paused', jid).catch(() => {});
                return await sock.sendMessage(jid, {
                    text: `🌌 *Nombre no válido*\n> No se permiten rutas con '..'`
                });
            }

            const baseDir = path.resolve(__dirname, '..');
            const filePath = path.join(baseDir, fileName);

            // Crear carpetas
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`📁 Directorio creado: ${dirPath}`);
            }

            const fileExists = fs.existsSync(filePath);

            // Guardar
            fs.writeFileSync(filePath, texto, 'utf8');

            if (!fs.existsSync(filePath)) {
                throw new Error('No se pudo crear el archivo');
            }

            const stats = fs.statSync(filePath);

            await sock.sendPresenceUpdate('paused', jid).catch(() => {});

            // Responder
            if (fileExists) {
                await sock.sendMessage(jid, {
                    text: `⚙️ *Archivo Actualizado*\n\n⚙️ *Nombre:* ${fileName}\n🌌 *Tamaño:* ${stats.size} bytes\n🌌 *Modificado:* ${new Date().toLocaleTimeString()}\n\n> Archivo actualizado correctamente.`
                });
            } else {
                await sock.sendMessage(jid, {
                    text: `💤 *Archivo Creado*\n\n📂 *Nombre:* ${fileName}\n🌌 *Tamaño:* ${stats.size} bytes\n🌌 *Ruta:* ${filePath}\n🌌 *Creado:* ${new Date().toLocaleTimeString()}\n\n> Archivo creado correctamente.`
                });
            }

            console.log(`✅ Archivo ${fileExists? 'actualizado' : 'creado'}: ${fileName} por OWNER ${pushName || userNumber}`);

        } catch (error) {
            await sock.sendPresenceUpdate('paused', jid).catch(() => {});
            console.error(error);
            await sock.sendMessage(jid, {
                text: `❌ *Error al guardar archivo:*\n\`\n${error.message}\n\`\``
            });
        }
    }
};