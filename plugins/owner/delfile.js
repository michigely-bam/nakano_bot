import fs from 'fs';
import path from 'path';

export default {
    name: 'delfile',
    alias: ['rm'],
    description: 'Elimina un archivo o carpeta del sistema (solo owner)',
    category: 'owner',

    async execute(sock, msg, options) {
        try {
            const { args, config, isOwner, replyWithContext, pushName, userNumber } = options;
            const from = msg.key.remoteJid;

            // Solo owner
            if (!isOwner) {
                return await replyWithContext(
                    `🌌 El comando \`${config.prefix}delfile\` es solo para mi creador.\n> Usa ${config.prefix}help para ver mis comandos`
                );
            }

            // Verificar argumento
            if (!args || args.length === 0) {
                return await replyWithContext(
                    `🌌 *Debes indicar un archivo o carpeta*\n> Ejemplo: ${config.prefix}delfile plugins/prueba`
                );
            }

            const fileName = args[0];

            // Bloquear rutas peligrosas
            if (
                fileName.includes('..') ||
                fileName.startsWith('/') ||
                fileName.includes('\\')
            ) {
                return await replyWithContext(`🌌 *Ruta no válida*`);
            }

            // Archivos protegidos
            const protectedFiles = [
                'package.json',
                'config.js',
                'index.js',
                'main.js'
            ];

            if (protectedFiles.includes(path.basename(fileName))) {
                return await replyWithContext(
                    `🌌 *No puedes eliminar este archivo protegido*`
                );
            }

            const baseDir = process.cwd();
            const filePath = path.join(baseDir, fileName);

            if (!fs.existsSync(filePath)) {
                return await replyWithContext(
                    `🌌 *El archivo o carpeta no existe*`
                );
            }

            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(2);

            let tipoEliminado = 'Archivo';

            // Eliminar archivo o carpeta
            if (stats.isDirectory()) {
                tipoEliminado = 'Carpeta';

                fs.rmSync(filePath, {
                    recursive: true,
                    force: true
                });

            } else {
                fs.unlinkSync(filePath);
            }

            await replyWithContext(
`🗑️ *${tipoEliminado} eliminado correctamente*

ℹ️ *Nombre:* ${fileName}
⚙️ *Tamaño:* ${sizeKB} KB
🔍 *Eliminado:* ${new Date().toLocaleTimeString()}`
            );

            console.log(
                `🗑️ ${tipoEliminado} eliminado: ${fileName} por ${pushName || userNumber}`
            );

        } catch (error) {
            console.error('❌ Error en delfile:', error);

            try {
                const { replyWithContext } = options;

                await replyWithContext(
                    `🌌 *Error al eliminar*\n> ${error.message.substring(0, 100)}`
                );

            } catch (e) {}
        }
    }
};