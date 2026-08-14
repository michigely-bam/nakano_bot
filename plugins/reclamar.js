import { promises as fs } from 'fs'

const charactersFilePath = './database/characters.json'
const haremFilePath = './database/harem.json'

const cooldowns = {}

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        throw new Error('No se pudo cargar characters.json')
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

export default {
    name: 'rw',
    alias: ['rollwaifu', 'gacha'],
    category: 'Gacha',
    description: 'Obtén un personaje aleatorio del gacha',

    async execute(sock, msg, options) {

        const from = msg.key.remoteJid
        const userId = msg.key.participant || from
        const now = Date.now()

        try {

            await sock.sendMessage(
                from,
                {
                    react: {
                        text: '⏳',
                        key: msg.key
                    }
                }
            )


            if (cooldowns[userId] && now < cooldowns[userId]) {

                const remaining =
                    Math.ceil((cooldowns[userId] - now) / 1000)

                const minutes = Math.floor(remaining / 60)
                const seconds = remaining % 60

                return await sock.sendMessage(
                    from,
                    {
                        text:
                        `> ⓘ Espera *${minutes} minutos y ${seconds} segundos* para usar rw nuevamente.`
                    },
                    { quoted: msg }
                )
            }


            const characters = await loadCharacters()
            const harem = await loadHarem()


            if (!characters.length) {

                return await sock.sendMessage(
                    from,
                    {
                        text:
                        '> ⓘ No hay personajes disponibles.'
                    },
                    { quoted: msg }
                )
            }


            const randomCharacter =
                characters[
                    Math.floor(Math.random() * characters.length)
                ]


            const randomImage =
                randomCharacter.img[
                    Math.floor(Math.random() * randomCharacter.img.length)
                ]


            const userHarem =
                harem.find(
                    entry =>
                    String(entry.characterId) === String(randomCharacter.id)
                )


            const status =
                userHarem
                ? '🔴 Ya reclamado'
                : '🟢 Disponible'


            const caption =
`╭━━━〔 🎴 GACHA 〕━━━╮

🎴 *${randomCharacter.name}*

> ⓘ Género: *${randomCharacter.gender}*
> ⓘ Valor: *${randomCharacter.value}*
> ⓘ Estado: *${status}*
> ⓘ Fuente: *${randomCharacter.source}*

🔖 ID: *${randomCharacter.id}*

╰━━━━━━━━━━━━━━╯

Responde este mensaje con:
*.claim*
para reclamarlo.`


            const mentions =
                userHarem
                ? [userHarem.userId]
                : []


            await sock.sendMessage(
                from,
                {
                    image: {
                        url: randomImage
                    },
                    caption,
                    mentions
                },
                {
                    quoted: msg
                }
            )


            await sock.sendMessage(
                from,
                {
                    react: {
                        text: '✅',
                        key: msg.key
                    }
                }
            )


            cooldowns[userId] =
                now + (3 * 60 * 1000)


        } catch (error) {

            await sock.sendMessage(
                from,
                {
                    text:
                    `❌ Error en rw:\n${error.message}`
                },
                {
                    quoted: msg
                }
            )

        }
    }
}