import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanNumber(number) {
    if (!number) return '';
    let cleaned = number.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

export default {
    name: 'getcode',
    alias: [],
    description: 'Obtiene el código de un archivo JS',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, replyWithContext, pushName, userNumber, isOwner, senderNumber } = options;
            const from = msg.key.remoteJid;
            
            const userNumberClean = cleanNumber(senderNumber || userNumber || '');
            
            const isUserOwner = config.owner && config.owner.some(ownerNum => 
                cleanNumber(ownerNum) === userNumberClean
            );
            
            if (!isUserOwner && !isOwner) {
                await replyWithContext(`🌌 El comando es solo para el propietario`);
                return;
            }
            
            if (!args || args.length === 0) {
                return await replyWithContext(`🌌 *Debes proporcionar el nombre de un archivo*\n\n> Ejemplo: ${config.prefix}getcode plugins/ping.js\n> Ejemplo: ${config.prefix}getcode handler.js`);
            }
            
            const fileName = args[0].trim();
            
            const baseDir = path.resolve(__dirname, '..');
            let filePath;
            
            if (fileName.includes('/') || fileName.includes('\\')) {
                filePath = path.join(baseDir, fileName);
            } else {
                const possiblePaths = [
                    path.join(baseDir, fileName),
                    path.join(baseDir, 'plugins', fileName),
                    path.join(baseDir, 'lib', fileName),
                    path.join(baseDir, 'utils', fileName),
                    path.join(baseDir, 'handlers', fileName),
                    path.join(baseDir, 'data', fileName),
                    path.join(baseDir, 'temp', fileName),
                    path.join(baseDir, 'subs', fileName)
                ];
                
                for (const possiblePath of possiblePaths) {
                    if (fs.existsSync(possiblePath) && fs.statSync(possiblePath).isFile()) {
                        filePath = possiblePath;
                        break;
                    }
                }
                
                if (!filePath) {
                    filePath = path.join(baseDir, 'plugins', fileName);
                }
            }
            
            if (!fs.existsSync(filePath)) {
                return await replyWithContext(`👤 *El archivo* \`${fileName}\` *no existe*\n\n📁 *Rutas buscadas:*\n- plugins/${fileName}\n- lib/${fileName}\n- data/${fileName}\n- ${fileName}`);
            }
            
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) {
                return await replyWithContext(`🌌 *${fileName}* no es un archivo válido`);
            }
            
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            await replyWithContext(fileContent);
            
            console.log(`📄 Código enviado: ${filePath} (${stats.size} bytes) por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en getcode:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};