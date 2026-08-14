import { 
    makeWASocket,
    useMultiFileAuthState, 
    DisconnectReason, 
    Browsers,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidDecode
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode-terminal';
import chalk from "chalk";
import NodeCache from 'node-cache';
import cfonts from 'cfonts';
import readlineSync from "readline-sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = await import('./config.js').then(m => m.default || m);

// Compatibilidad con plugins antiguos
global.owner = config.owner;
global.mods = config.mods;
global.prems = config.prems;
global.suittag = config.suittag;

import handler from './handler.js';
import { createSubBot, getSub, getConnectionStatus } from './lib/sub.js';
import { createMainBot, getMain, getMains } from './lib/main.js';
import { createPremBot, getPrem, getPrems } from './lib/prem.js';

const msgRetryCounterCache = new NodeCache();

const sessionName = "./sessions";
const methodCodeQR = process.argv.includes("--qr");
const methodCode = process.argv.includes("code") || process.argv.includes("--code");
let phoneNumber = "";
let phoneInput = "";
let opcion;
let resettingMainSession = false;
let shouldStartMainBot = true;
let pausedSessionTimer = null;

let globalSock = null;

// Inicializar globales
if (!global.premiumBots) global.premiumBots = [];
if (!global.mainBots) global.mainBots = [];
if (!global.conns) global.conns = [];
if (!global.principalBot) global.principalBot = null;

const DIGITS = (s = "") => String(s).replace(/\D/g, "");
function normalizePhoneForPairing(input) {
    let s = DIGITS(input);
    if (!s) return "";
    if (s.startsWith("0")) s = s.replace(/^0+/, "");
    if (s.length === 10 && s.startsWith("3")) s = "57" + s;
    if (s.startsWith("52") && !s.startsWith("521") && s.length >= 12) s = "521" + s.slice(2);
    if (s.startsWith("54") && !s.startsWith("549") && s.length >= 11) s = "549" + s.slice(2);
    return s;
}

function isInteractiveTerminal() {
    return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function clearMainSession() {
    try {
        if (fs.existsSync(sessionName)) {
            fs.rmSync(sessionName, { recursive: true, force: true });
        }
        fs.mkdirSync(sessionName, { recursive: true });
        console.log(chalk.yellow(`🧹 Sesión principal limpiada: ${sessionName}`));
        return true;
    } catch (error) {
        console.log(chalk.red(`❌ No se pudo limpiar la sesión principal: ${error.message}`));
        return false;
    }
}

function hasMainCredentials() {
    return fs.existsSync(path.join(sessionName, "creds.json"));
}

function enterSessionPausedMode(reason) {
    if (pausedSessionTimer) return;

    console.log(chalk.yellow(`⏸️ Bot principal en espera: ${reason}`));
    console.log(chalk.gray("No se mostrará QR automáticamente. Vincula manualmente cuando estés listo usando --qr o --code."));

    pausedSessionTimer = setInterval(() => {}, 60 * 60 * 1000);
}

const folders = ['data', 'temp', 'sessions', 'plugins', 'subs', 'Sessions', 'Sessions/Subs', 'Sessions/Mains', 'Sessions/Prems'];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(chalk.gray(`📁 Carpeta creada: ${folder}`));
    }
});

function cleanTempFolder() {
    const tempPath = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempPath)) return;
    try {
        const files = fs.readdirSync(tempPath);
        let deletedCount = 0;
        files.forEach(file => {
            const filePath = path.join(tempPath, file);
            try {
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            } catch (err) {}
        });
        if (deletedCount > 0) {
            console.log(chalk.gray(`[ 🗑️ ] Cache tmp: ${deletedCount} archivos eliminados`));
        }
    } catch (error) {}
}

function startTempCleaner() {
    cleanTempFolder();
    setInterval(() => cleanTempFolder(), 5 * 60 * 1000);
}

console.clear();

const { say } = cfonts;

say('MIKUBOT', {
    font: 'block',
    align: 'center',
    gradient: ['cyan', 'blue']
});

say('By Michigelybam', {
    font: 'console',
    align: 'center',
    gradient: ['cyan', 'blue']
});

console.log(chalk.magentaBright('\n❀ Iniciando...\n'));

