import { promises as fs } from 'fs'

const charactersFilePath = './database/characters.json'
const haremFilePath = './database/harem.json'

const cooldowns = {}// inicio cambio 
async function getUserLid(sock, jid) {
    try {
        const result = await sock.onWhatsApp(jid)

        if (result && result[0]?.lid) {
            return result[0].lid
        }

        return jid
    } catch {
        return jid
    }
}//acá final cambio 

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('No se pudo cargar characters.json')
    }
}

async function saveCharacters(characters) {
    try {
        await fs.writeFile(
            charactersFilePath,
            JSON.stringify(characters, null, 2),
            'utf-8'
        )
    } catch (error) {
        throw new Error('No se pudo guardar characters.json')
    }
}

async function loadHarem() {
    try {
        const data = await fs.readFile(haremFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        return []
    }
}

async function saveHarem(harem) {
    try {
        await fs.writeFile(
            haremFilePath,
            JSON.stringify(harem, null, 2),
            'utf-8'
        )
    } catch (error) {
        throw new Error('No se pudo guardar harem.json')
    }
}

export default {
    name: 'claim',
    alias: ['c', 'reclamar'],
    category: 'Gacha',
    description: 'Reclama un personaje del gacha',

    async execute(sock, msg, options) {

        const from = msg.key.remoteJid

console.log(msg.key)

const userJid = msg.key.participant || from
const userId = await getUserLid(sock, userJid)

const now = Date.now()

        try {

            if (cooldowns[userId] && now < cooldowns[userId]) {

                const time = Math.ceil(
                    (cooldowns[userId] - now) / 1000
                )

                return await sock.sendMessage(
                    from,
                    {
                        text:
                        `> ⓘ Espera *${time} segundos* para usar claim nuevamente.`
                    },
                    { quoted: msg }
                )
            }


            const quotedMessage =
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
                
                console.log(JSON.stringify(quotedMessage, null, 2))
            if (!quotedMessage) {

                return await sock.sendMessage(
                    from,
                    {
                        text:
                        '> ⓘ Debes citar el mensaje del personaje del gacha.'
                    },
                    { quoted: msg }
                )
            }


            const quotedText = JSON.stringify(quotedMessage)

console.log('========== QUOTED ==========')
console.log(quotedText)

const idMatch = quotedText.match(/ID:\s*\*?(\d+)\*?/)

if (!idMatch) {
    return await sock.sendMessage(
        from,
        {
            text: '> ⓘ No se encontró el ID del personaje.'
        },
        { quoted: msg }
    )
}

const characterId = idMatch[1].trim()

const characters = await loadCharacters()

console.log('========== CLAIM ==========')
console.log('Ruta:', charactersFilePath)
console.log('ID buscado:', characterId)
console.log('¿Es array?:', Array.isArray(characters))
console.log('Total personajes:', Array.isArray(characters) ? characters.length : 0)
console.log('Primer personaje:', characters[0])

const character = characters.find(c =>
    String(c.id).trim() === String(characterId).trim()
)

console.log('Resultado:', character)

if (!character) {
    return await sock.sendMessage(
        from,
        {
            text:
                '> ⓘ El personaje no existe en la base de datos.\n' +
                `> ⓘ ID buscado: ${characterId}`
        },
        { quoted: msg }
    )
}


            if (character.user && character.user !== userId) {

    return await sock.sendMessage(
        from,
        {
            text:
            `> ⓘ Este personaje ya fue reclamado por otro usuario`
        },
        { quoted: msg }
    )
}


            character.user = userId
            character.status = 'Reclamado'


            await saveCharacters(characters)
            
            const harem = await loadHarem()

let userHarem = harem.find(
    h => h.userId === userId
)

if (!userHarem) {
    userHarem = {
        userId,
        characters: []
    }

    harem.push(userHarem)
}

userHarem.characters.push({
    characterId: character.id,
    name: character.name,
    value: character.value,
    source: character.source
})

await saveHarem(harem)


            cooldowns[userId] = now + 15000


            await sock.sendMessage(
                from,
                {
                    text:
`╭━━━〔 🎴 CLAIM 〕━━━╮
┃
┃ ✅ Reclamo exitoso
┃
┃ 🎴 Personaje:
┃ *${character.name}*
┃
┃ 💰 Valor:
┃ *${character.value}*
┃
┃ 📺 Fuente:
┃ *${character.source}*
┃
╰━━━━━━━━━━━━━━╯`
                },
                { quoted: msg }
            )


        } catch (error) {

            await sock.sendMessage(
                from,
                {
                    text:
                    `❌ Error en claim:\n${error.message}`
                },
                { quoted: msg }
            )

        }
    }
}