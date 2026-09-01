import config from '../../config.js'
import te from '../../src/lib/ourin-error.js'
import { addExifToWebp, isAnimatedWebp, DEFAULT_METADATA } from '../../src/lib/ourin-exif.js'

const pluginConfig = {
    name: 'swm',
    alias: ['wm', 'stickerwm', 'stickermark', 'colong'],
    category: 'sticker',
    description: 'Mengganti packname dan author pada sticker',
    usage: '.swm <packname> atau .swm <packname>|<author>',
    example: '.swm BotName',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, config: botConfig }) {
    const quoted = m.quoted
    
    if (!quoted) {
        return m.reply(
            `🖼️ *sᴛɪᴄᴋᴇʀ ᴡᴀᴛᴇʀᴍᴀʀᴋ*\n\n` +
            `> Reply sticker dengan caption:\n` +
            `> \`${m.prefix}swm packname\`\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `> \`${m.prefix}swm Ourin-AI\`\n` +
            `> \`${m.prefix}swm Ourin-AI|LuckyArchz\` _(packname + author)_`
        )
    }
    
    const isSticker = quoted.type === 'stickerMessage' || quoted.isSticker
    if (!isSticker) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Reply pesan sticker, bukan ${quoted.type?.replace('Message', '') || 'media lain'}`)
    }
    
    const input = m.text?.trim()
    if (!input) {
        return m.reply(
            `❌ *ɢᴀɢᴀʟ*\n\n` +
            `> Masukkan packname\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `> \`${m.prefix}swm Ourin-AI\`\n` +
            `> \`${m.prefix}swm Ourin-AI|LuckyArchz\` _(+ author)_`
        )
    }
    
    let packname, author
    
    if (input.includes('|')) {
        const parts = input.split('|')
        packname = parts[0]?.trim() || ''
        author = parts[1]?.trim() || ''
    } else {
        packname = input
        author = ''
    }
    
    m.react('🕕')
    
    try {
        const buffer = await quoted.download()
        
        if (!buffer || buffer.length === 0) {
            m.react('❌')
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Gagal mendownload sticker`)
        }
        
        const exifOpts = { packname, author, emojis: ['🤖'] }
        const riff = buffer.slice(0, 4).toString('ascii')
        const webpSig = buffer.length >= 12 ? buffer.slice(8, 12).toString('ascii') : ''
        const isWebp = riff === 'RIFF' && webpSig === 'WEBP'
        
        if (isWebp) {
            const stickerBuffer = await addExifToWebp(buffer, exifOpts)
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer,
                contextInfo: { isForwarded: true, forwardingScore: 1 }
            }, { quoted: m })
        } else {
            const isVideo = buffer.slice(0, 3).toString('hex') === '000000' ||
                            buffer.slice(4, 8).toString('ascii') === 'ftyp'
            
            if (isVideo) {
                await sock.sendVideoAsSticker(m.chat, buffer, m, exifOpts)
            } else {
                await sock.sendImageAsSticker(m.chat, buffer, m, exifOpts)
            }
        }
        
        m.react('✅')
        
    } catch (error) {
        console.error('[SWM] Error:', error.message)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }