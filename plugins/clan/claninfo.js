import { getDatabase } from '../../src/lib/ourin-database.js'
const pluginConfig = {
    name: 'claninfo',
    alias: ['infoclan', 'myclan', 'guildinfo'],
    category: 'clan',
    description: 'Lihat info clan',
    usage: '.claninfo [clan_id]',
    example: '.claninfo',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function expBar(exp, nextLevel) {
    const target = nextLevel * 10000
    const progress = Math.min(exp / target, 1)
    const filled = Math.round(progress * 10)
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${(progress * 100).toFixed(0)}%`
}

function getRankTitle(level) {
    if (level >= 50) return '👑 Legendary'
    if (level >= 30) return '💎 Diamond'
    if (level >= 20) return '🏆 Platinum'
    if (level >= 10) return '🥇 Gold'
    if (level >= 5) return '🥈 Silver'
    return '🥉 Bronze'
}

async function handler(m) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    let clanId = m.text?.trim() || user?.clanId

    if (!clanId) {
        return m.reply(
            `❌ Kamu belum punya clan\n\n` +
            `Buat: *.clancreate <nama>*\n` +
            `Gabung: *.clanjoin <id>*`
        )
    }

    if (!db.db.data.clans) db.db.data.clans = {}

    const clan = db.db.data.clans[clanId]
        || Object.values(db.db.data.clans).find(c => c.name.toLowerCase() === clanId.toLowerCase())
        || Object.values(db.db.data.clans).find(c => c.id.toLowerCase() === clanId.toLowerCase())
    if (!clan) return m.reply(`❌ Clan tidak ditemukan`)

    const totalGames = (clan.wins || 0) + (clan.losses || 0)
    const winRate = totalGames > 0
        ? ((clan.wins / totalGames) * 100).toFixed(1)
        : '—'

    const rank = getRankTitle(clan.level || 1)
    const emblem = clan.emblem || '🏰'
    const bar = expBar(clan.exp || 0, clan.level || 1)

    await m.reply(
        `${emblem} *${clan.name}*\n` +
        `${rank} · Level ${clan.level || 1}\n\n` +
        `EXP  ${bar}\n\n` +
        `┌ 👑 Leader · @${clan.leader.split('@')[0]}\n` +
        `├ 👥 Members · ${clan.members.length}/50\n` +
        `├ 🔓 Status · ${clan.isOpen ? 'Open' : 'Closed'}\n` +
        `└ 📅 Dibuat · ${new Date(clan.createdAt).toLocaleDateString('id-ID')}\n\n` +
        `⚔️ *War Stats*\n` +
        `${clan.wins || 0}W · ${clan.losses || 0}L · ${winRate}% WR\n\n` +
        `_${clan.description || 'Belum ada deskripsi'}_\n\n` +
        `ID: \`${clan.id}\``,
        { mentions: [clan.leader] }
    )
}

export { pluginConfig as config, handler }