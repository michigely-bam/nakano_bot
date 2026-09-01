import { getDatabase } from '../../src/lib/ourin-database.js'

const pluginConfig = {
    name: 'antijudol',
    alias: ['antijudi', 'nojudi', 'antislot'],
    category: 'group',
    description: 'Deteksi konten judol di grup',
    usage: '.antijudol <on/off/metode> [kick/remove]',
    example: '.antijudol on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

function handler(m) {
    const db = getDatabase()
    const groupData = db.getGroup(m.chat) || {}
    const option = m.text?.toLowerCase()?.trim()

    if (!option) {
        const status = groupData.antijudol || 'off'
        const mode = groupData.antijudolMode || 'remove'
        return m.reply(
            `🎰 *ᴀɴᴛɪᴊᴜᴅᴏʟ*\n\n` +
            `> Status: *${status.toUpperCase()}*\n` +
            `> Mode: *${mode.toUpperCase()}*\n\n` +
            `> Deteksi konten judol seperti judi, slot, gacor, maxwin, togel, bonus member, link alternatif, dan pola sejenis.\n\n` +
            `> \`${m.prefix}antijudol on\`\n` +
            `> \`${m.prefix}antijudol off\`\n` +
            `> \`${m.prefix}antijudol metode kick\`\n` +
            `> \`${m.prefix}antijudol metode remove\``
        )
    }

    if (option === 'on') {
        db.setGroup(m.chat, { antijudol: 'on' })
        return m.reply('✅ *AntiJudol diaktifkan*')
    }

    if (option === 'off') {
        db.setGroup(m.chat, { antijudol: 'off' })
        return m.reply('❌ *AntiJudol dinonaktifkan*')
    }

    if (option.startsWith('metode')) {
        const method = m.args?.[1]?.toLowerCase()
        if (method === 'kick') {
            db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'kick' })
            return m.reply('✅ *AntiJudol mode KICK diaktifkan*')
        }
        if (method === 'remove' || method === 'delete') {
            db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'remove' })
            return m.reply('✅ *AntiJudol mode DELETE diaktifkan*')
        }
        return m.reply(`❌ Metode tidak valid! Gunakan: \`kick\` atau \`remove\``)
    }

    if (option === 'kick') {
        db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'kick' })
        return m.reply('✅ *AntiJudol mode KICK diaktifkan*')
    }

    if (option === 'remove' || option === 'delete') {
        db.setGroup(m.chat, { antijudol: 'on', antijudolMode: 'remove' })
        return m.reply('✅ *AntiJudol mode DELETE diaktifkan*')
    }

    return m.reply('❌ Opsi tidak valid! Gunakan: `on`, `off`, `metode kick`, `metode remove`')
}

export { pluginConfig as config, handler }
