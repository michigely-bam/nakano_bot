import fs from 'fs'
import path from 'path'

export default {
    name: 'dir',
    alias: ['carpetas', 'ls', 'list'],
    description: 'Muestra las carpetas y archivos del primer piso',
    category: 'owner',
    command: ['dir', 'carpetas'],

    async execute(sock, msg, { args }) {
        const from = msg.key.remoteJid;

        try {
            // Ruta por defecto = raíz del bot
            let ruta = args[0] || './';

            // Lee todo lo que hay en la ruta
            const items = fs.readdirSync(ruta);

            if (items.length === 0) {
                return await sock.sendMessage(from, {
                    text: `📂 La carpeta \`${ruta}\` está vacía`
                }, { quoted: msg });
            }

            let lista = `📁 *Contenido de:* \`${ruta}\`\n\n`;

            items.forEach(item => {
                const fullPath = path.join(ruta, item);
                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    lista += `📁 *${item}*/\n`; // carpeta
                } else {
                    lista += `📄 ${item}\n`; // archivo
                }
            });

            lista += `\n💡 *Uso:* ${global.prefix || '.'}dir [ruta]\nEjemplo: ${global.prefix || '.'}dir lib`

            await sock.sendMessage(from, {
                text: lista
            }, { quoted: msg });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Error: ${error.message}\n\nAsegúrate que la ruta existe`
            }, { quoted: msg });
        }
    }
};