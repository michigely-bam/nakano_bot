import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
import { getRpgContextInfo } from '../../src/lib/ourin-context.js'
const pluginConfig = {
    name: 'hunt',
    alias: ['berburu', 'hunting'],
    category: 'rpg',
    description: 'Berburu hewan untuk mendapatkan daging dan kulit',
    usage: '.hunt',
    example: '.hunt',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 90,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    if (!user.inventory) user.inventory = {}
    
    const staminaCost = 25
    user.rpg.stamina = user.rpg.stamina || 100
    
    if (user.rpg.stamina < staminaCost) {
        return m.reply(
            `⚡ *sᴛᴀᴍɪɴᴀ ʜᴀʙɪs*\n\n` +
            `> Butuh ${staminaCost} stamina untuk berburu.\n` +
            `> Stamina kamu: ${user.rpg.stamina}`
        )
    }
    
    user.rpg.stamina -= staminaCost
    
    await m.reply('🏹 *sᴇᴅᴀɴɢ ʙᴇʀʙᴜʀᴜ...*')
    await new Promise(r => setTimeout(r, 2500))
    
    const animals = [
        { name: '🐰 Kelinci', item: 'rabbit', chance: 50, exp: 100 },
        { name: '🦌 Rusa', item: 'deer', chance: 30, exp: 200 },
        { name: '🐗 Babi Hutan', item: 'boar', chance: 20, exp: 300 },
        { name: '🐻 Beruang', item: 'bear', chance: 10, exp: 500 },
        { name: '🦁 Singa', item: 'lion', chance: 5, exp: 800 },
        { name: '🐉 Naga', item: 'dragon', chance: 1, exp: 2000 }
    ]
    
    const rand = Math.random() * 100
    let caught = null
    
    for (const animal of animals.sort((a, b) => a.chance - b.chance)) {
        if (rand <= animal.chance) {
            caught = animal
            break
        }
    }
    
    if (!caught) {
        caught = animals.find(a => a.item === 'rabbit')
    }
    
    user.inventory[caught.item] = (user.inventory[caught.item] || 0) + 1
    const levelResult = await addExpWithLevelCheck(sock, m, db, user, caught.exp)
    
    db.save()
    
    let txt = `🏹 *ʜᴜɴᴛɪɴɢ sᴇʟᴇsᴀɪ*\n\n`
    txt += `╭┈┈⬡「 🎯 *ʜᴀsɪʟ* 」\n`
    txt += `┃ ${caught.name}: *+1*\n`
    txt += `┃ 🚄 Exp: *+${caught.exp}*\n`
    txt += `┃ ⚡ Stamina: *-${staminaCost}*\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡`
    
    await m.reply(txt)
}

export { pluginConfig as config, handler }