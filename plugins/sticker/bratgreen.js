import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: 'bratgreen',
    alias: ['brat2'],
    category: 'sticker',
    description: 'Membuat sticker brat ijo',
    usage: '.brat2 <text>',
    example: '.brat2 Hai semua',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text
    if (!text) {
        return m.reply(`🖼️ *ʙʀᴀᴛ ɢʀᴇᴇɴ*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratgreen Hai semua\``)
    }
    
    m.react('🕕')
    
    try {
        const url = `https://api.ourin.my.id/api/brat-grenn?text=${encodeURIComponent(text)}`
        await sock.sendImageAsSticker(m.chat, url, m, {
            packname: config.sticker.packname,
            author: config.sticker.author
        })
        
        m.react('✅')
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }