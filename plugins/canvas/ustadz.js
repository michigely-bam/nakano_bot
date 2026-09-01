import axios from 'axios'
import config from '../../config.js'
import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: 'ustadz',
    alias: ['ustad', 'quoteustadz', 'canvasustadz'],
    category: 'canvas',
    description: 'Buat quote gaya ustadz',
    usage: '.ustadz <text>',
    example: '.ustadz Jangan lupa sholat',
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
            `👲 *ᴄᴀɴᴠᴀs ᴜsᴛᴀᴅᴢ*\n\n` +
            `> Masukkan teks untuk dijadikan quote.\n\n` +
            `> Contoh: \`${m.prefix}ustadz Jangan lupa bersyukur\``
        )
    }
    
    m.react('🕕')
    
    try {
        const baseUrl = 'https://api.cuki.biz.id/api/canvas/ustadz?apikey=cuki-x&text=' + text
        const apikey = 'cuki-x'
        
        const response = await f(baseUrl)
        
        const imageUrl = response.results.url
        
        await sock.sendMedia(m.chat, imageUrl, null, m, {
            type: 'image',
        })
        
        m.react('✅')
        
    } catch (err) {
        console.error('[Canvas Ustadz]', err)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }