import axios from 'axios'
import config from '../../config.js'
import * as cheerio from 'cheerio'
import te from '../../src/lib/ourin-error.js'
const CONFIG = {
  searchQuery: "",
  scaEsv: "",
  cookies: {
    secureBucket: "",
    aec: "",
    nid: "529=OKvnlQof9VyGSj8i4D78MACTB3eJrt4czjKWdQ9HLbafIcHkasxr_4NQuVFh6JG1XwmnpCGAxCg4OKdNr5goE6mmDz8o75eZkPcSk-aIrs_aV1NoIQlhhjaLHnbeuElar-VqRkDh25RMKL7dlyC576E5Pm4GQ5BfFZMStAJ-1pRpu08voGD_iZ7_OGGfu5uQqyMP__oIrIVK9OQgmv1OL86_fG7NOmFdZDK9NC48GHVCp6l7mmG0jaQZYPIJfPtgZcwquFASMnwfEB2HTpTkI39tNTQ8qqmp5RH5yyB0AwfQFpvXgAuOz4NSj4ELZlUCZBZzNMI1BtFONSFeW6beey6vBCDbuAI3o9OifdYSIz3TIScAz6ovtiDoPfw4Fl4sIEoEFILeePAc3Dg7vqK-BS2bZigFAzsgJuHjSU6RZRk12VU70Ibr_b-nViQE5d1nGw",
    dv: "",
    secureStrp: ""
  },
  userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  chromeVersion: "137"
}

const buildUrl = () => {
  const params = new URLSearchParams({
    q: CONFIG.searchQuery,
    sca_esv: CONFIG.scaEsv,
    source: "hp"
  })
  return `https://www.google.com/search?${params.toString()}`
}

const buildCookieString = () => {
  return [
    `__Secure-BUCKET=${CONFIG.cookies.secureBucket}`,
    `AEC=${CONFIG.cookies.aec}`,
    `NID=${CONFIG.cookies.nid}`,
    `DV=${CONFIG.cookies.dv}`,
    `__Secure-STRP=${CONFIG.cookies.secureStrp}`
  ].join("; ")
}

async function GoogleLyrics(judul) {
  CONFIG.searchQuery = "lirik+" + judul.replaceAll(" ", "+")
  const url = buildUrl()
  const res = await axios.get(url, {
    headers: {
      "authority": "www.google.com",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "user-agent": CONFIG.userAgent,
      "upgrade-insecure-requests": "1",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "sec-ch-ua": `"Chromium";v="${CONFIG.chromeVersion}", "Not/A)Brand";v="24"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": "Android",
      "sec-ch-prefers-color-scheme": "dark",
      "cookie": buildCookieString()
    }
  })
  const $ = cheerio.load(res.data)
  const lyrics = $('div[data-attrid="kc:/music/recording_cluster:lyrics"] div[jsname="U8S5sf"]')
    .map((_, div) =>
      $(div)
        .find('span[jsname="YS01Ge"]')
        .map((_, s) => $(s).text().trim())
        .get()
        .join("\n")
    )
    .get()
    .join("\n\n")
  return {
    title: $('div[data-attrid="title"]').text().trim(),
    subtitle: $('div[data-attrid="subtitle"]').text().trim(),
    lyrics: lyrics || "Lirik kosong / tidak ketemu"
  }
}


const pluginConfig = {
    name: 'lirik',
    alias: ['lyric', 'lyrics', 'liriklagu'],
    category: 'search',
    description: 'Cari lirik lagu',
    usage: '.lirik <query>',
    example: '.lirik ',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    
    if (!query) {
        return m.reply(
            `*ʟɪʀɪᴋ ʟᴀɢᴜ*\n\n` +
            `> Masukkan kata kunci pencarian\n\n` +
            `> Contoh: \`${m.prefix}lirik Somewhere only we know\``
        )
    }
    
    m.react('🔍')
    
    try {
        const json = await GoogleLyrics(query)
        const texts = `🎶 \`\`\`${json.title}\`\`\`\n> ${json.subtitle}\n\n${json.lyrics}`
        await m.reply(texts)
        
        m.react('✅')
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }