import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
const pluginConfig = {
    name: 'challenge',
    alias: ['daily', 'dailychallenge', 'tantangan'],
    category: 'rpg',
    description: 'Daily challenge untuk hadiah spesial',
    usage: '.challenge',
    example: '.challenge',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const CHALLENGES = [
    { name: '⚔️ Kill 5 Monsters', type: 'kill', target: 5, reward: { gold: 500, exp: 200 } },
    { name: '🎣 Catch 3 Fish', type: 'fish', target: 3, reward: { gold: 300, exp: 150 } },
    { name: '⛏️ Mine 10 Ores', type: 'mine', target: 10, reward: { gold: 400, exp: 180 } },
    { name: '🌱 Harvest 5 Crops', type: 'harvest', target: 5, reward: { gold: 350, exp: 160 } },
    { name: '🧪 Craft 3 Potions', type: 'craft', target: 3, reward: { gold: 450, exp: 190 } },
    { name: '💰 Earn 1000 Gold', type: 'earn', target: 1000, reward: { gold: 500, exp: 250 } },
    { name: '🗺️ Complete 2 Expeditions', type: 'expedition', target: 2, reward: { gold: 600, exp: 300 } }
]

function getNewDailyChallenge() {
    return {
        ...CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)],
        progress: 0,
        date: new Date().toDateString(),
        claimed: false
    }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    
    const today = new Date().toDateString()
    
    if (!user.rpg.dailyChallenge || user.rpg.dailyChallenge.date !== today) {
        user.rpg.dailyChallenge = getNewDailyChallenge()
        db.save()
    }
    
    const challenge = user.rpg.dailyChallenge
    const isComplete = challenge.progress >= challenge.target
    
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    
    if (action === 'claim') {
        if (!isComplete) {
            return m.reply(`❌ Challenge belum selesai! Progress: ${challenge.progress}/${challenge.target}`)
        }
        
        if (challenge.claimed) {
            return m.reply(`❌ Reward sudah di-claim! Tunggu challenge baru besok.`)
        }
        
        user.koin = (user.koin || 0) + challenge.reward.gold
        await addExpWithLevelCheck(sock, m, db, user, challenge.reward.exp)
        
        challenge.claimed = true
        db.save()
        
        await m.react('🎉')
        return m.reply(
            `🎉 *ᴄʜᴀʟʟᴇɴɢᴇ ᴄᴏᴍᴘʟᴇᴛᴇ!*\n\n` +
            `╭┈┈⬡「 🎁 *ʀᴇᴡᴀʀᴅ* 」\n` +
            `┃ 💰 Gold: *+${challenge.reward.gold.toLocaleString()}*\n` +
            `┃ ✨ EXP: *+${challenge.reward.exp}*\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> Challenge baru akan muncul besok!`
        )
    }
    
    let txt = `📋 *ᴅᴀɪʟʏ ᴄʜᴀʟʟᴇɴɢᴇ*\n\n`
    txt += `╭┈┈⬡「 🎯 *ᴛᴏᴅᴀʏ* 」\n`
    txt += `┃ 📝 ${challenge.name}\n`
    txt += `┃ 📊 Progress: *${challenge.progress}/${challenge.target}*\n`
    txt += `┃ ${isComplete ? '✅ SELESAI!' : '🕕 Dalam progress...'}\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
    
    txt += `╭┈┈⬡「 🎁 *ʀᴇᴡᴀʀᴅ* 」\n`
    txt += `┃ 💰 Gold: *${challenge.reward.gold.toLocaleString()}*\n`
    txt += `┃ ✨ EXP: *${challenge.reward.exp}*\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
    
    if (isComplete && !challenge.claimed) {
        txt += `> Ketik \`${m.prefix}challenge claim\` untuk klaim reward!`
    } else if (challenge.claimed) {
        txt += `> ✅ Reward sudah di-claim. Besok ada challenge baru!`
    } else {
        txt += `> Selesaikan challenge untuk mendapat reward!`
    }
    
    return m.reply(txt)
}

export { pluginConfig as config, handler }