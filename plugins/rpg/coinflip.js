import { getDatabase } from '../../src/lib/ourin-database.js'
import { getRpgContextInfo } from '../../src/lib/ourin-context.js'
const pluginConfig = {
    name: 'coinflip',
    alias: ['cf', 'flip', 'toss'],
    category: 'rpg',
    description: 'Gambling coin flip',
    usage: '.coinflip <heads/tails> <bet>',
    example: '.coinflip heads 5000',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    const args = m.args || []
    const choice = args[0]?.toLowerCase()
    const bet = parseInt(args[1])
    
    if (!choice || (choice !== 'heads' && choice !== 'tails' && choice !== 'h' && choice !== 't')) {
        return m.reply(
            `🪙 *ᴄᴏɪɴ ꜰʟɪᴘ*\n\n` +
            `╭┈┈⬡「 📋 *ᴜsᴀɢᴇ* 」\n` +
            `┃ > Pilih heads (h) atau tails (t)\n` +
            `┃ > \`.coinflip heads 5000\`\n` +
            `╰┈┈┈┈┈┈┈┈⬡`
        )
    }
    
    if (!bet || bet < 1000) {
        return m.reply(
            `❌ *ɪɴᴠᴀʟɪᴅ ʙᴇᴛ*\n\n` +
            `> Minimal bet Rp 1.000!\n` +
            `> Contoh: \`.coinflip heads 5000\``
        )
    }
    
    if ((user.koin || 0) < bet) {
        return m.reply(
            `❌ *sᴀʟᴅᴏ ᴛɪᴅᴀᴋ ᴄᴜᴋᴜᴘ*\n\n` +
            `> Koin kamu: Rp ${(user.koin || 0).toLocaleString('id-ID')}\n` +
            `> Butuh: Rp ${bet.toLocaleString('id-ID')}`
        )
    }
    
    user.koin -= bet
    
    const userChoice = (choice === 'heads' || choice === 'h') ? 'heads' : 'tails'
    const result = Math.random() < 0.5 ? 'heads' : 'tails'
    const emoji = result === 'heads' ? '🪙' : '⭕'
    
    await sock.sendMessage(m.chat, { text: `🪙 *ꜰʟɪᴘᴘɪɴɢ...*`, contextInfo: getRpgContextInfo('🪙 COINFLIP', 'Flipping!') }, { quoted: m })
    await new Promise(r => setTimeout(r, 1500))
    
    const isWin = userChoice === result
    
    let txt = `🪙 *ᴄᴏɪɴ ꜰʟɪᴘ*\n\n`
    txt += `> ${emoji} Hasil: *${result.toUpperCase()}*\n`
    txt += `> 🎯 Pilihanmu: *${userChoice.toUpperCase()}*\n\n`
    
    if (isWin) {
        const winnings = bet * 2
        user.koin = (user.koin || 0) + winnings
        txt += `✅ *ᴋᴀᴍᴜ ᴍᴇɴᴀɴɢ!*\n`
        txt += `> 💰 Win: *+Rp ${winnings.toLocaleString('id-ID')}*`
    } else {
        txt += `❌ *ᴋᴀᴍᴜ ᴋᴀʟᴀʜ!*\n`
        txt += `> 💸 Lost: *-Rp ${bet.toLocaleString('id-ID')}*`
    }
    
    db.save()
    await sock.sendMessage(m.chat, { text: txt, contextInfo: getRpgContextInfo('🪙 COINFLIP', 'Result!') }, { quoted: m })
}

export { pluginConfig as config, handler }