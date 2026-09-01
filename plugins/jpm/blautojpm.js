import { getDatabase } from '../../src/lib/ourin-database.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'blautojpm',
    alias: ['blacklistautojpm', 'autojpmbl', 'listblautojpm'],
    category: 'jpm',
    description: 'Blacklist grup khusus Auto JPM menggunakan nomor urut',
    usage: '.blautojpm [nomor]',
    example: '.blautojpm 2 3 7',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    let blacklist = db.setting('autoJpmBlacklist') || []
    const allGroups = await sock.groupFetchAllParticipating()
    const groups = Object.values(allGroups).sort((a, b) => a.subject.localeCompare(b.subject))
    if (!m.text) {
        if (groups.length === 0) {
            return m.reply(`❌ Bot belum tergabung di grup mana pun.`)
        }

        let listText = `📋 *DAFTAR GRUP & AUTO-JPM BLACKLIST*\n\n`
        listText += `Di bawah ini adalah *${groups.length} grup* yang diikuti bot ${config.bot?.name}\n`
        listText += `Tanda *(🚫)* berarti grup sedang di-blacklist khusus untuk fitur Auto-JPM.\n\n`

        for (let i = 0; i < groups.length; i++) {
            const isBlacklisted = blacklist.includes(groups[i].id)
            const icon = isBlacklisted ? ' 🚫' : ''
            listText += `*${i + 1}.* ${groups[i].subject}${icon}\n`
        }

        listText += `\n*CARA BLACKLIST / UN-BLACKLIST :*\n`
        listText += `Ketik command diikuti dengan nomor grup yang ingin diubah (bisa lebih dari satu, pisahkan dengan spasi).\n\n`
        listText += `*Contoh:*\n`
        listText += `> \`${m.prefix}blautojpm 2 3 7\``

        return m.reply(listText)
    }
    const args = m.text.trim().split(/\s+/)
    const toggled = []
    for (const numStr of args) {
        const num = parseInt(numStr)
        if (!isNaN(num) && num > 0 && num <= groups.length) {
            const index = num - 1
            const targetGroup = groups[index] 
            if (blacklist.includes(targetGroup.id)) {
                blacklist = blacklist.filter(jid => jid !== targetGroup.id)
                toggled.push(`*${num}.* ${targetGroup.subject} ✅ *(Di-Unblacklist)*`)
            } else {
                blacklist.push(targetGroup.id)
                toggled.push(`*${num}.* ${targetGroup.subject} 🚫 ~(Di-Blacklist)~`)
            }
        }
    }

    if (toggled.length === 0) {
        return m.reply(`❌ Tidak ada nomor grup yang valid.\n\nKetik *${m.prefix}blautojpm* untuk melihat daftar nomor.`)
    }

    db.setting('autoJpmBlacklist', blacklist)
    m.react('✅')

    return m.reply(`📢 *STATUS AUTO-JPM BLACKLIST DIPERBARUI:*\n\n${toggled.join('\n')}`)
}

export { pluginConfig as config, handler }