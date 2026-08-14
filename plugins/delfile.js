import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'delfile',
    alias: ['rm'],
    description: 'Elimina un archivo del sistema (solo owner)',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, isOwner, replyWithContext, pushName, userNumber, senderJid } = options;
            const from = msg.key.remoteJid;
            
            // Solo owner puede usar este comando
            if (!isOwner) {
                return await replyWithContext(`🌌 El Comando \`${config.prefix}delfile\` Es solo para mí creador.\n> Usa ${config.prefix}help para ver mis comandos`);
            }
            
            // Verificar nombre de archivo
            if (!args || args.length === 0) {
                return await replyWithContext(`🌌 *Debes dar el nombre del archivo a borrar*\n> Ejemplo: ${config.prefix}delfile plugins/ping.js`);
            }
            
            const fileName = args[0];
            
            // Prevenir path traversal
            if (fileName.includes('..')) {
                return await replyWithContext(`🌌 *Nombre no válido*`);
            }
            
            const baseDir = path.join(process.cwd());
            const filePath = path.join(baseDir, fileName);
            
            if (!fs.existsSync(filePath)) {
                return await replyWithContext(`🌌 *El archivo no existe*`);
            }
            
            // Obtener estadísticas antes de borrar
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            
            // Borrar archivo
            fs.unlinkSync(filePath);
            
            await replyWithContext(`🗑️ *Archivo Borrado*\n\nℹ️ *Nombre:* ${fileName}\n⚙️ *Tamaño:* ${sizeKB} KB\n🔍 *Borrado:* ${new Date().toLocaleTimeString()}`);
            
            console.log(`🗑️ Archivo eliminado: ${fileName} por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en delfile:', error);
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`🌌 *Error al borrar*\n> ${error.message.substring(0, 100)}`);
            } catch (e) {}
        }
    }
};