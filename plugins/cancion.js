import fetch from 'node-fetch'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import FormData from 'form-data'
import { spawn } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const SONGFINDER_API = 'https://songfinder.gg/api/recognize/url'
const UGUU_UPLOAD = 'https://uguu.se/upload'
const FILEIO_UPLOAD = 'https://file.io'
const CLIP_SECONDS = 15
const MAX_INPUT_BYTES = 15 * 1024 * 1024

const SF_HEADERS = {
  'accept': 'application/json',
  'content-type': 'application/json',
  'origin': 'https://songfinder.gg',
  'referer': 'https://songfinder.gg/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
}

function makeToken() {
  return crypto.randomBytes(24).toString('base64url')
}

async function uploadUguu(buffer) {
  const form = new FormData()
  form.append('files[]', buffer, { filename: `audio.mp3`, contentType: 'audio/mpeg' })
  const res = await fetch(UGUU_UPLOAD, { method: 'POST', body: form, headers: form.getHeaders() })
  if(!res.ok) throw new Error('uguu fallo')
  const json = await res.json()
  return json?.files?.[0]?.url
}

async function uploadFileIo(buffer) {
  const form = new FormData()
  form.append('file', buffer, { filename: `audio.mp3` })
  const res = await fetch(FILEIO_UPLOAD, { method: 'POST', body: form, headers: form.getHeaders() })
  const json = await res.json()
  if(!json.link) throw new Error('file.io fallo')
  return json.link
}

async function recognizeUrl(audioUrl) {
  const res = await fetch(SONGFINDER_API, {
    method: 'POST',
    headers: SF_HEADERS,
    body: JSON.stringify({ url: audioUrl, startTime: 0, recaptchaToken: makeToken() })
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`SongFinder HTTP ${res.status}`)
  if (!json?.success ||!json?.track) throw new Error(json?.message || 'No se encontró coincidencia')
  const t = json.track
  return {
    title: t.title || 'Desconocido',
    artist: t.artist || 'Desconocido',
    album: t.album || '',
    releaseDate: t.releaseDate || '',
    genre: t.genre || '',
    coverArt: t.coverArt || ''
  }
}

function prepareClip(buffer) {
  return new Promise(resolve => {
    const tmpIn = path.join(os.tmpdir(), `sf_${Date.now()}.tmp`)
    try { fs.writeFileSync(tmpIn, buffer) } catch { return resolve(buffer.slice(0, 2*1024*1024)) }
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', tmpIn,
      '-t', String(CLIP_SECONDS),
      '-vn', '-acodec', 'libmp3lame', '-ar', '44100', '-ac', '2', '-b:a', '128k',
      '-f', 'mp3', 'pipe:1'
    ])
    const chunks = []
    ff.stdout.on('data', c => chunks.push(c))
    ff.on('close', () => { try{fs.unlinkSync(tmpIn)}catch{}; resolve(chunks.length? Buffer.concat(chunks) : buffer.slice(0, 2*1024*1024)) })
  })
}

async function identifySong(buffer) {
  if (buffer.length > MAX_INPUT_BYTES) throw new Error('El archivo es demasiado grande. Máx 15MB')
  const clip = await prepareClip(buffer)
  let url
  try { url = await uploadUguu(clip) } catch { url = await uploadFileIo(clip) }
  const track = await recognizeUrl(url)
  return {...track, sourceUrl: url }
}

export default {
    name: 'cancion',
    alias: ['shazam', 'reconocer', 'music', 'quees'],
    category: 'buscador',
    description: 'Identifica canciones de audios o videos estilo Shazam',

    execute: async (sock, msg) => {
        const from = msg.key.remoteJid
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

        const reply = async (txt) => {
            await sock.sendMessage(from, { text: txt }, { quoted: msg })
        }

        if (!quotedMsg || (!quotedMsg.audioMessage &&!quotedMsg.videoMessage)) {
            return await reply(`♡ *Responde a un audio o video* de mínimo 10 segundos\n_Ejemplo: Responde a un estado con música_`)
        }

        try {
            await sock.sendMessage(from, { react: { text: '🎵', key: msg.key } }).catch(() => {})

            let mediaType = quotedMsg.audioMessage? 'audio' : 'video'
            const duration = quotedMsg[mediaType + 'Message']?.seconds
            if(duration && duration < 10) {
                return await reply(`❌ *Audio muy corto*\n\nNecesito mínimo 10 segundos para identificar`)
            }

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo
            const quotedMsgObj = {
                key: { remoteJid: from, id: contextInfo.stanzaId, participant: contextInfo.participant, fromMe: false },
                message: { [mediaType + 'Message']: quotedMsg[mediaType + 'Message'] }
            }

            const buffer = await downloadMediaMessage(quotedMsgObj, 'buffer', {}, {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            })

            if (!buffer) throw new Error('No se pudo descargar el audio')

            await reply(`🔎 *Buscando canción...* Espera unos segundos`)

            const result = await identifySong(buffer)

            let caption = `*🎵 RESULTADO*\n\n`
            caption += `*• Título:* ${result.title}\n`
            caption += `*• Artista:* ${result.artist}\n`
            if(result.album) caption += `*• Álbum:* ${result.album}\n`
            if(result.releaseDate) caption += `*• Año:* ${result.releaseDate.split('-')[0]}\n`
            if(result.genre) caption += `*• Género:* ${result.genre}\n`

            await sock.sendMessage(from, {
                image: { url: result.coverArt || 'https://i.imgur.com/8KM9t9E.png' },
                caption: caption
            }, { quoted: msg })

            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {})

        } catch (error) {
            console.error('Error cancion:', error)
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {})
            await reply(`❌ *No pude identificar la canción*\n\n> ${error.message}\n\n_Asegúrate que se escuche claro y tenga 10-60s_`)
        }
    }
}