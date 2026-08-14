export default {
    name: 'lid',
    alias: ['encontrarlid', 'getlid'],
    description: 'Saca el LID de un número o @mención',
    category: 'tools',
    command: ['lid'],

    async execute(sock, msg, { args }) {
        const from = msg.key.remoteJid;

        try {
            let targetJid = '';

            // 1. Si mencionan a alguien
            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            // 2. Si responden a un mensaje
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            }
            // 3. Si ponen número
            else if (args[0]) {
                let number = args[0].replace(/\D/g, '');
                if (!number.startsWith('51') && number.length <= 9) number = '51' + number;
                targetJid = number + '@s.whatsapp.net';
            }
            else {
                return await sock.sendMessage(from, {
                    text: `🌌 *Uso:*\n${global.prefix || '.'}lid 519xxxxxxx\n${global.prefix || '.'}lid @mención\n${global.prefix || '.'}lid [respondiendo a un mensaje]`
                }, { quoted: msg });
            }

            const number = targetJid.split('@')[0];
            await sock.onWhatsApp(targetJid).then(async res => {
                if (res && res[0]) {
                    const lid = res[0].lid || 'No disponible';
                    const exists = res[0].exists? '✅ Existe' : '❌ No existe';

                    await sock.sendMessage(from, {
                        text: `✅ *LID Encontrado*\n\n*Numero:* ${number}\n*LID:* ${lid}\n*Estado:* ${exists}`
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, {
                        text: `❌ No se pudo encontrar el LID de: ${number}`
                    }, { quoted: msg });
                }
            });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(from, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};