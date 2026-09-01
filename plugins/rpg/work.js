
import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
import { getRpgContextInfo } from '../../src/lib/ourin-context.js'
const pluginConfig = {
    name: 'work',
    alias: ['kerja', 'job'],
    category: 'rpg',
    description: 'Bekerja untuk mendapatkan uang',
    usage: '.work',
    example: '.work',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 180,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    
    const staminaCost = 10
    user.rpg.stamina = user.rpg.stamina || 100
    
    if (user.rpg.stamina < staminaCost) {
        return m.reply(
            `⚡ *sᴛᴀᴍɪɴᴀ ʜᴀʙɪs*\n\n` +
            `> Butuh ${staminaCost} stamina untuk bekerja.\n` +
            `> Stamina kamu: ${user.rpg.stamina}`
        )
    }
    
    user.rpg.stamina -= staminaCost
    
    const jobs = [
        { name: '👨‍🌾 Petani', min: 1000, max: 3000 },
        { name: '🧹 Cleaning Service', min: 2000, max: 5000 },
        { name: '📦 Kurir', min: 3000, max: 7000 },
        { name: '👨‍🍳 Koki', min: 4000, max: 10000 },
        { name: '👨‍💻 Programmer', min: 8000, max: 20000 },
        { name: '👨‍⚕️ Dokter', min: 15000, max: 30000 }
    ]
    
    const job = jobs[Math.floor(Math.random() * jobs.length)]
    const salary = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min
    const expGain = Math.floor(salary / 10)
    
    await m.reply(`💼 *sᴇᴅᴀɴɢ ʙᴇᴋᴇʀᴊᴀ...*\n> ${job.name}`)
    await new Promise(r => setTimeout(r, 2000))
    
    user.koin = (user.koin || 0) + salary
    const levelResult = await addExpWithLevelCheck(sock, m, db, user, expGain)
    
    db.save()
    
    let txt = `💼 *ᴡᴏʀᴋ sᴇʟᴇsᴀɪ*\n\n`
    txt += `╭┈┈⬡「 💰 *ɢᴀᴊɪ* 」\n`
    txt += `┃ 👔 Pekerjaan: ${job.name}\n`
    txt += `┃ 💵 Gaji: *+Rp ${salary.toLocaleString('id-ID')}*\n`
    txt += `┃ 🚄 Exp: *+${expGain}*\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡`
    
    await m.reply(txt)
}

export { pluginConfig as config, handler }