import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
const pluginConfig = {
    name: 'steal',
    alias: ['mencuri', 'curi', 'pickpocket'],
    category: 'rpg',
    description: 'Mencuri dari NPC untuk gold',
    usage: '.steal',
    example: '.steal',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 300,
    energi: 2,
    isEnabled: true
}

const TARGETS = [
    { name: '👨‍🌾 Petani', difficulty: 1, minGold: 50, maxGold: 150, catchChance: 10 },
    { name: '👨‍💼 Pedagang', difficulty: 2, minGold: 100, maxGold: 300, catchChance: 20 },
    { name: '🧙‍♂️ Penyihir', difficulty: 3, minGold: 200, maxGold: 500, catchChance: 30 },
    { name: '⚔️ Ksatria', difficulty: 4, minGold: 300, maxGold: 800, catchChance: 40 },
    { name: '👑 Bangsawan', difficulty: 5, minGold: 500, maxGold: 1500, catchChance: 50 },
    { name: '🏰 Raja', difficulty: 6, minGold: 1000, maxGold: 3000, catchChance: 60 }
]

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    if (!user.inventory) user.inventory = {}
    
    const staminaCost = 15
    user.rpg.stamina = user.rpg.stamina ?? 100
    
    if (user.rpg.stamina < staminaCost) {
        return m.reply(
            `⚡ *sᴛᴀᴍɪɴᴀ ᴋᴜʀᴀɴɢ*\n\n` +
            `> Butuh: ${staminaCost}\n` +
            `> Punya: ${user.rpg.stamina}`
        )
    }
    
    user.rpg.stamina -= staminaCost
    
    const userLevel = user.level || 1
    const availableTargets = TARGETS.filter(t => userLevel >= t.difficulty * 3)
    
    if (availableTargets.length === 0) {
        db.save()
        return m.reply(`❌ Level terlalu rendah! Minimal level 3 untuk mencuri.`)
    }
    
    const target = availableTargets[Math.floor(Math.random() * availableTargets.length)]
    
    await m.react('🥷')
    await m.reply(`🥷 *ᴍᴇɴᴄᴜʀɪ ᴅᴀʀɪ ${target.name}...*`)
    await new Promise(r => setTimeout(r, 2000))
    
    const luckBonus = (user.rpg.luck || 5) * 2
    const adjustedCatchChance = Math.max(5, target.catchChance - luckBonus)
    const isCaught = Math.random() * 100 < adjustedCatchChance
    
    if (isCaught) {
        const goldLoss = Math.floor((user.koin || 0) * 0.1)
        const healthLoss = 10 + target.difficulty * 5
        
        user.koin = Math.max(0, (user.koin || 0) - goldLoss)
        user.rpg.health = Math.max(1, (user.rpg.health || 100) - healthLoss)
        
        db.save()
        
        await m.react('💀')
        return m.reply(
            `💀 *ᴋᴇᴛᴀʜᴜᴀɴ!*\n\n` +
            `> ${target.name} menangkapmu!\n\n` +
            `╭┈┈⬡「 💔 *ᴘᴇɴᴀʟᴛʏ* 」\n` +
            `┃ 💸 Gold: *-${goldLoss.toLocaleString()}*\n` +
            `┃ ❤️ HP: *-${healthLoss}*\n` +
            `┃ ⚡ Stamina: *-${staminaCost}*\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `💡 *Tips:* Tingkatkan luck untuk mengurangi chance tertangkap!`
        )
    }
    
    const goldStolen = Math.floor(Math.random() * (target.maxGold - target.minGold)) + target.minGold
    const expReward = 50 + target.difficulty * 30
    
    user.koin = (user.koin || 0) + goldStolen
    await addExpWithLevelCheck(sock, m, db, user, expReward)
    
    const bonusItem = Math.random() > 0.7
    let bonusText = ''
    if (bonusItem) {
        const items = ['potion', 'key', 'gem', 'ring']
        const item = items[Math.floor(Math.random() * items.length)]
        user.inventory[item] = (user.inventory[item] || 0) + 1
        bonusText = `\n┃ 📦 Bonus: *${item} x1*`
    }
    
    db.save()
    
    await m.react('💰')
    return m.reply(
        `🥷 *ᴍᴇɴᴄᴜʀɪ ʙᴇʀʜᴀsɪʟ!*\n\n` +
        `> Berhasil mencuri dari ${target.name}!\n\n` +
        `╭┈┈⬡「 💰 *ʀᴇᴡᴀʀᴅ* 」\n` +
        `┃ 💵 Gold: *+${goldStolen.toLocaleString()}*\n` +
        `┃ ✨ EXP: *+${expReward}*${bonusText}\n` +
        `┃ ⚡ Stamina: *-${staminaCost}*\n` +
        `╰┈┈┈┈┈┈┈┈⬡`
    )
}

export { pluginConfig as config, handler }