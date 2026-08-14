import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');
const COOLDOWN_MS = 7 * 60 * 1000; // 7 minutos
const CREDITOS_MIN = 100;
const CREDITOS_MAX = 500;

// Tope diario solo para CORRER
const TOPE_CREDITOS_DIA = 8000;

const TEXTOS_CORRER = [
  "🏃 {nombre} corrió un maratón y ganó 💳 {creditos} créditos.",
  "🏞️ {nombre} corrió por la montaña y obtuvo 💳 {creditos} créditos.",
  "🏟️ {nombre} participó en una carrera y recibió 💳 {creditos} créditos.",
  "🚶 {nombre} trotó por el parque y consiguió 💳 {creditos} créditos.",
  "🛣️ {nombre} hizo una larga caminata y ganó 💳 {creditos} créditos.",
  "🌄 {nombre} corrió al amanecer y obtuvo 💳 {creditos} créditos.",
  "🌇 {nombre} corrió al atardecer y recibió 💳 {creditos} créditos."
];

function hoyStrLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Cargar economía
function loadEconomy() {
    try {
        if (fs.existsSync(ECONOMY_FILE)) {
            return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error('Error cargando economía:', error);
        return {};
    }
}

// Guardar economía
function saveEconomy(economy) {
    try {
        fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando economía:', error);
        return false;
    }
}

// Inicializar usuario
function initUserEconomy(economy, userNumber, pushName) {
    userNumber = userNumber.replace(/[^0-9]/g, '')
    if (!economy[userNumber]) {
        economy[userNumber] = {
            number: userNumber,
            name: pushName || 'Usuario',
            registrado: true, // <- YA VIENE REGISTRADO
            edad: 18, // <- edad default
            creditos: 100,
            health: 100,
            lastMine: 0,
            lastWork: 0,
            lastCrime: 0,
            lastEstudiar: 0,
            lastPicar: 0,
            lastCazar: 0,
            lastClaim: 0,
            lastCorrer: 0,

            minarDiario: { fecha: '', creditos: 0 },
            estudiarDiario: { fecha: '', creditos: 0 },
            picarDiario: { fecha: '', creditos: 0 },
            cazarDiario: { fecha: '', creditos: 0 },
            claimDiario: { fecha: '', creditos: 0 },
            correrDiario: { fecha: '', creditos: 0 },
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 },
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
    }
    return economy[userNumber];
}

function getRemainingTime(lastUsed, cooldownMs) {
    const now = Date.now();
    const timePassed = now - lastUsed;
    if (timePassed >= cooldownMs) return 0;
    const remaining = cooldownMs - timePassed;
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
}

export default {
    name: 'correr',
    alias: ['run', 'trotar'],
    category: 'RPG',

    async execute(sock, msg, options) {
        try {
            const {
                config,
                senderNumber,
                pushName,
                replyWithContext,
                senderJid
            } = options;

            const from = msg.key.remoteJid;
            const prefix = config.prefix[0]

            // Normalizar numero
            const jid = senderJid || msg.key.participant || msg.key.remoteJid || ''
            const num = (senderNumber || jid.split('@')[0]).replace(/[^0-9]/g, '')

            if (!num) {
                return await replyWithContext('❌ No se pudo identificar tu número', [senderJid]);
            }

            await sock.sendMessage(from, { react: { text: "🏃", key: msg.key } });

            // Cargar DB y auto-crear usuario
            let economy = loadEconomy();
            const user = initUserEconomy(economy, num, pushName);

            // ELIMINADO: Ya no pide registro

            // Cooldown 7 min
            const ahora = Date.now();
            if (user.lastCorrer && (ahora - user.lastCorrer) < COOLDOWN_MS) {
                const remaining = getRemainingTime(user.lastCorrer, COOLDOWN_MS);
                return await replyWithContext(
                    `⏳ *${user.name}, debes esperar ${remaining}* para volver a correr`,
                    [senderJid]
                );
            }

            // Control diario
            const hoy = hoyStrLocal();
            if (!user.correrDiario || user.correrDiario.fecha!== hoy) {
                user.correrDiario = { fecha: hoy, creditos: 0 };
            }

            const restanteCred = Math.max(0, TOPE_CREDITOS_DIA - (user.correrDiario.creditos || 0));

            if (restanteCred === 0) {
                return await replyWithContext(
                    `🛑 Límite diario alcanzado en *CORRER*.\nHoy ya farmeaste *${TOPE_CREDITOS_DIA} créditos*.\nVuelve mañana. 😊`,
                    [senderJid]
                );
            }

            // Recompensas
            const creditosBase = Math.floor(Math.random() * (CREDITOS_MAX - CREDITOS_MIN + 1)) + CREDITOS_MIN;
            const creditosOtorgados = Math.min(creditosBase, restanteCred);

            if (creditosOtorgados === 0) {
                return await replyWithContext(
                    `🛑 Ya llegaste al tope de hoy en *CORRER*.\nCréditos diarios: *${TOPE_CREDITOS_DIA}*.\nVuelve mañana. 🙌`,
                    [senderJid]
                );
            }

            // Consumir cooldown
            user.lastCorrer = ahora;

            // Aplicar recompensas
            user.creditos = (user.creditos || 0) + creditosOtorgados;
            user.correrDiario.creditos += creditosOtorgados;

            saveEconomy(economy);

            // Mensaje final
            const base = TEXTOS_CORRER[Math.floor(Math.random() * TEXTOS_CORRER.length)]
           .replace("{nombre}", user.name)
           .replace("{creditos}", creditosOtorgados.toLocaleString());

            let mensajeFinal = base;
            if (creditosOtorgados < creditosBase) {
                const restC = TOPE_CREDITOS_DIA - user.correrDiario.creditos;
                mensajeFinal += `\n\n⚠️ Tope diario alcanzado parcialmente.\nAún puedes obtener hoy: ${restC.toLocaleString()} créditos.`;
            }

            await replyWithContext(mensajeFinal, [senderJid]);
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error('❌ Error en comando correr:', error);
        }
    }
};