if (methodCodeQR) {
    opcion = "1";
} else if (methodCode) {
    opcion = "2";
} else if (!hasMainCredentials()) {
    if (!isInteractiveTerminal()) {
        shouldStartMainBot = false;
    } else {
        console.log(chalk.bold.white("\nSeleccione una opción:"));
        console.log(chalk.blueBright("1. Con código QR"));
        console.log(chalk.cyan("2. Con código de texto de 8 dígitos"));
        opcion = readlineSync.question(chalk.bold.white("--> "));
        
        while (!/^[1-2]$/.test(opcion)) {
            console.log(chalk.bold.redBright(`No se permiten numeros que no sean 1 o 2`));
            opcion = readlineSync.question("--> ");
        }
        
        if (opcion === "2") {
            console.log(chalk.bold.redBright(`\nPor favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright("Ejemplo: +5219992042946")}\n${chalk.bold.magentaBright('---> ')}`));
            phoneInput = readlineSync.question("");
            phoneNumber = normalizePhoneForPairing(phoneInput);
        }
    }
}

startTempCleaner();

let plugins = new Map();

function getPluginFiles(dir) {
    let files = [];

    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            files.push(...getPluginFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith(".js")) {
            files.push(fullPath);
        }
    }

    return files;
}

let reconexion = 0;
const intentos = 15;

async function reconectarSubBots() {
    const sessionsSubsDir = path.join(__dirname, 'Sessions', 'Subs');
    
    if (!fs.existsSync(sessionsSubsDir)) {
        return;
    }
    
    const subFolders = fs.readdirSync(sessionsSubsDir).filter(folder => {
        const folderPath = path.join(sessionsSubsDir, folder);
        return fs.statSync(folderPath).isDirectory() && /^\d+$/.test(folder);
    });
    
    if (subFolders.length === 0) return;
    
    console.log(chalk.cyan(`\n🔄 Verificando ${subFolders.length} sub-bot(s)...`));
    
    let conectados = 0;
    
    for (const subNumber of subFolders) {
        const credsPath = path.join(sessionsSubsDir, subNumber, 'creds.json');
        
        if (!fs.existsSync(credsPath)) continue;
        
        const existingSub = getSub(subNumber);
        if (existingSub?.sock?.user) {
            console.log(chalk.green(`✅ Sub-bot ${subNumber} ya está conectado`));
            conectados++;
            continue;
        }
        
        console.log(chalk.yellow(`🔄 Conectando sub-bot: ${subNumber}`));
        try {
            const subSock = await createSubBot(subNumber, subNumber);
            // Registrar en global
            if (subSock && subSock.user?.id) {
                const exists = global.conns.some(b => b.user?.id === subSock.user?.id);
                if (!exists) {
                    global.conns.push(subSock);
                }
            }
            conectados++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
            console.log(chalk.red(`❌ Error conectando sub-bot ${subNumber}: ${err.message}`));
        }
    }
    
    console.log(chalk.green(`\n✅ Sub-bots conectados: ${conectados}/${subFolders.length}\n`));
}

async function reconectarMains() {
    const sessionsMainsDir = path.join(__dirname, 'Sessions', 'Mains');
    
    if (!fs.existsSync(sessionsMainsDir)) {
        return;
    }
    
    const mainFolders = fs.readdirSync(sessionsMainsDir).filter(folder => {
        const folderPath = path.join(sessionsMainsDir, folder);
        return fs.statSync(folderPath).isDirectory() && /^\d+$/.test(folder);
    });
    
    if (mainFolders.length === 0) return;
    
    console.log(chalk.cyan(`\n🔄 Verificando ${mainFolders.length} main-bot(s)...`));
    
    let conectados = 0;
    
    for (const mainNumber of mainFolders) {
        const credsPath = path.join(sessionsMainsDir, mainNumber, 'creds.json');
        
        if (!fs.existsSync(credsPath)) continue;
        
        const existingMain = getMain(mainNumber);
        if (existingMain?.sock?.user) {
            console.log(chalk.green(`✅ Main-bot ${mainNumber} ya está conectado`));
            conectados++;
            continue;
        }
        
        console.log(chalk.yellow(`🔄 Conectando main-bot: ${mainNumber}`));
        try {
            const mainSock = await createMainBot(mainNumber, mainNumber);
            // Registrar en global
            if (mainSock && mainSock.user?.id) {
                const exists = global.mainBots.some(b => b.user?.id === mainSock.user?.id);
                if (!exists) {
                    global.mainBots.push(mainSock);
                }
            }
            conectados++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
            console.log(chalk.red(`❌ Error conectando main-bot ${mainNumber}: ${err.message}`));
        }
    }
    
    console.log(chalk.green(`\n✅ Main-bots conectados: ${conectados}/${mainFolders.length}\n`));
}

