import { generateCarbon } from '../../src/lib/ourin-carbon.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: ['carbon', 'carbonify', 'carboncode'],
    alias: [],
    category: 'tools',
    description: 'Membuat gambar kode dengan tampilan carbon style',
    usage: '.carbon <kode>',
    example: '.carbon console.log("Hello World")',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text || m.quoted?.text
    
    if (!text) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}carbon <kode>\`\n` +
            `> Atau reply pesan berisi kode\n\n` +
            `> Contoh: \`${m.prefix}carbon console.log("Hello")\``
        )
    }
    
    await m.react('🕕')
    
    try {
        const buffer = await generateCarbon(text)
        
        await sock.sendMedia(m.chat, buffer, null, m, {
            type: 'image'
        })
        
        m.react('🖥️')
        
    } catch (err) {
        m.react('☢')
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }