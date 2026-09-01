import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'petshop',
    alias: ['tokopet', 'buypet', 'belipet'],
    category: 'rpg',
    description: 'Beli pet dari toko',
    usage: '.petshop <buy> <pet>',
    example: '.petshop buy cat',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const PETS_FOR_SALE = {
    cat: { name: '🐱 Kucing', price: 5000, desc: 'Luck tinggi, attack sedang' },
    dog: { name: '🐕 Anjing', price: 6000, desc: 'Attack tinggi, defense bagus' },
    bird: { name: '🐦 Burung', price: 4500, desc: 'Luck sangat tinggi' },
    fish: { name: '🐟 Ikan', price: 3000, desc: 'Murah, luck tinggi' },
    rabbit: { name: '🐰 Kelinci', price: 5500, desc: 'Balance semua stats' }
}

function handler(m) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    if (!user.inventory) user.inventory = {}
    
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    const petKey = args[1]?.toLowerCase()
    
    if (!action || action !== 'buy') {
        let txt = `🏪 *ᴘᴇᴛ sʜᴏᴘ*\n\n`
        txt += `> Beli pet untuk menemanimu berpetualang!\n\n`
        txt += `╭┈┈⬡「 🐾 *ᴘᴇᴛs* 」\n`
        
        for (const [key, pet] of Object.entries(PETS_FOR_SALE)) {
            txt += `┃ ${pet.name}\n`
            txt += `┃ 💰 Harga: ${pet.price.toLocaleString()}\n`
            txt += `┃ 📝 ${pet.desc}\n`
            txt += `┃ → \`${m.prefix}petshop buy ${key}\`\n┃\n`
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        txt += `💰 *Balance:* ${(user.koin || 0).toLocaleString()}`
        
        return m.reply(txt)
    }
    
    if (action === 'buy') {
        if (!petKey) {
            return m.reply(`❌ Pilih pet!\n\n> Contoh: \`${m.prefix}petshop buy cat\``)
        }
        
        if (user.rpg.pet) {
            return m.reply(`❌ Kamu sudah punya pet! Sell dulu atau gunakan breeding.`)
        }
        
        const petToBuy = PETS_FOR_SALE[petKey]
        if (!petToBuy) {
            return m.reply(`❌ Pet tidak ditemukan!`)
        }
        
        if ((user.koin || 0) < petToBuy.price) {
            return m.reply(
                `❌ *ʙᴀʟᴀɴᴄᴇ ᴋᴜʀᴀɴɢ*\n\n` +
                `> Harga: ${petToBuy.price.toLocaleString()}\n` +
                `> Balance: ${(user.koin || 0).toLocaleString()}`
            )
        }
        
        user.koin -= petToBuy.price
        
        user.rpg.pet = {
            type: petKey,
            name: petToBuy.name.split(' ')[1] || 'My Pet',
            level: 1,
            exp: 0,
            hunger: 80,
            stats: null
        }
        
        db.save()
        
        return m.reply(
            `🎉 *ᴘᴇᴛ ᴅɪʙᴇʟɪ!*\n\n` +
            `╭┈┈⬡「 🐾 *ɴᴇᴡ ᴘᴇᴛ* 」\n` +
            `┃ 🏷️ Nama: *${user.rpg.pet.name}*\n` +
            `┃ 🐾 Jenis: *${petToBuy.name}*\n` +
            `┃ 💰 Harga: *-${petToBuy.price.toLocaleString()}*\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> Gunakan \`${m.prefix}pet\` untuk melihat status pet!`
        )
    }
}

export { pluginConfig as config, handler }