async function reconectarPrems() {
    const sessionsPremsDir = path.join(__dirname, 'Sessions', 'Prems');
    
    if (!fs.existsSync(sessionsPremsDir)) {
        return;
    }
    
    const premFolders = fs.readdirSync(sessionsPremsDir).filter(folder => {
        const folderPath = path.join(sessionsPremsDir, folder);
        return fs.statSync(folderPath).isDirectory() && /^\d+$/.test(folder);
    });
    
    if (premFolders.length === 0) return;
    
    console.log(chalk.cyan(`\n🔄 Verificando ${premFolders.length} prem-bot(s)...`));
    
    let conectados = 0;
    
    for (const premNumber of premFolders) {
        const credsPath = path.join(sessionsPremsDir, premNumber, 'creds.json');
        
        if (!fs.existsSync(credsPath)) continue;
        
        const existingPrem = getPrem(premNumber);
        if (existingPrem?.sock?.user) {
            console.log(chalk.green(`✅ Prem-bot ${premNumber} ya está conectado`));
            conectados++;
            continue;
        }
        
        console.log(chalk.yellow(`🔄 Conectando prem-bot: ${premNumber}`));
        try {
            const premSock = await createPremBot(premNumber, premNumber);
            // Registrar en global
            if (premSock && premSock.user?.id) {
                const exists = global.premiumBots.some(b => b.user?.id === premSock.user?.id);
                if (!exists) {
                    global.premiumBots.push(premSock);
                }
            }
            conectados++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
            console.log(chalk.red(`❌ Error conectando prem-bot ${premNumber}: ${err.message}`));
        }
    }
    
    console.log(chalk.green(`\n✅ Prem-bots conectados: ${conectados}/${premFolders.length}\n`));
}

