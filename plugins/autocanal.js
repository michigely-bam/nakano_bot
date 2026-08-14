import axios from "axios";
import fs from 'fs'

console.log('[AUTO-CANAL] Iniciando modulo doble dependencia...')

const DB_FILE = './autocanal.json'
const CANAL_FIJO = '120363408963824114@newsletter'
const MI_NUMERO = '37031996583942'
const REACCIONES_POSITIVAS = ['❤️', '🔥', '😍', '👍', '😂']
const GPT_API_URL = 'https://api.yupra.my.id/api/ai/gpt5'

// ========= CONFIG TIEMPOS =========
const MIN_CERRADA = 1 * 60 * 1000 // 50 min
const MAX_CERRADA = 10 * 60 * 1000 // 120 min
const MIN_LIBRE = 1 * 60 * 1000 // 30 min
const MAX_LIBRE = 15 * 60 * 1000 // 60 min
const VIDEOS_POR_TANDA_LIBRE = 3 // Manda entre 1 y 2
const TIEMPO_COLA = 1 * 60 * 1000 // 5 minutos si chocan
const ESPERA_ENTRE_VIDEOS = 3000 // 3 seg

// ========= CONTROL GLOBAL =========
let enCola = false
let contadorCerrada = 0
let contadorLibre = 0

// ========= HORARIO PERU GMT-5 =========
function estaDespierto() {
    return true // 24/7 siempre activo
}

function horaPeru() {
    return new Date().toLocaleString("es-PE", {timeZone: "America/Lima"})
}

// ========= LISTA NEGRA GIGANTE =========
const PALABRAS_PROHIBIDAS = ['live', 'en vivo', 'nsfw', '18+', 'adult', 'onlyfans', 'hot', 'sexy', 'xxx', 'porn', 'nazi', 'hitler', 'gore', '+18', '18+', 'contenido adulto', 'contenido explícito', 'contenido sexual', 'actriz porno', 'actor porno', 'estrella porno', 'pornstar', 'video xxx', 'xxx', 'x x', 'pornhub', 'xvideos', 'xnxx', 'redtube', 'brazzers', 'onlyfans', 'cam4', 'chaturbate', 'myfreecams', 'bongacams', 'livejasmin', 'spankbang', 'tnaflix', 'hclips', 'fapello', 'mia khalifa', 'lana rhoades', 'riley reid', 'abella danger', 'brandi love', 'eva elfie', 'nicole aniston', 'janice griffith', 'alexis texas', 'lela star', 'gianna michaels', 'adriana chechik', 'asa akira', 'mandy muse', 'kendra lust', 'jordi el niño polla', 'johnny sins', 'danny d', 'manuel ferrara', 'mark rockwell', 'porno', 'porn', 'sexo', 'sex', 'desnudo', 'desnuda', 'erótico', 'erotico', 'erotika', 'tetas', 'pechos', 'boobs', 'boob', 'nalgas', 'culo', 'culos', 'qlos', 'trasero', 'pene', 'verga', 'vergota', 'pito', 'chocha', 'vagina', 'vaginas', 'coño', 'concha', 'genital', 'genitales', 'masturbar', 'masturbación', 'masturbacion', 'gemidos', 'gemir', 'orgía', 'orgy', 'trío', 'trio', 'gangbang', 'creampie', 'facial', 'cum', 'milf', 'teen', 'incesto', 'incest', 'violación', 'violacion', 'rape', 'bdsm', 'hentai', 'tentacle', 'tentáculos', 'fetish', 'fetiche', 'sado', 'sadomaso', 'camgirl', 'camsex', 'camshow', 'playboy', 'playgirl', 'playmate', 'striptease', 'striptis', 'slut', 'puta', 'putas', 'perra', 'perras', 'whore', 'fuck', 'fucking', 'fucked', 'cock', 'dick', 'pussy', 'ass', 'shemale', 'trans', 'transgénero', 'transgenero', 'lesbian', 'lesbiana', 'gay', 'lgbt', 'explicit', 'hardcore', 'softcore', 'nudista', 'nudismo', 'nudity', 'deepthroat', 'dp', 'double penetration', 'analplay', 'analplug', 'rimjob', 'spank', 'spanking', 'lick', 'licking', '69', 'doggystyle', 'reverse cowgirl', 'cowgirl', 'blowjob', 'bj', 'handjob', 'hj', 'p0rn', 's3x', 'v@gina', 'c0ck', 'd1ck', 'fuk', 'fuking', 'fak', 'boobz', 'pusy', 'azz', 'cumshot', 'sexcam', 'livecam', 'webcam', 'sexchat', 'sexshow', 'sexvideo', 'sexvid', 'sexpics', 'sexphoto', 'seximage', 'sexgif', 'pornpic', 'pornimage', 'pornvid', 'pornvideo', 'only fan', 'only-fans', 'only_fans', 'onlyfans.com', 'mia khalifha', 'mia khalifah', 'mia khalifaa', 'mia khalif4', 'mia khal1fa', 'mia khalifa +18', 'mia khalifa xxx', 'mia khalifa desnuda', 'mia khalifa porno']

