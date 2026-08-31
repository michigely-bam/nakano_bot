import fs from 'fs'
import path from 'path'
import { getDatabase } from './ourin-database.js'
import { logger } from './ourin-logger.js'
import * as jasaotp from './ourin-otp-service.js'
import * as pakasir from './ourin-pakasir.js'
let pollerInterval = null
let sock = null

async function startOtpPoller(socketInstance) {
    sock = socketInstance

    if (pollerInterval) clearInterval(pollerInterval)

    if (!jasaotp.isEnabled()) {
        logger.info('OtpPoller', 'JasaOTP not configured, skipping poller')
        return
    }

    pollerInterval = setInterval(checkPendingOtpOrders, 10000)
    logger.info('OtpPoller', 'Started with 10s interval')

    checkPendingOtpOrders()
}

function stopOtpPoller() {
    if (pollerInterval) {
        clearInterval(pollerInterval)
        pollerInterval = null
        logger.info('OtpPoller', 'Stopped')
    }
}

async function checkPendingOtpOrders() {
    if (!sock) return

    try {
        const db = getDatabase()
        const orders = db.db?.data?.otpOrders || {}

        for (const [orderId, order] of Object.entries(orders)) {
            if (order.status === 'pending_payment') {
                await handlePendingPayment(orderId, order, db)
            } else if (order.status === 'waiting_otp') {
                await handleWaitingOtp(orderId, order, db)
            }
        }
    } catch (error) {
        logger.error('OtpPoller', `Error: ${error.message}`)
    }
}

async function handlePendingPayment(orderId, order, db) {
    const timeoutMs = (jasaotp.getTimeout() + 120) * 1000
    const elapsed = Date.now() - new Date(order.createdAt).getTime()

    if (elapsed > timeoutMs) {
        order.status = 'expired'
        db.save()
        notifyUser(order, `⏰ *ᴘᴇᴍʙᴀʏᴀʀᴀɴ ᴋᴀᴅᴀʟᴜᴀʀsᴀ*\n\n> Order ID: \`${orderId}\`\n> Pembayaran tidak diterima dalam waktu yang ditentukan.\n> Silakan buat pesanan baru.`)
        return
    }

    if (!pakasir.isEnabled()) return

    try {
        const txStatus = await pakasir.checkTransaction(order.pakasirOrderId, order.totalPayment)

        if (txStatus && txStatus.status === 'completed') {
            logger.success('OtpPoller', `Payment ${orderId} completed, creating JasaOTP order...`)

            order.status = 'creating_otp'
            order.paidAt = new Date().toISOString()
            db.save()

            notifyUser(order,
                `✅ *ᴘᴇᴍʙᴀʏᴀʀᴀɴ ʙᴇʀʜᴀsɪʟ!*\n\n` +
                `> Order ID: \`${orderId}\`\n` +
                `> Metode: *${txStatus.payment_method?.toUpperCase() || 'QRIS'}*\n\n` +
                `🕕 Sedang memproses pesanan OTP...\n` +
                `> Mohon tunggu sebentar, bot sedang mengambil nomor untuk kamu.`
            )

            try {
                const otpResult = await jasaotp.createOrder(
                    order.countryId, order.service, order.operator
                )

                order.jasaotpOrderId = otpResult.orderId
                order.phoneNumber = otpResult.number
                order.status = 'waiting_otp'
                order.otpStartedAt = new Date().toISOString()
                db.save()

                logger.success('OtpPoller', `JasaOTP order created: ${otpResult.orderId} → ${otpResult.number}`)

                notifyUser(order,
                    `📱 *ɴᴏᴍᴏʀ sɪᴀᴘ!*\n\n` +
                    `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
                    `┃ 🆔 Order: \`${orderId}\`\n` +
                    `┃ 📱 Nomor: \`${otpResult.number}\`\n` +
                    `┃ 📦 Layanan: \`${order.serviceName}\`\n` +
                    `┃ 🌍 Negara: \`${order.countryName}\`\n` +
                    `╰┈┈⬡\n\n` +
                    `📝 *ᴘᴀɴᴅᴜᴀɴ:*\n` +
                    `> 1. Gunakan nomor di atas untuk mendaftar/verifikasi\n` +
                    `> 2. Kode OTP akan otomatis dikirim ke *Private Chat* (Demi keamanan)\n` +
                    `> 3. Tunggu max ${Math.ceil(jasaotp.getTimeout() / 60)} menit\n\n` +
                    `> 🕕 Bot sedang menunggu kode OTP masuk...`
                )
            } catch (otpError) {
                logger.error('OtpPoller', `JasaOTP order failed: ${otpError.message}`)

                order.status = 'failed'
                order.failReason = otpError.message
                db.save()

                
                const ownerContact = config.owner?.number?.[0] || '-'
                
                await handleRefund(orderId, order, db, 
                    `Sistem sedang sibuk atau saldo/stok habis.\n` +
                    `Error: ${otpError.message}\n\n` +
                    `> Refund otomatis sedang diproses.\n` +
                    `> Jika ada kendala, hubungi Owner: wa.me/${ownerContact}`
                )
            }
        }
    } catch (err) {
        logger.debug('OtpPoller', `Payment check ${orderId}: ${err.message}`)
    }
}

async function handleWaitingOtp(orderId, order, db) {
    const timeoutMs = jasaotp.getTimeout() * 1000
    const elapsed = Date.now() - new Date(order.otpStartedAt).getTime()

    if (elapsed > timeoutMs) {
        logger.info('OtpPoller', `OTP timeout for ${orderId}`)

        order.status = 'timeout'
        db.save()

        try {
            await jasaotp.cancelOrder(order.jasaotpOrderId)
            logger.info('OtpPoller', `JasaOTP order ${order.jasaotpOrderId} cancelled`)
        } catch (e) {
            logger.error('OtpPoller', `Cancel JasaOTP failed: ${e.message}`)
        }

        await handleRefund(orderId, order, db, 'Kode OTP tidak diterima dalam waktu yang ditentukan')
        return
    }

    try {
        const otp = await jasaotp.checkSms(order.jasaotpOrderId)

        if (otp) {
            order.status = 'completed'
            order.otpCode = otp
            order.completedAt = new Date().toISOString()
            db.save()
            logger.success('OtpPoller', `OTP received for ${orderId}: ${otp}`)
            if (sock) {
                try {
                    await sock.sendMessage(order.buyerJid, {
                        text: `🔐 *ᴋᴏᴅᴇ ᴏᴛᴘ ᴅɪᴛᴇʀɪᴍᴀ!*\n\n` +
                              `> Order ID: \`${orderId}\`\n` +
                              `> Layanan: ${order.serviceName}\n\n` +
                              `🔑 Kode OTP: *${otp}*\n\n` +
                              `> Kode bersifat RAHASIA. Jangan berikan ke siapapun!\n` +
                              `> Terima kasih telah menggunakan layanan kami 🙏`
                    })
                } catch (e) {
                    logger.error('OtpPoller', `Failed to send PM: ${e.message}`)
                }
            }
            notifyUser(order,
                `✅ *sᴇsɪ sᴇʟᴇsᴀɪ*\n\n` +
                `Halo @${order.buyerJid.split('@')[0]}, kode OTP untuk pesanan \`${orderId}\` telah dikirim ke *Private Chat* (PM) kamu.\n\n` +
                `> 📩 Cek chat pribadi dari bot sekarang.\n` +
                `> Demi keamanan, kode tidak ditampilkan di sini.\n\n` +
                `> Terima kasih! ❤️`
            )
        }
    } catch (err) {
        logger.debug('OtpPoller', `SMS check ${orderId}: ${err.message}`)
    }
}

async function handleRefund(orderId, order, db, reason) {
    let refundSuccess = false

    if (pakasir.isEnabled() && order.pakasirOrderId) {
        try {
            await pakasir.cancelTransaction(order.pakasirOrderId, order.totalPayment)
            refundSuccess = true
            logger.info('OtpPoller', `Pakasir refund for ${orderId} success`)
        } catch (e) {
            logger.error('OtpPoller', `Pakasir refund failed: ${e.message}`)
        }
    }

    order.status = 'refunded'
    order.refundedAt = new Date().toISOString()
    order.refundSuccess = refundSuccess
    db.save()

    
    const ownerContact = config.owner?.number?.[0] || '-'

    notifyUser(order,
        `❌ *ᴘᴇsᴀɴᴀɴ ɢᴀɢᴀʟ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ 🆔 Order: \`${orderId}\`\n` +
        `┃ 📦 Layanan: \`${order.serviceName}\`\n` +
        `┃ ❌ Alasan: ${reason}\n` +
        `╰┈┈⬡\n\n` +
        (refundSuccess
            ? `✅ *Dana telah di-refund otomatis*\n> Saldo pembayaran kamu akan dikembalikan.\n\n`
            : `⚠️ *Refund otomatis gagal*\n> Silakan hubungi admin untuk pengembalian dana manual.\n\n`) +
        `> 📞 *Contact Owner:* wa.me/${ownerContact}\n` +
        `> Kami mohon maaf atas ketidaknyamanan ini 🙏`
    )
}

async function notifyUser(order, text) {
    if (!sock || !order.chatId) return

    try {
        
        
        const otpImage = path.join(process.cwd(), 'assets', 'images', 'ourin-otp.jpg')

        if (fs.existsSync(otpImage)) {
            sock.sendMessage(order.chatId, {
                image: fs.readFileSync(otpImage),
                caption: text,
                mentions: [order.buyerJid]
            }).catch(() => {})
        } else {
            sock.sendMessage(order.chatId, {
                text,
                mentions: [order.buyerJid]
            }).catch(() => {})
        }
    } catch (e) {}
}

function getOtpOrder(orderId) {
    const db = getDatabase()
    return db.db?.data?.otpOrders?.[orderId] || null
}

function createOtpOrder(orderId, data) {
    const db = getDatabase()

    if (!db.db.data.otpOrders) {
        db.db.data.otpOrders = {}
    }

    db.db.data.otpOrders[orderId] = {
        orderId,
        ...data,
        createdAt: new Date().toISOString()
    }

    db.save()
    return db.db.data.otpOrders[orderId]
}

function updateOtpOrder(orderId, data) {
    const db = getDatabase()

    if (db.db?.data?.otpOrders?.[orderId]) {
        db.db.data.otpOrders[orderId] = {
            ...db.db.data.otpOrders[orderId],
            ...data
        }
        db.save()
        return db.db.data.otpOrders[orderId]
    }

    return null
}

function getOtpOrdersByBuyer(buyerJid) {
    const db = getDatabase()
    const orders = db.db?.data?.otpOrders || {}
    return Object.entries(orders)
        .filter(([, o]) => o.buyerJid === buyerJid)
        .map(([id, o]) => ({ ...o, orderId: id }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function getOtpOrdersByGroup(groupId) {
    const db = getDatabase()
    const orders = db.db?.data?.otpOrders || {}
    return Object.entries(orders)
        .filter(([, o]) => o.chatId === groupId)
        .map(([id, o]) => ({ ...o, orderId: id }))
}

export { startOtpPoller, stopOtpPoller, checkPendingOtpOrders, getOtpOrder, createOtpOrder, updateOtpOrder, getOtpOrdersByBuyer, getOtpOrdersByGroup }