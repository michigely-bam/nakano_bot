export default {
    name: 'ping',
    alias: ['speed', 'p', 'test'],
    description: 'Latencia',
    category: 'main',
    
    async execute(sock, msg, { args, command, body, config, startTime, isOwner, pushName, userNumber, isGroup, expResult, replyWithContext }) {
        try {
            const jid = msg.key.remoteJid;
            
            // 1. CALCULAR PING PRIMERO, antes del delay
            const messageTimestamp = msg.messageTimestamp || msg.message?.messageTimestamp;
            const userSendTime = messageTimestamp ? messageTimestamp * 1000 : Date.now();
            const now = Date.now();
            const ping = now - userSendTime;

            // 2. AHORA SI METEMOS EL DELAY
            await sock.sendPresenceUpdate('composing', jid).catch(() => {});
            const delay = Math.floor(Math.random() * 2000) + 1000; // 1 a 3s
            await new Promise(r => setTimeout(r, delay));
            
            const response = `╭─ . ݁₊ ⊹ . ݁˖ .
│ 𓆩 *PONG* 𓆪
│ 🖤 *Velocidad:* ${ping}ms
╰─ . ݁₊ ⊹ . ݁˖ .

> by Miku Nakano`;

            await sock.sendMessage(jid, { text: response });
            await sock.sendPresenceUpdate('paused', jid).catch(() => {});
            
        } catch (e) {
            console.log(e)
            await sock.sendPresenceUpdate('paused', msg.key.remoteJid).catch(() => {});
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error al calcular ping' })
        }
    }
};