// ========= DB HELPERS =========
function guardarDB(data){
    try{
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
        console.log(`[DB] Guardado exitoso. ${horaPeru()}`)
    }catch(e){ console.error('[DB ERROR]', e) }
}

function leerDB(){
    if(!fs.existsSync(DB_FILE)) return {}
    try{ return JSON.parse(fs.readFileSync(DB_FILE)) }
    catch(e){ console.error('[DB ERROR]', e); return {} }
}

// ===== MEMORIA IA =====
const MAX_FRASES = 20;

function obtenerFrasesRecientes(data) {
    if (!data.ultimasFrases) data.ultimasFrases = [];
    return data.ultimasFrases.slice(-MAX_FRASES);
}

function guardarFrase(data, frase) {
    if (!data.ultimasFrases) data.ultimasFrases = [];

    data.ultimasFrases.push({
        texto: frase,
        fecha: Date.now()
    });

    while (data.ultimasFrases.length > MAX_FRASES) {
        data.ultimasFrases.shift();
    }
}

function getSender(msg) { return (msg.key.participant || msg.key.remoteJid || '').replace('@s.whatsapp.net', '').replace('@g.us', '') }
function getRandomIntervalo(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function elegirCategoriaMia(data) {
    const { misCategorias, puntosMios } = data;
    if(!misCategorias || misCategorias.length === 0) return null;
    return misCategorias.sort((a,b) => (puntosMios[b] || 0) - (puntosMios[a] || 0))[0]
}// ========= BUSCADOR CERRADA =========
async function buscarTikTok(query) {
    console.log(`[CERRADA BUSCAR] Buscando: ${query}`)
    try{
        const res = await axios.post("https://tikwm.com/api/feed/search",
        `keywords=${query}&count=50&cursor=0&HD=1`,
        {headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Cookie": "current_language=en"}, timeout: 30000});

        let videos = res.data?.data?.videos || [];
        
        console.log("TOTAL TIKTOK:", videos.length)
console.log(videos[0])
        const ochoMeses = 8 * 30 * 24 * 60 * 60 * 1000

        videos = videos.filter(v => {
            const followers = v.author?.follower_count || 0
            const fechaCreacionCuenta = v.author?.create_time || Date.now() / 1000
            const cuentaAntigua = (Date.now() - (fechaCreacionCuenta * 1000)) > ochoMeses
            const titulo = (v.title || '').toLowerCase()
            const esProhibido = PALABRAS_PROHIBIDAS.some(p => titulo.includes(p))
            const esLive = v.duration > 300
            return followers >= 500 && !esProhibido && !esLive
        })
        console.log(`[CERRADA BUSCAR] Encontrados ${videos.length} videos filtrados`)
        return videos.sort(() => Math.random() - 0.5)
    }catch(e){
        console.error('[CERRADA BUSCAR ERROR]', e.message)
        return []
    }
}

// ========= BUSCADOR LIBRE = MISMO FILTRO PERO RANDOM =========
async function buscarTikTokLibre() {
    console.log(`[LIBRE BUSCAR] Buscando trending random`)
    try{
        const res = await axios.post("https://tikwm.com/api/feed/search",
        `keywords=&count=50&cursor=0&HD=1`, // vacio = trending
        {headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "Cookie": "current_language=en"}, timeout: 30000});

        let videos = res.data?.data?.videos || [];
        
        console.log("TOTAL TIKTOK:", videos.length)
console.log(videos[0])

        const ochoMeses = 8 * 30 * 24 * 60 * 60 * 1000

        // MISMO FILTRO EXACTO QUE LA CERRADA
        videos = videos.filter(v => {
            const followers = v.author?.follower_count || 0
            const fechaCreacionCuenta = v.author?.create_time || Date.now() / 1000
            const cuentaAntigua = (Date.now() - (fechaCreacionCuenta * 1000)) > ochoMeses
            const titulo = (v.title || '').toLowerCase()
            const esProhibido = PALABRAS_PROHIBIDAS.some(p => titulo.includes(p))
            const esLive = v.duration > 300
            return followers >= 500 && !esProhibido && !esLive
        })
        console.log(`[LIBRE BUSCAR] Encontrados ${videos.length} videos trending filtrados`)
        return videos.sort(() => Math.random() - 0.5)
    }catch(e){
        console.error('[LIBRE BUSCAR ERROR]', e.message)
        return []
    }
}

// ========= GPT MODERADOR PARA LAS 2 =========
async function revisarVideoConGPT(titulo, categoria) {
    try {
        const prompt = `Eres moderador de un canal de WhatsApp familiar de "edids" y videos virales.
        Revisa este titulo: "${titulo}" de la categoria "${categoria}".
        ¿Contiene contenido sexual, porno, nazi, violento extremo, gore o +18?
        Responde SOLO "SI" si es seguro para publicar. Responde "NO" si es problematico.`
        const response = await axios.get(`${GPT_API_URL}?text=${encodeURIComponent(prompt)}`, { timeout: 10000 });
        let answer = (response.data?.result || response.data?.response || '').toUpperCase()
        const seguro = answer.includes('SI')
        if(!seguro) console.log(`[GPT RECHAZO] ${titulo}`)
        return seguro
    } catch(e) {
        console.log('Error revision GPT:', e.message)
        return true // si falla deja pasar
    }
}

// ========= GPT REDACTOR PARA LAS 2 =========
async function generarDescripcionGPT(descOriginal, categoria, historial = []) {
    try {
        let prompt;
        if(descOriginal && descOriginal.trim().length > 3){
            const limpia = descOriginal.replace(/#\w+/g, '').trim()
            prompt = `Eres redactor de un canal de WhatsApp de videos virales y edids.

Mejora esta descripción para que sea épica y corta (máximo 60 caracteres).

Descripción:
"${limpia}"

Categoría:
"${categoria}"

No repitas frases parecidas a estas:

${historial.map(x => x.texto).join('\n')}

Genera una frase completamente diferente.

Sin emojis, sin comillas, directa y llamativa.`
        } else {
            prompt = `Eres redactor de un canal de WhatsApp de videos virales.

Genera una frase para un video de "${categoria}".

No repitas frases parecidas a estas:

${historial.map(x => x.texto).join('\n')}

Máximo 60 caracteres.
Sin emojis, sin comillas, directa y llamativa.`
        }
        const response = await axios.get(`${GPT_API_URL}?text=${encodeURIComponent(prompt)}`, { timeout: 15000 });
        let answer = response.data?.result || response.data?.response
        let texto = answer.replace(/"/g, '').trim()
        if(texto.length > 60) texto = texto.slice(0, 57) + '...'
        return `✨ ${texto}`
    } catch(e) {
        return esLibre? '✨ Video viral que tienes que ver' : '✨ Edid epico que tienes que ver'
    }
}// ========= FUNCION MAESTRA PARA ENVIAR =========
async function enviarVideo(sock, categoria, data, esLibre = false) {
    const tipo = esLibre? 'LIBRE' : 'CERRADA'

    if (!estaDespierto()) { return data }
    if (enCola) {
        console.log(`[${tipo}] EN COLA: Esperando ${TIEMPO_COLA/60000}min...`);
        await new Promise(r => setTimeout(r, TIEMPO_COLA))
    }

    enCola = true
    if (!data.usedMias[categoria]) data.usedMias[categoria] = []

    const videos = esLibre? await buscarTikTokLibre() : await buscarTikTok(categoria)

    let videosAEnviar = []
    const cantidad = esLibre? getRandomIntervalo(1, VIDEOS_POR_TANDA_LIBRE) : 1

    for(let i = 0; i < videos.length && videosAEnviar.length < cantidad; i++){
        const v = videos[i]
        if(!v ||!v.play) continue
        if(data.usedMias[categoria].includes(v.play)) continue

        // LAS 2 PASAN POR GPT AHORA
        const esSeguro = await revisarVideoConGPT(v.title, esLibre? 'trending random' : categoria)
        if(!esSeguro) continue

        videosAEnviar.push(v)
        data.usedMias[categoria].push(v.play)
    }

    if(videosAEnviar.length === 0){
        console.log(`[${tipo}] No se encontro video valido`)
        enCola = false
        return data
    }

    for(const v of videosAEnviar){
        try{
            // LAS 2 USAN IA PARA DESCRIPCION
            const historial = obtenerFrasesRecientes(data);

const descripcion = await generarDescripcionGPT(
    v.title,
    esLibre ? 'videos random virales' : categoria,
    historial
)

            const caption = esLibre
             ? `🔥 *TRENDING LIBRE*\n\n${descripcion}\n\n@${v.author?.nickname || 'unknown'}`
                : `📌 *${categoria.toUpperCase()}*\n\n${descripcion}\n\n#${categoria.replace(/ /g, '')}`

            const msgEnviado = await sock.sendMessage(CANAL_FIJO, {
            video: { url: v.play },
            caption: caption,
            mimetype: 'video/mp4',
            fileName: `IA_${Date.now()}.mp4`
        });

        guardarFrase(data, descripcion)

            data.historial = data.historial || []
            data.historial.push({
                query: categoria,
                msgId: msgEnviado.key.id,
                time: Date.now(),
                reacciones: 0,
                tipo: esLibre? 'libre' : 'cerrada',
                link: v.play
            })
            if(data.historial.length > 100) data.historial.shift()

            esLibre? contadorLibre++ : contadorCerrada++
            console.log(`[${tipo}] ENVIADO: ${v.title.slice(0,30)}...`)

            await new Promise(r => setTimeout(r, ESPERA_ENTRE_VIDEOS))
        }catch(e){
            console.error(`[${tipo} ENVIAR ERROR]`, e.message)
        }
    }

    enCola = false
    return data
}

// ========= LISTENER DE REACCIONES =========
export function iniciarListenerReacciones(sock){
    sock.ev.on('messages.reaction', async (events) => {
        for(let {key, reaction} of events){
            if(!reaction ||!REACCIONES_POSITIVAS.includes(reaction.text)) continue
            let data = leerDB()
            let item = data.historial?.find(h => h.msgId === key.id)
            if(item){
                data.puntosMios = data.puntosMios || {}
                if(item.tipo === 'libre'){
                    // LO QUE PEGA EN LIBRE LE DA +2 A LA CERRADA
                    const palabras = item.query.split(' ')
                    palabras.forEach(p => {
                        data.puntosMios[p] = (data.puntosMios[p] || 0) + 2
                    })
                    console.log(`[APRENDIZAJE] +2 pts por reacción en LIBRE`)
                } else {
                    data.puntosMios[item.query] = (data.puntosMios[item.query] || 0) + 1
                    console.log(`[PUNTOS] +1 pt a ${item.query}`)
                }
                item.reacciones = (item.reacciones || 0) + 1
                guardarDB(data)
            }
        }
    })
}export default {
    name: 'autocanal',
    alias: ['autochannel', 'acanal'],
    async execute(sock, msg) {
        const from = msg.key.remoteJid;
        const senderNumber = getSender(msg)
        if (!senderNumber.includes(MI_NUMERO)) return sock.sendMessage(from, { text: `ৎ꯭᪲୨֟ Solo owner` }, { quoted: msg })
        setTimeout(async () => { try { await sock.sendMessage(from, { delete: msg.key }) } catch (e) {} }, 1000)

        const texto = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().split(/ +/).slice(1).join(" ")
        if(!texto) return sock.sendMessage(from, { text: `❌ Uso:\n.autocanal edids miku; edids gojo` })

        let data = { misCategorias: [], historial: [], puntosMios: {}, usedMias: {} }
        if (fs.existsSync(DB_FILE)) data = {...data,...leerDB() }
        data.misCategorias = texto.split(';').map(b => b.trim()).filter(Boolean)
        guardarDB(data)

        if (global.timeoutCerrada) clearTimeout(global.timeoutCerrada)
        if (global.timeoutLibre) clearTimeout(global.timeoutLibre)

        contadorCerrada = 0
        contadorLibre = 0

        // ========= BUCLE CERRADA =========
        const bucleCerrada = async () => {
            console.log(`\n========== [CERRADA] EJECUTANDO #${contadorCerrada+1} ==========`)
            let data = leerDB()
            if(!data.misCategorias || data.misCategorias.length === 0) return
            const categoria = elegirCategoriaMia(data)
            if(!categoria) return
            data = await enviarVideo(sock, categoria, data, false)
            guardarDB(data)
            const siguiente = getRandomIntervalo(MIN_CERRADA, MAX_CERRADA)
            console.log(`[CERRADA] Próximo en ${Math.round(siguiente/60000)}min`)
            global.timeoutCerrada = setTimeout(bucleCerrada, siguiente)
        }

        // ========= BUCLE LIBRE =========
        const bucleLibre = async () => {
            console.log(`\n========== [LIBRE] EJECUTANDO #${contadorLibre+1} ==========`)
            let data = leerDB()
            data = await enviarVideo(sock, 'trending', data, true)
            guardarDB(data)
            const siguiente = getRandomIntervalo(MIN_LIBRE, MAX_LIBRE)
            console.log(`[LIBRE] Próximo en ${Math.round(siguiente/60000)}min`)
            global.timeoutLibre = setTimeout(bucleLibre, siguiente)
        }

        // INICIAR AMBOS
        console.log('[INICIO] Lanzando doble dependencia...')
        await bucleCerrada()
        setTimeout(() => bucleLibre(), 10000) // Libre empieza 10seg después

        const confirm = await sock.sendMessage(from, { text: `✅ DOBLE AUTO-CANAL V2 ON\n\n🧠 CERRADA: 50-120min | 1 video | Aprende\n🔥 LIBRE: 30-60min | 1-2 videos | Random trending\n🛡️ AMBOS: Filtro +5k + GPT + IA\n😴 Horario: 5:30am - 11pm Peru\n🐛 Bug descripción: FIXED\n📊 Stats: Se guardan en autocanal.json` })
        setTimeout(async () => { try{ await sock.sendMessage(from, { delete: confirm.key }) }catch{} }, 8000)
    }
}