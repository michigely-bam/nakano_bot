import axios from 'axios'
import config from '../../config.js'
const PAKASIR_BASE = 'https://app.pakasir.com'

const PAYMENT_METHODS = {
    qris: 'QRIS',
    bni_va: 'BNI Virtual Account',
    bri_va: 'BRI Virtual Account',
    cimb_niaga_va: 'CIMB Niaga VA',
    permata_va: 'Permata VA',
    maybank_va: 'Maybank VA',
    sampoerna_va: 'Sampoerna VA',
    bnc_va: 'BNC VA',
    atm_bersama_va: 'ATM Bersama VA',
    artha_graha_va: 'Artha Graha VA',
    paypal: 'PayPal'
}

function getConfig() {
    return config.pakasir || {}
}

function isEnabled() {
    const cfg = getConfig()
    return cfg.enabled && cfg.slug && cfg.apiKey
}

async function createTransaction(method, amount, orderId) {
    const cfg = getConfig()
    
    if (!isEnabled()) {
        throw new Error('Pakasir not configured')
    }
    
    const response = await axios.post(
        `${PAKASIR_BASE}/api/transactioncreate/${method}`,
        {
            project: cfg.slug,
            order_id: orderId,
            amount: amount,
            api_key: cfg.apiKey
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        }
    )
    
    if (!response.data?.payment) {
        throw new Error('Invalid response from Pakasir')
    }
    
    return response.data.payment
}

async function checkTransaction(orderId, amount) {
    const cfg = getConfig()
    
    if (!isEnabled()) {
        throw new Error('Pakasir not configured')
    }
    
    const response = await axios.get(`${PAKASIR_BASE}/api/transactiondetail`, {
        params: {
            project: cfg.slug,
            order_id: orderId,
            amount: amount,
            api_key: cfg.apiKey
        },
        timeout: 15000
    })
    
    if (!response.data?.transaction) {
        return null
    }
    
    return response.data.transaction
}

async function cancelTransaction(orderId, amount) {
    const cfg = getConfig()
    
    if (!isEnabled()) {
        throw new Error('Pakasir not configured')
    }
    
    const response = await axios.post(
        `${PAKASIR_BASE}/api/transactioncancel`,
        {
            project: cfg.slug,
            order_id: orderId,
            amount: amount,
            api_key: cfg.apiKey
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        }
    )
    
    return response.data
}

async function simulatePayment(orderId, amount) {
    const cfg = getConfig()
    
    if (!cfg.sandbox) {
        throw new Error('Simulation only available in sandbox mode')
    }
    
    const response = await axios.post(
        `${PAKASIR_BASE}/api/paymentsimulation`,
        {
            project: cfg.slug,
            order_id: orderId,
            amount: amount,
            api_key: cfg.apiKey
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        }
    )
    
    return response.data
}

function getPaymentUrl(amount, orderId, options = {}) {
    const cfg = getConfig()
    let url = `${PAKASIR_BASE}/pay/${cfg.slug}/${amount}?order_id=${orderId}`
    
    if (options.qrisOnly) {
        url += '&qris_only=1'
    }
    
    if (options.redirect) {
        url += `&redirect=${encodeURIComponent(options.redirect)}`
    }
    
    return url
}

function generateOrderId() {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `ORD${dateStr}${random}`
}

export { PAYMENT_METHODS, getConfig, isEnabled, createTransaction, checkTransaction, cancelTransaction, simulatePayment, getPaymentUrl, generateOrderId }