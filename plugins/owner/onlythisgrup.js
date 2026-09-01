import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'onlythisgrup',
    alias: ['onlythisgroup', 'lockgrup', 'lockgroup'],
    category: 'owner',
    description: 'Bot hanya aktif di grup ini saja',
    usage: '.onlythisgrup',
    example: '.onlythisgrup',
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const current = db.setting('onlyThisGroup') || null

    if (current === m.chat) {
        db.setting('onlyThisGroup', null)
        db.save()
        return m.reply(`🔓 *UNLOCKED*\n\nBot aktif di semua grup`)
    }

    db.setting('onlyThisGroup', m.chat)
    db.save()

    const meta = await sock.groupMetadata(m.chat).catch(() => null)
    const groupName = meta?.subject || m.chat

    await m.reply(
        `🔒 *LOCKED*\n\n` +
        `Bot hanya aktif di:\n` +
        `*${groupName}*\n\n` +
        `Grup lain tidak bisa pakai bot\n` +
        `Ketik ulang untuk unlock`
    )
}

export { pluginConfig as config, handler }