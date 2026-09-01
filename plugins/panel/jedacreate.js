import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'jedacreate',
    alias: ['setjeda', 'paneljeda', 'jedapanel'],
    category: 'panel',
    description: 'Set jeda waktu untuk semua panel create command',
    usage: '.jedacreate <waktu>',
    example: '.jedacreate 5m',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true
}

function parseTime(input) {
    if (!input || input === '0') return 0
    
    const match = input.match(/^(\d+)(s|m|h)?$/i)
    if (!match) return null
    
    const value = parseInt(match[1])
    const unit = (match[2] || 's').toLowerCase()
    
    switch (unit) {
        case 's': return value * 1000
        case 'm': return value * 60 * 1000
        case 'h': return value * 60 * 60 * 1000
        default: return value * 1000
    }
}

function formatTime(ms) {
    if (ms <= 0) return 'Tanpa jeda'
    
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours} jam ${minutes % 60} menit`
    if (minutes > 0) return `${minutes} menit ${seconds % 60} detik`
    return `${seconds} detik`
}

function handler(m, { sock }) {
    const db = getDatabase()
    const input = m.text?.trim()
    
    const DEFAULT_JEDA = 5 * 60 * 1000
    
    if (!input) {
        const currentJeda = db.setting('panelCreateJeda') ?? DEFAULT_JEDA
        return m.reply(
            `⏱️ *ᴊᴇᴅᴀ ᴘᴀɴᴇʟ ᴄʀᴇᴀᴛᴇ*\n\n` +
            `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n` +
            `┃ ◦ Jeda saat ini: *${formatTime(currentJeda)}*\n` +
            `┃ ◦ Default: *5 menit*\n` +
            `╰┈┈⬡\n\n` +
            `> Gunakan: \`${m.prefix}jedacreate <waktu>\`\n` +
            `> Contoh: \`${m.prefix}jedacreate 5m\` (5 menit)\n` +
            `> Untuk nonaktifkan: \`${m.prefix}jedacreate 0\`\n\n` +
            `*Format waktu:*\n` +
            `• \`30s\` = 30 detik\n` +
            `• \`5m\` = 5 menit\n` +
            `• \`1h\` = 1 jam`
        )
    }
    
    const jedaMs = parseTime(input)
    
    if (jedaMs === null) {
        return m.reply(`❌ Format waktu tidak valid!\n\n> Contoh: 30s, 5m, 1h`)
    }
    
    db.setting('panelCreateJeda', jedaMs)
    db.setting('panelCreateLastUsed', 0)
    
    m.react('✅')
    
    if (jedaMs === 0) {
        return m.reply(
            `✅ *ᴊᴇᴅᴀ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ*\n\n` +
            `> Panel create sekarang tanpa jeda`
        )
    }
    
    return m.reply(
        `✅ *ᴊᴇᴅᴀ ᴅɪsᴇᴛ*\n\n` +
        `╭┈┈⬡「 ⏱️ *ᴋᴏɴꜰɪɢ* 」\n` +
        `┃ ◦ Jeda: *${formatTime(jedaMs)}*\n` +
        `╰┈┈⬡\n\n` +
        `> Setelah panel dibuat, SEMUA user harus menunggu ${formatTime(jedaMs)} sebelum bisa create lagi.`
    )
}

export { pluginConfig as config, handler }