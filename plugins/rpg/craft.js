import { getDatabase } from '../../src/lib/ourin-database.js'
import { getRpgContextInfo } from '../../src/lib/ourin-context.js'
const pluginConfig = {
    name: 'craft',
    alias: ['buat', 'create'],
    category: 'rpg',
    description: 'Craft item dari materials',
    usage: '.craft <item>',
    example: '.craft sword',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

const RECIPES = {
    sword: {
        name: '⚔️ Iron Sword',
        materials: { iron: 5, coal: 3 },
        result: 'sword',
        bonus: { attack: 10 }
    },
    armor: {
        name: '🛡️ Iron Armor',
        materials: { iron: 10, coal: 5 },
        result: 'armor',
        bonus: { defense: 15 }
    },
    pickaxe: {
        name: '⛏️ Diamond Pickaxe',
        materials: { diamond: 3, iron: 2 },
        result: 'pickaxe',
        bonus: { mining: 20 }
    },
    rod: {
        name: '🎣 Golden Rod',
        materials: { gold: 5, iron: 2 },
        result: 'rod',
        bonus: { fishing: 20 }
    },
    potion: {
        name: '🥤 Health Potion',
        materials: { fish: 3, rabbit: 2 },
        result: 'potion',
        qty: 2
    }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.inventory) user.inventory = {}
    if (!user.rpg) user.rpg = {}
    
    const args = m.args || []
    const itemKey = args[0]?.toLowerCase()
    
    if (!itemKey) {
        let txt = `🔨 *ᴄʀᴀꜰᴛ ʀᴇᴄɪᴘᴇs*\n\n`
        
        for (const [key, recipe] of Object.entries(RECIPES)) {
            txt += `╭┈┈⬡「 ${recipe.name} 」\n`
            txt += `┃ 📦 Materials:\n`
            for (const [mat, qty] of Object.entries(recipe.materials)) {
                const userHas = user.inventory[mat] || 0
                const status = userHas >= qty ? '✅' : '❌'
                txt += `┃   ${status} ${mat}: ${userHas}/${qty}\n`
            }
            txt += `┃ 🔧 ID: \`${key}\`\n`
            txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        }
        
        txt += `> Craft: \`.craft <id>\``
        return m.reply(txt)
    }
    
    const recipe = RECIPES[itemKey]
    if (!recipe) {
        return m.reply(`❌ Recipe tidak ditemukan!\nLihat list: \`.craft\``)
    }
    
    for (const [mat, qty] of Object.entries(recipe.materials)) {
        if ((user.inventory[mat] || 0) < qty) {
            return m.reply(`❌ Material tidak cukup!\n> ${mat}: ${user.inventory[mat] || 0}/${qty}`)
        }
    }
    
    for (const [mat, qty] of Object.entries(recipe.materials)) {
        user.inventory[mat] -= qty
    }
    
    const resultQty = recipe.qty || 1
    user.inventory[recipe.result] = (user.inventory[recipe.result] || 0) + resultQty
    
    if (recipe.bonus) {
        for (const [stat, value] of Object.entries(recipe.bonus)) {
            user.rpg[stat] = (user.rpg[stat] || 0) + value
        }
    }
    
    let txt = `🔨 *ᴄʀᴀꜰᴛ sᴜᴋsᴇs*\n\n`
    txt += `> ✅ Berhasil membuat ${recipe.name} x${resultQty}!`
    
    if (recipe.bonus) {
        txt += `\n> 📈 Stat bonus applied!`
    }
    
    await m.reply(txt)
}

export { pluginConfig as config, handler }