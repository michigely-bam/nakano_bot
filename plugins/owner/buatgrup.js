const pluginConfig = {
    name: ['buatgrup', 'creategroup', 'newgroup'],
    alias: [],
    category: 'owner',
    description: 'Buat grup baru',
    usage: '.buatgrup <nama>|<nomor1,nomor2,...>',
    example: '.buatgrup Grup Baru|628xxx,628yyy',
    isOwner: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim() || ''
    const pipeIdx = text.indexOf('|')

    if (pipeIdx === -1) {
        return m.reply(
            '👥 *ʙᴜᴀᴛ ɢʀᴜᴘ ʙᴀʀᴜ*\n\n' +
            '> `.buatgrup Nama Grup|628xxx,628yyy`\n\n' +
            '• Gunakan `|` untuk memisahkan nama dan peserta\n' +
            '• Pisahkan nomor peserta dengan koma\n' +
            '• Bot otomatis menjadi admin\n\n' +
            '📝 Contoh:\n' +
            '> `.buatgrup Tim Alpha|628123,628456`'
        )
    }

    const name = text.substring(0, pipeIdx).trim()
    const participantsStr = text.substring(pipeIdx + 1).trim()

    if (!name || name.length < 2) {
        return m.reply('❌ Nama grup minimal 2 karakter.')
    }

    const participants = participantsStr
        .split(/[,;\s]+/)
        .map(n => n.replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 5)
        .map(n => n + '@s.whatsapp.net')

    if (participants.length === 0) {
        return m.reply('❌ Masukkan minimal 1 nomor peserta.')
    }

    try {
        const group = await sock.groupCreate(name, participants)
        await m.react('✅')
        return m.reply(
            `👥 *ɢʀᴜᴘ ᴅɪʙᴜᴀᴛ*\n\n` +
            `> Nama: ${name}\n` +
            `> ID: ${group.id}\n` +
            `> Peserta: ${participants.length} orang\n\n` +
            `_Bot otomatis menjadi admin_`
        )
    } catch (err) {
        return m.reply(`❌ Gagal membuat grup: ${err.message}`)
    }
}

export { pluginConfig as config, handler }
