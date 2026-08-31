import axios from 'axios'
import FormData from 'form-data'
import { f } from '../lib/ourin-http.js'
async function uploadToTempFiles(buffer, filename) {
    const form = new FormData()
    form.append('file', buffer, { filename, contentType: 'image/jpeg' })

    const res = await axios.post('https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk', form, {
        headers: form.getHeaders(),
        timeout: 60000
    })

    if (res.data?.status === 'success' && (typeof res.data === "string" && res.data.startsWith("http")) ? res.data : "") {
        return res.data
    }
    throw new Error('Upload failed')
}

async function nanoBanana(imageBuffer, prompt) {
    const imageUrl = await uploadToTempFiles(imageBuffer, `nano_${Date.now()}.jpg`)
    const apiUrl = `https://api-faa.my.id/faa/nano-banana?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`

    const imgRes = await f(apiUrl, 'arrayBuffer')

    return Buffer.from(imgRes)
}

export default nanoBanana