import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = __dirname;

function generarArbol(dir, prefijo = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));

    let salida = '';

    items.forEach((item, index) => {
        const ultimo = index === items.length - 1;
        const rama = ultimo ? '└── ' : '├── ';
        const nuevoPrefijo = prefijo + (ultimo ? '    ' : '│   ');

        if (item.isDirectory()) {
            salida += `${prefijo}${rama}${item.name}/\n`;
            salida += generarArbol(path.join(dir, item.name), nuevoPrefijo);
        } else if (item.name.endsWith('.js')) {
            salida += `${prefijo}${rama}${item.name}\n`;
        }
    });

    return salida;
}

function contarPlugins(dir) {
    let total = 0;

    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const ruta = path.join(dir, item.name);

        if (item.isDirectory()) {
            total += contarPlugins(ruta);
        } else if (item.name.endsWith('.js')) {
            total++;
        }
    }

    return total;
}

export default {
    name: 'plugins',
    alias: ['misplugins', 'listaplugins', 'ls'],
    description: 'Muestra el árbol de plugins',
    category: 'owner',

    async execute(sock, msg, options) {
        try {
            const { isOwner } = options;
            const from = msg.key.remoteJid;

            if (!isOwner) {
                return await sock.sendMessage(
                    from,
                    { text: '🌌 Solo owner 🫟' },
                    { quoted: msg }
                );
            }

            const total = contarPlugins(pluginsDir);

            let texto = `📂 plugins/\n`;
            texto += generarArbol(pluginsDir);
            texto += `\n📦 Total: ${total}`;

            if (texto.length > 4000) {
                const partes = [];
                for (let i = 0; i < texto.length; i += 3900) {
                    partes.push(texto.slice(i, i + 3900));
                }

                for (const [i, parte] of partes.entries()) {
                    await sock.sendMessage(
                        from,
                        {
                            text: `📂 Plugins (${i + 1}/${partes.length})\n\n${parte}`
                        },
                        { quoted: msg }
                    );
                }
                return;
            }

            await sock.sendMessage(from, { text: texto }, { quoted: msg });

        } catch (error) {
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: `🌠 Error: ${error.message}` },
                { quoted: msg }
            );
        }
    }
};