async function cargarPlugins() {
    const pluginsDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        console.log(chalk.gray(`📁 Carpeta plugins creada`));
        return;
    }
    
    const pluginFiles = getPluginFiles(pluginsDir);
    plugins.clear();
    let successCount = 0;
    let failCount = 0;
    
    console.log(chalk.cyan(`\n📂 Cargando plugins (${pluginFiles.length})...\n`));
    
    for (const file of pluginFiles) {
        try {
            const filePath = file;
            const fileUrl = `file://${filePath.replace(/\\/g, "/")}?update=${Date.now()}`;
            const pluginModule = await import(fileUrl);
            const pluginData = pluginModule.default || pluginModule;
            
            if (pluginData.name) {
                plugins.set(pluginData.name.toLowerCase(), pluginData);
                
                if (pluginData.alias && Array.isArray(pluginData.alias)) {
                    pluginData.alias.forEach(alias => {
                        plugins.set(alias.toLowerCase(), pluginData);
                    });
                }
                const relative = path.relative(pluginsDir, filePath);

console.log(
    chalk.green(`✅ Plugin cargado: ${relative}`)
);
                successCount++;
            } else {
                console.log(chalk.yellow(`⚠️ Plugin ${file}: No exporta nombre`));
                failCount++;
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error cargando plugin ${file}: ${error.message}`));
            failCount++;
        }
    }
    console.log(chalk.cyan(`\n📦 Total: ${successCount} plugins cargados, ${failCount} fallidos\n`));
}

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionName);
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: Browsers.macOS('Chrome'),
            auth: { 
                creds: state.creds, 
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            msgRetryCounterCache,
        });

        // Establecer propiedades del bot principal
        sock.isSubBot = false;
        sock.isPremiumBot = false;
        sock.isMainBot = true;
        sock.sessionType = 'main';
// Contador global
global.forwardCounter ??= 0

const _sendMessage = sock.sendMessage.bind(sock)

sock.sendMessage = async (jid, content = {}, options = {}) => {
    global.forwardCounter++

    if (global.forwardCounter >= 40) {
    global.forwardCounter = 0

    if (content && typeof content === 'object') {
        content.contextInfo = {
            ...(content.contextInfo || {}),
            isForwarded: true,
            forwardingScore: 999999,
            forwardedNewsletterMessageInfo: {
                newsletterJid: config.canalId,
                newsletterName: config.canalNombre,
                serverMessageId: 1
            }
        }
    }
}

return _sendMessage(jid, content, options)
}
        globalSock = sock;
        global.client = sock;

        await cargarPlugins();
        
        sock.ev.on("connection.update", async (update) => {
            const { connection } = update;
            if (connection === "open") {
                // Reafirmar propiedades al abrir conexión
                sock.isMainBot = true;
                sock.isPremiumBot = false;
                sock.isSubBot = false;
                sock.sessionType = 'main';
                
                // Registrar en globales
                global.principalBot = sock;
                if (!global.mainBots) global.mainBots = [];
                const exists = global.mainBots.some(b => b.user?.id === sock.user?.id);
                if (!exists) {
                    global.mainBots.push(sock);
                }
                
                console.log(chalk.green('🔌 Bot principal conectado, verificando sub-bots, mains y prems...'));
                setTimeout(() => {
                    reconectarSubBots();
                    reconectarMains();
                    reconectarPrems();
                }, 5000);
            }
        });

        if (opcion === "2" && !fs.existsSync("./sessions/creds.json")) {
            setTimeout(async () => {
                try {
                    if (!state.creds.registered) {
                        const pairing = await sock.requestPairingCode(phoneNumber);
                        const codeBot = pairing?.match(/.{1,4}/g)?.join("-") || pairing;
                        console.log(chalk.bold.white(chalk.bgMagenta(`\n🔢 Código de emparejamiento:`)), chalk.bold.white(chalk.white(codeBot)));
                        console.log(chalk.gray('📱 Ingresa este código en WhatsApp > Dispositivos vinculados\n'));
                    }
                } catch (err) {
                    console.log(chalk.red("Error al generar código: " + err.message));
                }
            }, 3000);
        }

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { qr, connection, lastDisconnect } = update;
            
            if (qr && (opcion === '1' || methodCodeQR)) {
                console.log(chalk.green.bold("\n[ ✿ ] Escanea este código QR\n"));
                qrcode.generate(qr, { small: true });
            }

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode || 0;
                
                if (reason === DisconnectReason.loggedOut || reason === 401 || reason === 403 || reason === 404) {
                    if (resettingMainSession) return;
                    resettingMainSession = true;

                    console.log(chalk.red(`Sesión cerrada (${reason}). Limpiando credenciales...`));
                    // Limpiar globales
                    if (global.principalBot) global.principalBot = null;
                    if (global.mainBots) {
                        global.mainBots = global.mainBots.filter(b => b.user?.id !== sock.user?.id);
                    }

                    try { sock.end(); } catch (e) {}
                    clearMainSession();

                    opcion = "1";
                    reconexion = 0;

                    console.log(chalk.yellow("🔄 Reiniciando conexión principal con QR en 3 segundos..."));
                    setTimeout(async () => {
                        resettingMainSession = false;
                        await startBot();
                    }, 3000);
                    return;
                } else if (reason === DisconnectReason.connectionReplaced) {
                    console.log(chalk.yellow("Conexión reemplazada"));
                    return;
                } else {
                    reconexion++;
                    if (reconexion > intentos) {
                        console.log(chalk.red(`Demasiados reintentos (${intentos}). Reinicia manualmente.`));
                        process.exit(1);
                    }
                    const delay = Math.min(3000 * reconexion, 30000);
                    console.log(chalk.yellow(`Desconexión, reconectando en ${delay/1000}s...`));
                    setTimeout(() => startBot(), delay);
                }
            }

            if (connection === "open") {
                reconexion = 0;
                const userName = sock.user?.name || "Desconocido";
                console.log(chalk.green.bold(`\n[ ✿ ] Conectado a: ${userName}`));
                console.log(chalk.green(`\n✅ ${config.nombre} ${config.nombre2} lista! Usa ${config.prefix}ping para probar.\n`));
                
                // Reafirmar propiedades
                sock.isMainBot = true;
                sock.isPremiumBot = false;
                sock.isSubBot = false;
                sock.sessionType = 'main';
                
                // Registrar en globales
                global.principalBot = sock;
                if (!global.mainBots) global.mainBots = [];
                const exists = global.mainBots.some(b => b.user?.id === sock.user?.id);
                if (!exists) {
                    global.mainBots.push(sock);
                }
                
                console.log(chalk.cyan(`[ INFO ] Bot principal registrado globalmente`));
            }
        });

        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const msg = chatUpdate.messages[0];
                if (!msg?.message) return;
                if (msg.key?.remoteJid === 'status@broadcast') return;
                
                if (Object.keys(msg.message)[0] === 'ephemeralMessage') {
                    msg.message = msg.message.ephemeralMessage.message;
                }
                
                if (msg.key.fromMe && msg.key.id.startsWith('3EB0')) return;
                
                await handler(sock, msg, plugins, config);
            } catch (err) {
                console.log(chalk.red('Error en mensaje:'), err);
            }
        });

        sock.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
            }
            return jid;
        };

        return sock;
        
    } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
        console.log(chalk.yellow('🔄 Reintentando en 5 segundos...'));
        setTimeout(() => startBot(), 5000);
    }
}

startBot();

process.once('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Cerrando bot...\n'));
    if (globalSock) {
        try { globalSock.end(); } catch (e) {}
    }
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Cerrando bot...\n'));
    if (globalSock) {
        try { globalSock.end(); } catch (e) {}
    }
    process.exit(0);
});
