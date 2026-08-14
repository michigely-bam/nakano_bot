import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

export default {
    name: 'zip',
    alias: [],
    description: 'crea un zip nada mas',
    category: 'owner',
    command: ['zipcarpeta'],

    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, pushName, replyWithContext, isOwner, args } = options;
            const from = msg.key.remoteJid;

            const isUserOwner = config.owner && config.owner.some(ownerNum =>
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );

            if (!isUserOwner &&!isOwner) {
                return await replyWithContext(`🌌 El comando \`${config.prefix}zip\` no existe.`);
            }

            // 1. Obtener la carpeta que quieres zipear
            const carpeta = args[0];
            if (!carpeta) {
                return await replyWithContext(`🌌 *Uso:*\n${config.prefix}zipcarpeta plugins\n${config.prefix}zipcarpeta lib\n${config.prefix}zipcarpeta database`);
            }

            try {
                await sock.sendMessage(from, { react: { text: '⏱️', key: msg.key } });
            } catch (e) {}

            const baseDir = path.join(__dirname, '..');
            const carpetaPath = path.join(baseDir, carpeta);

            // Verificar que existe
            if (!fs.existsSync(carpetaPath)) {
                return await replyWithContext(`❌ La carpeta \`${carpeta}\` no existe`);
            }

            const stats = fs.statSync(carpetaPath);
            if (!stats.isDirectory()) {
                return await replyWithContext(`❌ \`${carpeta}\` no es una carpeta`);
            }

            // 2. Crear ZIP solo de esa carpeta
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
            const zipFileName = `${carpeta}_backup_${timestamp}.zip`;
            const zipFilePath = path.join(tempFolder, zipFileName);

            const zip = new AdmZip();
            zip.addLocalFolder(carpetaPath, carpeta); // solo agrega esa carpeta
            zip.writeZip(zipFilePath);

            const zipBuffer = fs.readFileSync(zipFilePath);

            // 3. Enviar
            await sock.sendMessage(from, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: zipFileName,
                caption: `✅ *archivo de carpeta*\n\n*Carpeta:* ${carpeta}\n*Tamaño:* ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`
            }, { quoted: msg });

            fs.unlinkSync(zipFilePath); // borrar temp

            try {
                await sock.sendMessage(from, { react: { text: '⭐', key: msg.key } });
            } catch (e) {}

            console.log(`✅ archivo de ${carpeta} enviado a: ${pushName || senderNumber}`);

        } catch (error) {
            console.error('❌ Error en crear:', error);
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            try {
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};