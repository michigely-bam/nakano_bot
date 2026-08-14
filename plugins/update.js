export default {
    name: 'update',
    alias: ['aviso', 'bc', 'broadcast'],
    category: 'OWNER',
    description: 'Broadcast estilo dorado lujo',

    async execute(sock, msg, { config }) {
        const from = msg.key.remoteJid;
        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const args = body.slice(config.prefix.length).trim().split(' ').slice(1);
        const numero = (msg.key.participant || msg.key.remoteJid).split('@')[0];
        const OWNERS = ['51970334698', '51940725864', '51924090815', '37031996583942'];

        if (!OWNERS.includes(numero)) return sock.sendMessage(from, { text: `❌ Solo owners pueden usar este comando` }, { quoted: msg });
        if (!args.length) return sock.sendMessage(from, { text: `Uso: ${config.prefix}update <texto>` }, { quoted: msg });

        const texto = args.join(' ');
        const fecha = new Date().toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const mensaje = `✨ ═══════════ ✨
    👑 *AVISO OFICIAL* 👑
✨ ═══════════ ✨

${texto}

✨ ═══════════ ✨
> 📅 ${fecha}
> 💎 By *Michigely_bam*`;

        await sock.sendMessage(from, { text: `✨ Enviando aviso elegante...` }, { quoted: msg });

        let enviados = 0;
        let fallidos = 0;

        // 1. CANAL
        if (config.canalId) {
            try {
                await sock.sendMessage(config.canalId, { text: mensaje });
                enviados++;
            } catch(e) { fallidos++; }
        }

        // 2. GRUPOS
        const grupos = await sock.groupFetchAllParticipating();
        for (let jid of Object.keys(grupos)) {
            try {
                await sock.sendMessage(jid, { text: mensaje });
                enviados++;
                await new Promise(r => setTimeout(r, 2000)); // anti ban
            } catch(e) { fallidos++; }
        }

        // 3. RESUMEN
        await sock.sendMessage(from, {
            text: `✅ *ENVÍO COMPLETADO*

✨ Enviados: ${enviados}
❌ Fallidos: ${fallidos}

💎 By *Michigely_bam*`
        }, { quoted: msg });
    }
};