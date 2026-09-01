import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: 'bratvermeil',
    alias: ['bratv', 'bratnime'],
    category: 'sticker',
    description: 'Membuat sticker brat versi Vermeil',
    usage: '.bratvermeil <text>',
    example: '.bratvermeil Jangan lupa makan',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim()
    
    if (!text) {
        return m.reply(
            `👿 *ʙʀᴀᴛ ᴠᴇʀᴍᴇɪʟ*\n\n` +
            `> Masukkan teks untuk dijadikan sticker.\n\n` +
            `> Contoh: \`${m.prefix}bratvermeil Jangan lupa makan\``
        )
    }
    
    m.react('🎨')
    
    try {
        const apikey = 'cuki-x'
        const baseUrl = `https://api.cuki.biz.id/api/canvas/brat/bratnime-vermeil?text=${encodeURIComponent(text)}&apikey=${apikey}`
        await sock.sendImageAsSticker(m.chat, baseUrl, m, {
            packname: config.sticker?.packname || 'Ourin-AI',
            author: config.sticker?.author || 'Brat Vermeil'
        })
        
        m.react('✅')
        
    } catch (err) {
        console.error('[Brat Vermeil]', err)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }