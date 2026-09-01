import { getDatabase } from '../../src/lib/ourin-database.js'
import { addExpWithLevelCheck } from '../../src/lib/ourin-level.js'
const pluginConfig = {
    name: 'lottery',
    alias: ['gacha', 'spin', 'undian'],
    category: 'rpg',
    description: 'Gacha/lottery untuk hadiah random',
    usage: '.lottery <1/10>',
    example: '.lottery 10',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 1,
    isEnabled: true
}

const GACHA_POOL = [
    { item: 'trash', name: '🗑️ Sampah', chance: 30, rarity: 'common' },
    { item: 'wood', name: '🪵 Kayu', chance: 20, qty: [3, 8], rarity: 'common' },
    { item: 'iron', name: '🔩 Besi', chance: 15, qty: [2, 5], rarity: 'common' },
    { item: 'gold', name: '🪙 Emas', chance: 10, qty: [1, 3], rarity: 'uncommon' },
    { item: 'potion', name: '🧪 Potion', chance: 8, qty: [1, 3], rarity: 'uncommon' },
    { item: 'diamond', name: '💎 Berlian', chance: 5, qty: [1, 2], rarity: 'rare' },
    { item: 'goldchest', name: '🎁 Gold Chest', chance: 3, qty: [1, 1], rarity: 'rare' },
    { item: 'diamondchest', name: '💎 Diamond Chest', chance: 1.5, qty: [1, 1], rarity: 'epic' },
    { item: 'mysterybox', name: '🎲 Mystery Box', chance: 0.8, qty: [1, 1], rarity: 'epic' },
    { item: 'goldsword', name: '🗡️ Pedang Emas', chance: 0.3, qty: [1, 1], rarity: 'legendary' },
    { item: 'diamondarmor', name: '💎 Armor Berlian', chance: 0.2, qty: [1, 1], rarity: 'legendary' },
    { item: 'divinecore', name: '⚡ Divine Core', chance: 0.1, qty: [1, 1], rarity: 'mythic' }
]

const RARITY_COLORS = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡',
    mythic: '🔴'
}

const GACHA_COST = 500

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.inventory) user.inventory = {}
    if (!user.rpg) user.rpg = {}
    
    const args = m.args || []
    const pulls = Math.min(10, Math.max(1, parseInt(args[0]) || 1))
    const totalCost = GACHA_COST * pulls
    
    if ((user.koin || 0) < totalCost) {
        return m.reply(
            `🎰 *ʟᴏᴛᴛᴇʀʏ ɢᴀᴄʜᴀ*\n\n` +
            `> Harga: ${GACHA_COST.toLocaleString()}/pull\n` +
            `> Total: ${totalCost.toLocaleString()} (${pulls}x)\n\n` +
            `❌ Balance kurang! Kamu punya: ${(user.koin || 0).toLocaleString()}`
        )
    }
    
    user.koin -= totalCost
    
    await m.react('🎰')
    await m.reply(`🎰 *sᴘɪɴɴɪɴɢ ${pulls}x...*`)
    await new Promise(r => setTimeout(r, 1500))
    
    const results = []
    let totalExp = 0
    
    for (let i = 0; i < pulls; i++) {
        const roll = Math.random() * 100
        let cumulative = 0
        let result = GACHA_POOL[0]
        
        for (const item of GACHA_POOL) {
            cumulative += item.chance
            if (roll <= cumulative) {
                result = item
                break
            }
        }
        
        if (result.item !== 'trash') {
            const qty = result.qty ? Math.floor(Math.random() * (result.qty[1] - result.qty[0] + 1)) + result.qty[0] : 1
            user.inventory[result.item] = (user.inventory[result.item] || 0) + qty
            results.push({ ...result, finalQty: qty })
            
            const expByRarity = { common: 10, uncommon: 30, rare: 80, epic: 150, legendary: 300, mythic: 500 }
            totalExp += expByRarity[result.rarity] || 10
        } else {
            results.push({ ...result, finalQty: 0 })
        }
    }
    
    await addExpWithLevelCheck(sock, m, db, user, totalExp)
    db.save()
    
    const grouped = {}
    for (const r of results) {
        if (!grouped[r.item]) {
            grouped[r.item] = { ...r, count: 0, totalQty: 0 }
        }
        grouped[r.item].count++
        grouped[r.item].totalQty += r.finalQty
    }
    
    let txt = `🎰 *ɢᴀᴄʜᴀ ʀᴇsᴜʟᴛ*\n\n`
    txt += `> Pulls: ${pulls}x | Cost: ${totalCost.toLocaleString()}\n\n`
    txt += `╭┈┈⬡「 🎁 *ʀᴇsᴜʟᴛ* 」\n`
    
    for (const [key, item] of Object.entries(grouped)) {
        const rarityIcon = RARITY_COLORS[item.rarity] || '⚪'
        if (item.item === 'trash') {
            txt += `┃ ${rarityIcon} ${item.name} x${item.count}\n`
        } else {
            txt += `┃ ${rarityIcon} ${item.name} x${item.totalQty} (${item.count} pull)\n`
        }
    }
    
    txt += `┃\n`
    txt += `┃ ✨ EXP: +${totalExp}\n`
    txt += `╰┈┈┈┈┈┈┈┈⬡`
    
    const hasRare = results.some(r => ['epic', 'legendary', 'mythic'].includes(r.rarity))
    await m.react(hasRare ? '🎉' : '✅')
    
    return m.reply(txt)
}

export { pluginConfig as config, handler }