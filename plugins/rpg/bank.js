import { getDatabase } from '../../src/lib/ourin-database.js'
import { getRpgContextInfo } from '../../src/lib/ourin-context.js'
const pluginConfig = {
    name: 'bank',
    alias: ['atm', 'nabung', 'deposit', 'tarik', 'withdraw'],
    category: 'rpg',
    description: 'Bank system untuk menyimpan uang aman dari rampok',
    usage: '.bank <deposit/withdraw> <jumlah>',
    example: '.bank deposit 10000',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const cleanJid = m.sender.replace(/@.+/g, '')
    
    let user = db.getUser(m.sender)
    if (!user) {
        user = db.setUser(m.sender, {})
    }
    
    if (!db.db.data.users[cleanJid].rpg) {
        db.db.data.users[cleanJid].rpg = {}
    }
    if (typeof db.db.data.users[cleanJid].rpg.bank !== 'number') {
        db.db.data.users[cleanJid].rpg.bank = 0
    }
    
    const currentBalance = db.db.data.users[cleanJid].koin || 0
    const currentBank = db.db.data.users[cleanJid].rpg.bank || 0
    
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    const amountStr = args[1]
    
    if (action === 'deposit' || action === 'depo') {
        let amount = 0
        if (amountStr === 'all') {
            amount = currentBalance
        } else {
            amount = parseInt(amountStr)
        }
        
        if (!amount || amount <= 0) return m.reply(`❌ Masukkan jumlah valid!`)
        if (currentBalance < amount) return m.reply(`❌ Uang cash tidak cukup! Cash: Rp ${currentBalance.toLocaleString('id-ID')}`)
        
        db.db.data.users[cleanJid].koin = currentBalance - amount
        db.db.data.users[cleanJid].rpg.bank = currentBank + amount
        
        await db.save()
        
        const newBank = db.db.data.users[cleanJid].rpg.bank
        return m.reply(`✅ Berhasil deposit: Rp ${amount.toLocaleString('id-ID')}\n🏦 Bank: Rp ${newBank.toLocaleString('id-ID')}`)
    }
    
    if (action === 'withdraw' || action === 'tarik') {
        let amount = 0
        if (amountStr === 'all') {
            amount = currentBank
        } else {
            amount = parseInt(amountStr)
        }
        
        if (!amount || amount <= 0) return m.reply(`❌ Masukkan jumlah valid!`)
        if (currentBank < amount) return m.reply(`❌ Uang di bank tidak cukup! Bank: Rp ${currentBank.toLocaleString('id-ID')}`)
        
        db.db.data.users[cleanJid].rpg.bank = currentBank - amount
        db.db.data.users[cleanJid].koin = currentBalance + amount
        
        await db.save()
        
        const newBalance = db.db.data.users[cleanJid].koin
        return m.reply(`✅ Berhasil tarik: Rp ${amount.toLocaleString('id-ID')}\n💰 Cash: Rp ${newBalance.toLocaleString('id-ID')}`)
    }
    
    let txt = `🏦 *ʙᴀɴᴋ sʏsᴛᴇᴍ*\n\n`
    txt += `> 💰 Cash: Rp ${currentBalance.toLocaleString('id-ID')}\n`
    txt += `> 🏦 Bank: Rp ${currentBank.toLocaleString('id-ID')}\n\n`
    txt += `> Gunakan: \`.bank deposit <jumlah>\`\n`
    txt += `> Gunakan: \`.bank withdraw <jumlah>\`\n`
    txt += `> Tip: Gunakan 'all' untuk semua uang.`
    
    await m.reply(txt)
}

export { pluginConfig as config, handler }