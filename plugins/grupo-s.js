export default {
    name: 'bangroup',
    alias: ['bangroup', 'unbangroup'],
    description: 'Vetar o perdonar un grupo. Solo Owner',
    category: 'owner',

    async execute(sock, msg, { args, command, isOwner, isGroup }) {
        try {
            const jid = msg.key.remoteJid;

            
            const ownerNumber = '37031996583942@s.whatsapp.net'
            const sender = msg.key.participant || msg.key.remoteJid

            if (sender!== ownerNumber &&!isOwner) {
                return sock.sendMessage(jid, { text: "💅 Privilegio denegado. Solo mi creador michigelybam puede ejecutar esto." }, { quoted: msg })
            }

            
            let target = isGroup? jid : args[0]
            if (!target) return sock.sendMessage(jid, { text: "Usa:.bangroup en un grupo o pon el ID del grupo" }, { quoted: msg })
            if (!target.endsWith('@g.us')) return sock.sendMessage(jid, { text: "Ese no es un ID de grupo valido" }, { quoted: msg })

            
            if (!global.db.data.chats[target]) {
                global.db.data.chats[target] = { isBanned: false, bannedByOwner: false }
            }

            let chat = global.db.data.chats[target]

            
            await sock.sendPresenceUpdate('composing', jid).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            if (command === 'bangroup') {
                chat.bannedByOwner = true
                await sock.sendMessage(target, {
                    text: `│ Lo siento...
│ Por orden de michigelybam debo irme de este grupo.
│ Cuidense.`
                })
            } else { 
                chat.bannedByOwner = false
                await sock.sendMessage(target, {
                    text: `│ Ehm...
│ michigelybam me dejo volver.
│ Trabajare como siempre.`
                })
            }

            await sock.sendPresenceUpdate('paused', jid).catch(() => {});

        } catch (e) {
            console.log(e)
            await sock.sendPresenceUpdate('paused', msg.key.remoteJid).catch(() => {});
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error al ejecutar bangroup' })
        }
    }
};

//código de luferOS;b