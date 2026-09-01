
import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
import { getRpgContextInfo } from '../../src/lib/ourin-context.js'
const pluginConfig = {
    name: 'woodcut',
    alias: ['chop', 'nebang', 'kayu'],
    category: 'rpg',
    description: 'Menebang pohon untuk mendapatkan kayu',
    usage: '.woodcut',
    example: '.woodcut',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    if (!user.inventory) user.inventory = {}
    
    const staminaCost = 15
    user.rpg.stamina = user.rpg.stamina || 100
    
    if (user.rpg.stamina < staminaCost) {
        return m.reply(
            `⚡ *sᴛᴀᴍɪɴᴀ ʜᴀʙɪs*\n\n` +
            `> Butuh ${staminaCost} stamina.\n` +
            `> Stamina kamu: ${user.rpg.stamina}`
        )
    }
    
    user.rpg.stamina -= staminaCost
    
    await m.reply('🪓 *sᴇᴅᴀɴɢ ᴍᴇɴᴇʙᴀɴɢ...*')
    await new Promise(r => setTimeout(r, 2000))
    
    const drops = [
        { item: 'wood', chance: 70, name: '🪵 Kayu', min: 2, max: 5 },
        { item: 'stick', chance: 50, name: '🥢 Ranting', min: 1, max: 3 },
        { item: 'apple', chance: 20, name: '🍎 Apel', min: 1, max: 2 },
        { item: 'rubber', chance: 10, name: '⚫ Karet', min: 1, max: 1 }
    ]
    
    let results = []
    for (const drop of drops) {
        if (Math.random() * 100 <= drop.chance) {
            const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min
            user.inventory[drop.item] = (user.inventory[drop.item] || 0) + qty
            results.push({ name: drop.name, qty })
        }
    }
    
    if (results.length === 0) {
        user.inventory['wood'] = (user.inventory['wood'] || 0) + 1
        results.push({ name: '🪵 Kayu', qty: 1 })
    }
    
    const expGain = Math.floor(Math.random() * 200) + 50
    const levelResult = await addExpWithLevelCheck(sock, m, db, user, expGain)
    
    db.save()
    
    let txt = `🪓 *ᴡᴏᴏᴅᴄᴜᴛ sᴇʟᴇsᴀɪ*\n\n`
    txt += `╭┈┈⬡「 📦 *ʜᴀsɪʟ* 」\n`
    for (const r of results) {
        txt += `┃ ${r.name}: *+${r.qty}*\n`
    }
    txt += `┃ 🚄 Exp: *+${expGain}*\n`
    txt += `┃ ⚡ Stamina: *-${staminaCost}*\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡`
    
    await m.reply(txt)
}

export { pluginConfig as config, handler }