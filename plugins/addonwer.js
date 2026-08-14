import fs from 'fs'
const path = './owners.json'

const loadOwners = () => fs.existsSync(path)? JSON.parse(fs.readFileSync(path)) : []
const saveOwners = (arr) => fs.writeFileSync(path, JSON.stringify(arr, null, 2))

export default {
    name: 'addowner',
    alias: ['añadirowner', 'agregarowner'],
    description: 'Agrega un usuario a la lista de owners del bot',
    category: 'owner',
    usage: '.addowner @usuario',
    rowner: true,

    async execute(m, { conn, args, usedPrefix, command }) {
        const emoji = '✅'
        const who = m.mentionedJid[0]
        ? m.mentionedJid[0]
            : m.quoted
        ? m.quoted.sender
            : args[0]
        ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
            : false

        if (!who) return conn.reply(m.chat, `${emoji} Por favor menciona a un usuario para agregarlo como owner.\nEjemplo: ${usedPrefix}${command} @usuario`, m)

        const user = conn.decodeJid(who)
        let owners = loadOwners()

        if (owners.includes(user)) {
            return conn.reply(m.chat, `${emoji} Ese usuario ya es owner.`, m)
        }

        owners.push(user)
        saveOwners(owners)
        global.owner = owners

        await conn.reply(m.chat, `${emoji} Listo. @${user.split('@')[0]} ya está en la lista de owners.`, m, { mentions: [user] })
    }
}