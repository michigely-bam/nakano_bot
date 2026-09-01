import axios from 'axios'
import FormData from 'form-data'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: ['fakecall', 'fakecallwa'],
    alias: [],
    category: 'canvas',
    description: 'Membuat gambar fake call WhatsApp',
    usage: '.fakecall <nama> | <durasi>',
    example: '.fakecall Zann | 19.00',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function uploadTo0x0(buffer) {
    try {
        const form = new FormData()
        form.append('file', buffer, { filename: 'avatar.jpg', contentType: 'image/jpeg' })
        
        const response = await axios.post('https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk', form, {
            headers: form.getHeaders(),
            timeout: 30000
        })
        
        if (response.data?.status === 'success' && response.data?.files?.[0]?.url) {
            return response.data
        }
        return null
    } catch (e) {
        console.log('Upload error:', e.message)
        return null
    }
}

async function handler(m, { sock }) {
    const text = m.text
    
    if (!text || !text.includes('|')) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}fakecall <nama> | <durasi>\`\n\n` +
            `> Contoh: \`${m.prefix}fakecall Marin | 19.00\`\n\n` +
            `💡 *Tips:* Reply gambar untuk custom avatar`
        )
    }
    
    const [nama, durasi] = text.split('|').map(s => s.trim())
    
    if (!nama) {
        return m.reply(`❌ Nama tidak boleh kosong!`)
    }
    
    await m.react('🕕')
    
    try {
        let avatar = 'https://files.catbox.moe/nwvkbt.png'
        
        if (m.isImage) {
            try {
                const buffer = await m.download()
                const uploadedUrl = await uploadTo0x0(buffer)
                if (uploadedUrl) {
                    avatar = uploadedUrl
                }
            } catch {}
        } else if (m.quoted?.isImage) {
            try {
                const buffer = await m.quoted.download()
                const uploadedUrl = await uploadTo0x0(buffer)
                if (uploadedUrl) {
                    avatar = uploadedUrl
                }
            } catch {}
        } else {
            try {
                avatar = await sock.profilePictureUrl(m.sender, 'image')
            } catch {}
        }
        
        const apiUrl = `https://api.zenzxz.my.id/maker/fakecall?nama=${encodeURIComponent(nama)}&durasi=${encodeURIComponent(durasi)}&avatar=${encodeURIComponent(avatar)}`
        
        await sock.sendMedia(m.chat, apiUrl, null, m, {
            type: 'image'
        })
        
        m.react('📞')
        
    } catch (err) {
        m.react('☢')
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }