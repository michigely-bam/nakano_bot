import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

export default {
    name: 'backup',
    alias: ['respaldar', 'backupbot'],
    description: 'Crea un respaldo del bot en formato ZIP',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, pushName, replyWithContext, isOwner } = options;
            const from = msg.key.remoteJid;
            
            const isUserOwner = config.owner && config.owner.some(ownerNum => 
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );
            
            if (!isUserOwner && !isOwner) {
                return await replyWithContext(`🌌 El comando  \`${config.prefix}backup\` Es solo para el propietario.\n> Usa ${config.prefix}help para ver mis comandos`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '⏱️', key: msg.key } });
            } catch (e) {}
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
            const botName = config.nombre || config.name || 'bot';
            const cleanBotName = botName.replace(/[^a-zA-Z0-9]/g, '_');
            const zipFileName = `${cleanBotName}_backup_${timestamp}.zip`;
            const zipFilePath = path.join(tempFolder, zipFileName);
            
            // Crear ZIP con adm-zip
            const zip = new AdmZip();
            
            const itemsToBackup = [
                'config.js', 'index.js', 'database', 'data', 'handler.js',
                'lib', 'package.json', 'plugins', 'src', 'utils', 'databases'
            ];
            
            const baseDir = path.join(__dirname, '..');
            
            for (const item of itemsToBackup) {
                const itemPath = path.join(baseDir, item);
                if (fs.existsSync(itemPath)) {
                    const stats = fs.statSync(itemPath);
                    if (stats.isDirectory()) {
                        zip.addLocalFolder(itemPath, item);
                        console.log(`📁 Agregando: ${item}`);
                    } else {
                        zip.addLocalFile(itemPath, '', item);
                        console.log(`📄 Agregando: ${item}`);
                    }
                } else {
                    console.log(`⚠️ No existe: ${item}`);
                }
            }
            
            zip.writeZip(zipFilePath);
            
            const zipBuffer = fs.readFileSync(zipFilePath);
            
            await sock.sendMessage(from, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: zipFileName,
                contextInfo: {
                    mentionedJid: [senderJid],
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
            fs.unlinkSync(zipFilePath);
            
            try {
                await sock.sendMessage(from, { react: { text: '⭐', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Backup enviado a OWNER: ${pushName || senderNumber}`);
            
        } catch (error) {
            console.error('❌ Error en backup:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};