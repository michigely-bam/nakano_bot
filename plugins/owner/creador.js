import path from 'path';
import fs from 'fs';

export default {
    name: 'creador',
    alias: ['owner', 'propietario', 'creador'],
    category: 'Herramientas',
    description: 'Muestra info del creador y links oficiales',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;

            const ownerNumber = '51970334698';
            const ownerJid = ownerNumber + '@s.whatsapp.net';
            const ownerName = 'Michigely_bam';
            const canalLink = 'https://whatsapp.com/channel/0029VbDH0vn29756Vx9D2p0u';
            const grupoLink = 'https://chat.whatsapp.com/G3SjivkF8hZ7thtMMGCjcy';
            const soporteLink = 'https://chat.whatsapp.com/F6mDwGTO79eCYrBs6CVndD';
            const mensaje = 'Puedes solicitar códigos premium para tener un prem bot totalmente gratis';

            // 1. Mensaje con la info - SIN CARACTERES RAROS
            const text = `╭─────────────────╮
│ *🏮 owner »* wa.me/${ownerNumber}
│ *🏮 name » ${ownerName}*
│ *🏮 ${mensaje}*
│ *🏮 canal oficial*
${canalLink}
│ *🏮 Grupo oficial*
${grupoLink}
│ *🏮 Grupo de soporte*
${soporteLink}
╰─────────────────>`;

            await sock.sendMessage(from, {
                text,
                contextInfo: {
                    mentionedJid: [ownerJid]
                }
            }, { quoted: msg });

            // 2. Enviar tu contacto
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL;type=CELL;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

            await sock.sendMessage(from, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard }]
                }
            });

        } catch (error) {
            console.error('❌ Error en creador:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};