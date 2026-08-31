import axios from 'axios'
import FormData from 'form-data'

const termaiKey = 'AIzaBj7z2z3xBjsk'
const termaiDomain = 'https://c.termai.cc'

async function uploadToTermai(buffer, filename = 'image.jpg') {
    const form = new FormData()
    form.append('file', buffer, { filename })
    
    const response = await axios.post(`${termaiDomain}/api/upload?key=${termaiKey}`, form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' },
        timeout: 60000
    })
    
    if (response.data?.status && response.data?.path) {
        return response.data.path
    }
    
    throw new Error('Termai upload failed')
}

// Redirect all legacy exports to strictly use Termai as requested by user
export const uploadImage = uploadToTermai
export const uploadToTelegraph = uploadToTermai
export const uploadTo0x0 = uploadToTermai
export const uploadToCatbox = uploadToTermai
export const uploadToTmpfiles = uploadToTermai
export const uploadToUguu = uploadToTermai