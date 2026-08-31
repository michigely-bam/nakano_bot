import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: 'ai4chat',
    alias: ['ai'],
    category: 'ai',
    description: 'Chat dengan AI4Chat',
    usage: '.ai4chat <pertanyaan>',
    example: '.ai4chat Apa itu JavaScript?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m) {
    const text = m.text
    if (!text) {
        return m.reply(`🤖 *ᴀɪᴄʜᴀᴛ*\n\n> Masukkan pertanyaan\n\n\`Contoh: ${m.prefix}ai4chat Apa itu JavaScript?\``)
    }
    m.react('🕕')
    try {
        const data = await f(`https://api.zenzxz.my.id/ai/copilot?message=${encodeURIComponent(text)}&model=gpt-5`)
        m.react('✅')
        await m.reply(`${data.result.text}`)
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }
