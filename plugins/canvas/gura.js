import axios from 'axios'
import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: 'gura',
    alias: ['gawr'],
    category: 'canvas',
    description: 'Apply efek Gawr Gura ke gambar',
    usage: '.gura (reply/caption gambar)',
    example: '.gura',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    let mediaMsg = null
    let downloadFn = null
    
    if (m.isImage || m.message?.imageMessage) {
        mediaMsg = m
        downloadFn = m.download
    } else if (m.quoted?.isImage || m.quoted?.message?.imageMessage) {
        mediaMsg = m.quoted
        downloadFn = m.quoted.download
    }
    
    if (!mediaMsg) {
        return m.reply(`🦈 *ɢᴜʀᴀ ᴇғғᴇᴄᴛ*\n\n> Kirim/reply gambar dengan command ini`)
    }
    
    m.react('🕕')
    
    try {
        const buffer = await downloadFn()
        const formData = new FormData()
        formData.append('file', new Blob([buffer]), 'image.jpg')
        
        const uploadRes = await axios.post('https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        let imageUrl = uploadRes.data.data.url
        
        await sock.sendMedia(m.chat, `https://api.nexray.web.id/canvas/gura?url=${encodeURIComponent(imageUrl)}`, null, m, {
            type: 'image',
        })
        
        m.react('✅')
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }