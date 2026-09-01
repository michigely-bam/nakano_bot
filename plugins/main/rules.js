import config from '../../config.js'
import { getDatabase } from '../../src/lib/ourin-database.js'

const pluginConfig = {
    name: 'rules',
    alias: ['aturanbot', 'botrules'],
    category: 'main',
    description: 'Menampilkan rules/aturan bot',
    usage: '.rules',
    example: '.rules',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

const DEFAULT_BOT_RULES = [
    'Jangan spam command',
    'Gunakan fitur dengan bijak',
    'Dilarang menyalahgunakan bot',
    'Hormati sesama pengguna',
    'Report bug ke owner',
    'Jangan request fitur aneh',
    'Bot bukan 24/7, ada maintenance'
]

async function handler(m, { sock, config: botConfig }) {
    try {
        const db = getDatabase()
        const customRules = db.setting('botRules')

        let rulesList = DEFAULT_BOT_RULES

        if (customRules) {
            rulesList = customRules
                .split('\n')
                .map(v => v.replace(/^[^a-zA-Z0-9]+/, '').trim())
                .filter(Boolean)
        }

        const tableData = rulesList.map((rule, i) => [
            `${i + 1}`,
            rule
        ])

        await sock.sendTable(
            m.chat,
            '📜 Aturan Bot',
            ['No', 'Rule'],
            tableData,
            m,
            {
                headerText: `${botConfig.bot?.name || 'Ourin-AI'} *RULES*`,
                footer: 'Pelanggaran dapat mengakibatkan banned / kick!'
            }
        )
    } catch (e) {
        m.reply('Terjadi kesalahan saat mengambil rules')
    }
}

export { pluginConfig as config, handler }