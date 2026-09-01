import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
const pluginConfig = {
    name: 'pet',
    alias: ['mypet', 'hewanku', 'peliharaan'],
    category: 'rpg',
    description: 'Kelola pet/hewan peliharaan',
    usage: '.pet <feed/train/status>',
    example: '.pet status',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const PET_TYPES = {
    cat: { name: '🐱 Kucing', baseStats: { attack: 5, defense: 3, luck: 5 }, evolve: 'lion' },
    dog: { name: '🐕 Anjing', baseStats: { attack: 8, defense: 5, luck: 2 }, evolve: 'wolf' },
    bird: { name: '🐦 Burung', baseStats: { attack: 4, defense: 2, luck: 8 }, evolve: 'phoenix' },
    fish: { name: '🐟 Ikan', baseStats: { attack: 2, defense: 2, luck: 10 }, evolve: 'dragon' },
    rabbit: { name: '🐰 Kelinci', baseStats: { attack: 3, defense: 4, luck: 6 }, evolve: 'thunderbunny' },
    lion: { name: '🦁 Singa', baseStats: { attack: 15, defense: 10, luck: 8 }, evolve: null },
    wolf: { name: '🐺 Serigala', baseStats: { attack: 18, defense: 12, luck: 5 }, evolve: null },
    phoenix: { name: '🔥 Phoenix', baseStats: { attack: 12, defense: 8, luck: 15 }, evolve: null },
    dragon: { name: '🐉 Naga', baseStats: { attack: 20, defense: 15, luck: 12 }, evolve: null },
    thunderbunny: { name: '⚡ Thunder Bunny', baseStats: { attack: 10, defense: 12, luck: 18 }, evolve: null }
}

const FOOD_ITEMS = {
    bread: { name: '🍞 Roti', hunger: 10, exp: 5 },
    fish: { name: '🐟 Ikan', hunger: 20, exp: 10 },
    meat: { name: '🍖 Daging', hunger: 30, exp: 15 },
    fruit: { name: '🍎 Buah', hunger: 15, exp: 8 },
    premium_food: { name: '⭐ Premium Food', hunger: 50, exp: 30 }
}

function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    if (!user.inventory) user.inventory = {}
    
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    
    if (!user.rpg.pet) {
        return m.reply(
            `🐾 *ᴘᴇᴛ sʏsᴛᴇᴍ*\n\n` +
            `> Kamu belum punya pet!\n\n` +
            `💡 *Cara dapat pet:*\n` +
            `> • \`${m.prefix}petshop\` - Beli pet\n` +
            `> • \`${m.prefix}breeding\` - Breeding pets\n` +
            `> • Drop dari dungeon/boss`
        )
    }
    
    const pet = user.rpg.pet
    const petInfo = PET_TYPES[pet.type]
    
    if (!action || !['feed', 'train', 'status', 'rename', 'evolve'].includes(action)) {
        const maxHunger = 100
        const hungerStatus = pet.hunger >= 70 ? '😊 Kenyang' : pet.hunger >= 40 ? '😐 Normal' : '😰 Lapar!'
        
        let txt = `🐾 *ᴘᴇᴛ sᴛᴀᴛᴜs*\n\n`
        txt += `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n`
        txt += `┃ 🏷️ Nama: *${pet.name}*\n`
        txt += `┃ 🐾 Jenis: *${petInfo.name}*\n`
        txt += `┃ 📊 Level: *${pet.level || 1}*\n`
        txt += `┃ ✨ EXP: *${pet.exp || 0}/${(pet.level || 1) * 100}*\n`
        txt += `┃ 🍖 Hunger: *${pet.hunger}/${maxHunger}* ${hungerStatus}\n`
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        
        txt += `╭┈┈⬡「 💪 *sᴛᴀᴛs* 」\n`
        txt += `┃ ⚔️ Attack: *${pet.stats?.attack || petInfo.baseStats.attack}*\n`
        txt += `┃ 🛡️ Defense: *${pet.stats?.defense || petInfo.baseStats.defense}*\n`
        txt += `┃ 🍀 Luck: *${pet.stats?.luck || petInfo.baseStats.luck}*\n`
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        
        txt += `╭┈┈⬡「 📋 *ᴄᴏᴍᴍᴀɴᴅ* 」\n`
        txt += `┃ ${m.prefix}pet feed <food>\n`
        txt += `┃ ${m.prefix}pet train\n`
        txt += `┃ ${m.prefix}pet rename <name>\n`
        if (petInfo.evolve) {
            txt += `┃ ${m.prefix}pet evolve\n`
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡`
        
        return m.reply(txt)
    }
    
    if (action === 'feed') {
        const foodKey = args[1]?.toLowerCase()
        
        if (!foodKey) {
            let txt = `🍖 *ᴘᴇᴛ ꜰᴏᴏᴅ*\n\n`
            txt += `╭┈┈⬡「 🍽️ *ᴍᴀᴋᴀɴᴀɴ* 」\n`
            for (const [key, food] of Object.entries(FOOD_ITEMS)) {
                const have = user.inventory[key] || 0
                txt += `┃ ${food.name} (${have}x)\n`
                txt += `┃ 🍖 +${food.hunger} | ✨ +${food.exp} EXP\n`
                txt += `┃ → \`${key}\`\n┃\n`
            }
            txt += `╰┈┈┈┈┈┈┈┈⬡`
            return m.reply(txt)
        }
        
        const food = FOOD_ITEMS[foodKey]
        if (!food) {
            return m.reply(`❌ Makanan tidak ditemukan!`)
        }
        
        if ((user.inventory[foodKey] || 0) < 1) {
            return m.reply(`❌ Kamu tidak punya ${food.name}!`)
        }
        
        if (pet.hunger >= 100) {
            return m.reply(`❌ Pet sudah kenyang!`)
        }
        
        user.inventory[foodKey]--
        if (user.inventory[foodKey] <= 0) delete user.inventory[foodKey]
        
        pet.hunger = Math.min(100, pet.hunger + food.hunger)
        pet.exp = (pet.exp || 0) + food.exp
        
        const expNeeded = (pet.level || 1) * 100
        if (pet.exp >= expNeeded) {
            pet.level = (pet.level || 1) + 1
            pet.exp -= expNeeded
            pet.stats = pet.stats || { ...petInfo.baseStats }
            pet.stats.attack += 2
            pet.stats.defense += 1
            pet.stats.luck += 1
        }
        
        db.save()
        
        return m.reply(
            `🍖 *ᴍᴇᴍʙᴇʀɪ ᴍᴀᴋᴀɴ*\n\n` +
            `> ${pet.name} memakan ${food.name}!\n\n` +
            `╭┈┈⬡「 📊 *ᴜᴘᴅᴀᴛᴇ* 」\n` +
            `┃ 🍖 Hunger: *+${food.hunger}* (${pet.hunger}/100)\n` +
            `┃ ✨ EXP: *+${food.exp}*\n` +
            `╰┈┈┈┈┈┈┈┈⬡`
        )
    }
    
    if (action === 'train') {
        if (pet.hunger < 20) {
            return m.reply(`❌ Pet terlalu lapar untuk latihan! Beri makan dulu.`)
        }
        
        pet.hunger = Math.max(0, pet.hunger - 15)
        const expGain = 20 + Math.floor(Math.random() * 20)
        pet.exp = (pet.exp || 0) + expGain
        
        const expNeeded = (pet.level || 1) * 100
        let levelUp = false
        if (pet.exp >= expNeeded) {
            pet.level = (pet.level || 1) + 1
            pet.exp -= expNeeded
            pet.stats = pet.stats || { ...petInfo.baseStats }
            pet.stats.attack += 2
            pet.stats.defense += 1
            pet.stats.luck += 1
            levelUp = true
        }
        
        db.save()
        
        let txt = `🏋️ *ᴛʀᴀɪɴɪɴɢ ᴘᴇᴛ*\n\n`
        txt += `> ${pet.name} berlatih keras!\n\n`
        txt += `╭┈┈⬡「 📊 *ʀᴇsᴜʟᴛ* 」\n`
        txt += `┃ ✨ EXP: *+${expGain}*\n`
        txt += `┃ 🍖 Hunger: *-15*\n`
        if (levelUp) {
            txt += `┃ 🎉 *LEVEL UP!* → Level ${pet.level}\n`
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡`
        
        return m.reply(txt)
    }
    
    if (action === 'rename') {
        const newName = args.slice(1).join(' ')
        if (!newName || newName.length < 2 || newName.length > 15) {
            return m.reply(`❌ Nama harus 2-15 karakter!`)
        }
        
        pet.name = newName
        db.save()
        
        return m.reply(`✅ Pet renamed to *${newName}*!`)
    }
    
    if (action === 'evolve') {
        if (!petInfo.evolve) {
            return m.reply(`❌ Pet ini tidak bisa evolve lagi!`)
        }
        
        if ((pet.level || 1) < 10) {
            return m.reply(`❌ Pet harus level 10+ untuk evolve! (Current: ${pet.level || 1})`)
        }
        
        const evolvedPet = PET_TYPES[petInfo.evolve]
        pet.type = petInfo.evolve
        pet.stats = { ...evolvedPet.baseStats }
        pet.level = 1
        pet.exp = 0
        
        db.save()
        
        return m.reply(
            `🎉 *ᴇᴠᴏʟᴜᴛɪᴏɴ!*\n\n` +
            `> ${pet.name} berevolusi menjadi ${evolvedPet.name}!\n\n` +
            `╭┈┈⬡「 💪 *ɴᴇᴡ sᴛᴀᴛs* 」\n` +
            `┃ ⚔️ Attack: *${evolvedPet.baseStats.attack}*\n` +
            `┃ 🛡️ Defense: *${evolvedPet.baseStats.defense}*\n` +
            `┃ 🍀 Luck: *${evolvedPet.baseStats.luck}*\n` +
            `╰┈┈┈┈┈┈┈┈⬡`
        )
    }
}

export { pluginConfig as config, handler }