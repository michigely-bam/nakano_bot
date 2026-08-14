import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import moment from 'moment';
import gradient from 'gradient-string';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PRIMARIOS_FILE = path.join(__dirname, 'databases', 'primarios.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(path.join(__dirname, 'databases'))) {
    fs.mkdirSync(path.join(__dirname, 'databases'), { recursive: true });
}

function loadUsersDb() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return parsed;
            } else {
                console.log(chalk.yellow('⚠️ users.json no era un arreglo, reiniciando...'));
                return [];
            }
        }
        return [];
    } catch (e) {
        console.log(chalk.yellow(`Error cargando base de datos: ${e.message}`));
        return [];
    }
}

function saveUsersDb(usersDb) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersDb, null, 2));
        return true;
    } catch (error) {
        console.error(chalk.red('Error guardando usuarios:'), error);
        return false;
    }
}

function cleanNumber(number) {
    if (!number) return 'Desconocido';
    let cleaned = number.replace(/@.+/, '').split(':')[0];
    cleaned = cleaned.replace(/\D/g, '');
    return cleaned || 'Desconocido';
}

function calculateLevel(exp) {
    let level = 1;
    let expNeeded = 100;
    let currentExp = exp;
    
    while (currentExp >= expNeeded) {
        currentExp -= expNeeded;
        level++;
        expNeeded = Math.floor(100 * Math.pow(1.5, level - 1));
    }
    
    return { level, currentExp, expNeeded };
}

function registerUser(msg, usersDb, isSubBot = false) {
    try {
        const isGroup = msg.key.remoteJid.includes('@g.us');
        let number;
        
        if (isGroup) {
            number = cleanNumber(msg.key.participant);
        } else {
            number = cleanNumber(msg.key.remoteJid);
        }
        
        const pushName = msg.pushName || 'Usuario';
        const fecha = new Date().toLocaleString('es-MX');

        if (number === 'Desconocido') {
            console.log(chalk.yellow('⚠️ No se pudo obtener número del usuario'));
            return null;
        }

        const userIndex = usersDb.findIndex(user => user.number === number);

        if (userIndex !== -1) {
            if (usersDb[userIndex].pushName !== pushName) {
                usersDb[userIndex].pushName = pushName;
            }
            
            if (typeof usersDb[userIndex].cmds === 'undefined') {
                usersDb[userIndex].cmds = 0;
            }
            if (typeof usersDb[userIndex].exp === 'undefined') {
                usersDb[userIndex].exp = 0;
            }
            if (typeof usersDb[userIndex].nivel === 'undefined') {
                usersDb[userIndex].nivel = 1;
            }
            
            usersDb[userIndex].cmds += 1;
            
            const earnedExp = Math.floor(Math.random() * (500 - 200 + 1)) + 200;
            usersDb[userIndex].exp += earnedExp;
            
            const levelData = calculateLevel(usersDb[userIndex].exp);
            usersDb[userIndex].nivel = levelData.level;
            
            const botType = isSubBot ? '[SUB-BOT]' : '[MAIN-BOT]';
            console.log(chalk.green(`${botType} ✅ Usuario actualizado: ${pushName} (${number}) | EXP: +${earnedExp} | Nivel: ${usersDb[userIndex].nivel}`));
            
        } else {
            usersDb.push({ 
                pushName: pushName,
                number: number,
                nivel: 1,
                exp: 0,
                fecha: fecha,
                cmds: 1
            });
            const botType = isSubBot ? '[SUB-BOT]' : '[MAIN-BOT]';
            console.log(chalk.green(`${botType} ⭐ Nuevo usuario registrado: ${pushName} (${number})`));
        }
        
        saveUsersDb(usersDb);
        return number;
        
    } catch (err) {
        console.error(chalk.red('Error en registerUser:'), err.message);
        return null;
    }
}

function loadSelfStatus(sock) {
    try {
        let botNumber = '';
        if (sock.phoneNumber) {
            botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
        } else if (sock.user?.id) {
            botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        }
        
        if (!botNumber) return false;
        
        const selfFilePath = path.join(process.cwd(), 'subs', botNumber, 'self.json');
        
        if (fs.existsSync(selfFilePath)) {
            const data = fs.readFileSync(selfFilePath, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed.enabled === true;
        }
    } catch (e) {
        console.error('Error cargando self.json:', e.message);
    }
    return false;
}

function getPrimaryBot(groupId) {
    try {
        if (fs.existsSync(PRIMARIOS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8'));
            return data[groupId] || null;
        }
    } catch (e) {}
    return null;
}

function savePrimaryBot(groupId, botNumber, botName) {
    try {
        let data = {};
        if (fs.existsSync(PRIMARIOS_FILE)) {
            data = JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8'));
        }
        data[groupId] = {
            botNumber: botNumber,
            botName: botName,
            updated: Date.now()
        };
        fs.writeFileSync(PRIMARIOS_FILE, JSON.stringify(data, null, 2));
        console.log(chalk.green(`✅ Bot primario actualizado: ${botNumber} en grupo ${groupId}`));
        return true;
    } catch (e) {
        console.error('Error guardando bot primario:', e);
        return false;
    }
}

function deletePrimaryBot(groupId) {
    try {
        if (fs.existsSync(PRIMARIOS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8'));
            if (data[groupId]) {
                delete data[groupId];
                fs.writeFileSync(PRIMARIOS_FILE, JSON.stringify(data, null, 2));
                console.log(chalk.yellow(`🗑️ Bot primario eliminado para grupo ${groupId}`));
                return true;
            }
        }
    } catch (e) {}
    return false;
}

function getActiveBots() {
    const activeBots = new Set();
    
    try {
        if (global.conns && Array.isArray(global.conns)) {
            for (const bot of global.conns) {
                if (bot.userId) {
                    const botNumber = cleanNumber(bot.userId);
                    if (botNumber && botNumber !== 'Desconocido') activeBots.add(botNumber);
                } else if (bot.user?.id) {
                    const botNumber = cleanNumber(bot.user.id);
                    if (botNumber && botNumber !== 'Desconocido') activeBots.add(botNumber);
                }
            }
        }
        
        if (global.principalBot) {
            const botNumber = cleanNumber(global.principalBot.user?.id || '');
            if (botNumber && botNumber !== 'Desconocido') activeBots.add(botNumber);
        }
        
        if (global.premiumBots && Array.isArray(global.premiumBots)) {
            for (const bot of global.premiumBots) {
                if (bot.user?.id) {
                    const botNumber = cleanNumber(bot.user.id);
                    if (botNumber && botNumber !== 'Desconocido') activeBots.add(botNumber);
                }
            }
        }
        
        if (global.mainBots && Array.isArray(global.mainBots)) {
            for (const bot of global.mainBots) {
                if (bot.user?.id) {
                    const botNumber = cleanNumber(bot.user.id);
                    if (botNumber && botNumber !== 'Desconocido') activeBots.add(botNumber);
                }
            }
        }
    } catch (e) {
        console.error('Error obteniendo bots activos:', e);
    }
    
    return activeBots;
}

async function isBotInGroup(sock, groupId, botNumber) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        return groupMetadata.participants.some(p => cleanNumber(p.id) === botNumber);
    } catch (e) {
        return false;
    }
}

async function getAvailableBotsInGroup(sock, groupId, currentBotNumber, activeBots) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const botsInGroup = [];
        
        for (const participant of groupMetadata.participants) {
            const participantNumber = cleanNumber(participant.id);
            
            if (activeBots.has(participantNumber)) {
                botsInGroup.push({
                    number: participantNumber,
                    jid: participant.id,
                    isCurrent: participantNumber === currentBotNumber
                });
            }
        }
        
        return botsInGroup;
    } catch (e) {
        return [];
    }
}

async function verificarYCorregirBotPrimario(sock, groupId, currentBotNumber, activeBots) {
    try {
        const primaryBotData = getPrimaryBot(groupId);
        
        if (!primaryBotData) return null;
        
        const primaryBotNumber = primaryBotData.botNumber;
        
        const isPrimaryActive = activeBots.has(primaryBotNumber);
        const isPrimaryInGroup = await isBotInGroup(sock, groupId, primaryBotNumber);
        
        if (isPrimaryActive && isPrimaryInGroup) {
            return primaryBotNumber;
        }
        
        console.log(chalk.yellow(`⚠️ Bot primario ${primaryBotNumber} no válido (activo:${isPrimaryActive}, en grupo:${isPrimaryInGroup})`));
        
        const availableBots = await getAvailableBotsInGroup(sock, groupId, currentBotNumber, activeBots);
        const validBots = availableBots.filter(b => b.number !== primaryBotNumber);
        
        if (validBots.length > 0) {
            const randomIndex = Math.floor(Math.random() * validBots.length);
            const newPrimaryBot = validBots[randomIndex];
            
            savePrimaryBot(groupId, newPrimaryBot.number, newPrimaryBot.name || 'Bot');
            
            console.log(chalk.green(`🔄 Bot primario cambiado de ${primaryBotNumber} a ${newPrimaryBot.number} en grupo ${groupId}`));
            
            return newPrimaryBot.number;
        } else {
            deletePrimaryBot(groupId);
            console.log(chalk.yellow(`🗑️ No hay bots disponibles, bot primario eliminado en grupo ${groupId}`));
            return null;
        }
    } catch (e) {
        console.error('Error verificando bot primario:', e);
        return null;
    }
}

function esperarRandom() {
    const MIN_DELAY = 5700;
    const MAX_DELAY = 10000;

    const tiempo = Math.floor(
        Math.random() * (MAX_DELAY - MIN_DELAY + 1)
    ) + MIN_DELAY;

    return new Promise(resolve => setTimeout(resolve, tiempo));
}

async function replyWithContext(sock, msg, text, config, mentions = []) {
    try {
        const from = msg.key.remoteJid;

        await esperarRandom();

        await sock.sendMessage(from, {
     
            text: text,
            mentions: mentions,
            contextInfo: {
                mentionedJid: mentions,
                forwardingScore: 9999999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.canalId || '',
                    serverMessageId: 0,
                    newsletterName: config.canalNombre || ''
                }
            }
        }, { quoted: msg });
        
        return true;
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        return false;
    }
}

async function getBotConfig(sock, defaultConfig) {
    try {
        const isSubBot = sock.isSubBot === true;
        const subNumber = sock.subNumber || '';
        
        if (isSubBot && subNumber) {
            const configPath = path.join(process.cwd(), 'subs', subNumber, 'config.js');
            
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                const jsonMatch = configContent.match(/export default\s+({[\s\S]*})/);
                
                if (jsonMatch && jsonMatch[1]) {
                    const infoConfig = eval('(' + jsonMatch[1] + ')');
                    if (infoConfig) {
                        console.log(chalk.cyan(`[CONFIG] Sub-bot ${subNumber}: prefijo=${infoConfig.prefix}, nombre=${infoConfig.nombre}`));
                        return {
                            ...defaultConfig,
                            ...infoConfig,
                        };
                    }
                }
            }
            console.log(chalk.yellow(`[CONFIG] No se encontró config para sub-bot ${subNumber}, usando default`));
            return defaultConfig;
        }
        
        let botNumber = '';
        
        if (sock.phoneNumber) {
            botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
        } else if (sock.user?.id) {
            botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        }
        
        if (!botNumber) return defaultConfig;
        
        const configPath = path.join(process.cwd(), 'info', botNumber, 'config.js');
        
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const jsonMatch = configContent.match(/export default\s+({[\s\S]*})/);
            
            if (jsonMatch && jsonMatch[1]) {
                const infoConfig = eval('(' + jsonMatch[1] + ')');
                if (infoConfig) {
                    console.log(chalk.cyan(`[CONFIG] Main-bot ${botNumber}: prefijo=${infoConfig.prefix}`));
                    return {
                        ...defaultConfig,
                        ...infoConfig,
                    };
                }
            }
        }
        
        return defaultConfig;
    } catch (error) {
        console.error('Error cargando configuración:', error);
        return defaultConfig;
    }
}

const handler = async (sock, msg, plugins, configParam) => {
    try {
        const isSubBot = sock.isSubBot === true;
        const subNumber = sock.subNumber || '';
        const botType = isSubBot ? `[SUB-BOT ${subNumber}]` : '[MAIN-BOT]';
        
        const config = await getBotConfig(sock, configParam);
        
        let usersDb = loadUsersDb();
        
        let body = '';
        
        if (msg.message?.conversation) {
            body = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
            body = msg.message.extendedTextMessage.text;
        } else if (msg.message?.imageMessage?.caption) {
            body = msg.message.imageMessage.caption;
        } else if (msg.message?.videoMessage?.caption) {
            body = msg.message.videoMessage.caption;
        } else if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
            body = msg.message.buttonsResponseMessage.selectedButtonId;
        } else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
            body = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        } else if (msg.message?.templateButtonReplyMessage?.selectedId) {
            body = msg.message.templateButtonReplyMessage.selectedId;
        } else if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                body = params.id || '';
            } catch (e) {
                body = '';
            }
        } else if (msg.message?.interactiveResponseMessage?.selectedButtonId) {
            body = msg.message.interactiveResponseMessage.selectedButtonId;
        } else if (msg.message?.interactiveResponseMessage?.selectedRowId) {
            body = msg.message.interactiveResponseMessage.selectedRowId;
        }
        
        if (!body) return;
        
        const isGroup = msg.key.remoteJid.includes('@g.us');
        
        let senderNumber;
        
        if (isGroup) {
            senderNumber = cleanNumber(msg.key.participant);
        } else {
            senderNumber = cleanNumber(msg.key.remoteJid);
        }
        
        const pushName = msg.pushName || 'Usuario';
        
        const h = chalk.bold.blue('╭────────────────────────────···');
        const t = chalk.bold.blue('╰────────────────────────────···');
        const v = chalk.bold.blue('│');
        
        console.log(`\n${h}`);
        console.log(chalk.bold.yellow(`${v} Fecha: ${chalk.whiteBright(moment().format('DD/MM/YY HH:mm:ss'))}`));
        console.log(chalk.bold.blueBright(`${v} Usuario: ${chalk.whiteBright(pushName)}`));
        console.log(chalk.bold.magentaBright(`${v} Remitente: ${gradient('deepskyblue', 'darkorchid')(senderNumber)}`));
        if (isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
                console.log(chalk.bold.cyanBright(`${v} Grupo: ${chalk.greenBright(groupMetadata.subject || 'Sin nombre')}`));
                console.log(chalk.bold.cyanBright(`${v} ID: ${gradient('violet', 'midnightblue')(msg.key.remoteJid)}`));
            } catch (e) {
                console.log(chalk.bold.cyanBright(`${v} Grupo: ${chalk.greenBright('Desconocido')}`));
            }
        } else {
            console.log(chalk.bold.greenBright(`${v} Chat privado`));
        }
        console.log(chalk.bold.white(`${v} Mensaje: ${gradient('orange', 'red')(body.substring(0, 100))}${body.length > 100 ? '...' : ''}`));
        console.log(`${t}\n`);
        
        let currentBotNumber = '';
        if (sock.phoneNumber) {
            currentBotNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
        } else if (sock.user?.id) {
            currentBotNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
        }
        
        let botownerClean = '';
        if (config.botowner) {
            botownerClean = config.botowner.toString().replace(/\D/g, '');
        }
        
        const isSelfMode = loadSelfStatus(sock);
        
        if (isSelfMode && senderNumber !== botownerClean) {
            console.log(chalk.yellow(`${botType} 🔒 Modo self activado, ignorando a ${pushName} (${senderNumber})`));
            return;
        }
        
        // ============ VERIFICAR BOT PRIMARIO (SOLO EN GRUPOS) ============
        let primaryBotNumber = null;
        if (isGroup) {
            // Obtener el bot primario guardado directamente
            const primaryData = getPrimaryBot(msg.key.remoteJid);
            if (primaryData) {
                primaryBotNumber = primaryData.botNumber;
                console.log(chalk.cyan(`${botType} 📌 Bot primario configurado: ${primaryBotNumber}`));
                console.log(chalk.cyan(`${botType} 📌 Bot actual: ${currentBotNumber}`));
            }
            
            // Si hay un bot primario configurado y NO es el bot actual, ignorar
            if (primaryBotNumber && primaryBotNumber !== currentBotNumber) {
                console.log(chalk.yellow(`${botType} 🎯 Bot primario es ${primaryBotNumber}, ignorando mensaje de ${pushName}`));
                return;
            }
        }
        // ================================================================
        
        if (body.startsWith('>')) {
            const evalPlugin = plugins.get('>');
            if (evalPlugin) {
                const isOwner = config.owner && config.owner.some(ownerNum => {
                    const cleanOwner = ownerNum.replace(/\D/g, '');
                    return cleanOwner === senderNumber;
                });
                
                if (isOwner) {
                    try {
                        await evalPlugin.execute(sock, msg, {
                            args: [],
                            command: '>',
                            body: body,
                            config: config,
                            startTime: Date.now(),
                            isOwner: isOwner,
                            pushName: pushName,
                            userNumber: senderNumber,
                            senderJid: isGroup ? msg.key.participant : msg.key.remoteJid,
                            isGroup: isGroup,
                            isSubBot: isSubBot,
                            replyWithContext: (text, mentions = []) => replyWithContext(sock, msg, text, config, mentions),
                            usersDb: usersDb,
                            saveUsersDb: () => saveUsersDb(usersDb),
                            loadUsersDb: loadUsersDb,
                            plugins: plugins
                        });
                    } catch (err) {
                        console.log(chalk.red(`${botType} Error en eval:`), err.message);
                    }
                }
                return;
            }
        }
        
        if (body.startsWith('$')) {
            const execPlugin = plugins.get('$');
            if (execPlugin) {
                const isOwner = config.owner && config.owner.some(ownerNum => {
                    const cleanOwner = ownerNum.replace(/\D/g, '');
                    return cleanOwner === senderNumber;
                });
                
                if (isOwner) {
                    try {
                        await execPlugin.execute(sock, msg, {
                            args: [],
                            command: '$',
                            body: body,
                            config: config,
                            startTime: Date.now(),
                            isOwner: isOwner,
                            pushName: pushName,
                            userNumber: senderNumber,
                            senderJid: isGroup ? msg.key.participant : msg.key.remoteJid,
                            isGroup: isGroup,
                            isSubBot: isSubBot,
                            replyWithContext: (text, mentions = []) => replyWithContext(sock, msg, text, config, mentions),
                            usersDb: usersDb,
                            saveUsersDb: () => saveUsersDb(usersDb),
                            loadUsersDb: loadUsersDb,
                            plugins: plugins
                        });
                    } catch (err) {
                        console.log(chalk.red(`${botType} Error en exec:`), err.message);
                    }
                }
                return;
            }
        }
        
        let prefix;

if (body.startsWith('-')) {
    prefix = '-';
} else if (body.startsWith(config.prefix)) {
    prefix = config.prefix;
} else {
    return;
}

const args = body.slice(prefix.length).trim().split(/ +/);
const commandName = args.shift().toLowerCase();
        
        if (!commandName) return;
        
        const plugin = plugins.get(commandName);
        
        if (!plugin) {
            return;
        }
        
        const isOwnerPlugin = (plugin.category || '').toLowerCase() === 'owner';

if (isOwnerPlugin) {
    if (prefix !== '-') return;
} else {
    if (prefix === '-') return;
}
        
        if (!msg.key.fromMe && senderNumber !== 'Desconocido') {
            registerUser(msg, usersDb, isSubBot);
            usersDb = loadUsersDb();
        }
        
        const isOwner = config.owner && config.owner.some(ownerNum => {
            const cleanOwner = ownerNum.replace(/\D/g, '');
            return cleanOwner === senderNumber;
        });
        
        try {
            console.log(chalk.green(`${botType} 🎮 Comando: ${config.prefix}${commandName} | Usuario: ${pushName} (${senderNumber})`));
            
            const startTime = Date.now();
            const senderJid = isGroup ? msg.key.participant : msg.key.remoteJid;
            
            await plugin.execute(sock, msg, {
                args: args,
                command: commandName,
                body: body,
                config: config,
                startTime: startTime,
                isOwner: isOwner,
                pushName: pushName,
                userNumber: senderNumber,
                senderJid: senderJid,
                isGroup: isGroup,
                isSubBot: isSubBot,
                replyWithContext: (text, mentions = []) => replyWithContext(sock, msg, text, config, mentions),
                usersDb: usersDb,
                saveUsersDb: () => saveUsersDb(usersDb),
                loadUsersDb: loadUsersDb,
                plugins: plugins
            });
            
        } catch (err) {
            console.log(chalk.red(`${botType} Error en ${commandName}:`), err.message);
            await replyWithContext(sock, msg,
                `❌ Error al ejecutar \`${config.prefix}${commandName}\`\n\n${err.message}`,
                config
            );
        }
        
    } catch (err) {
        console.log(chalk.red('Error en handler (general):'), err.message);
    }
};

export default handler;

export { 
    loadUsersDb,
    saveUsersDb,
    registerUser, 
    cleanNumber,
    replyWithContext,
    calculateLevel,
    getBotConfig,
    loadSelfStatus,
    getPrimaryBot,
    savePrimaryBot,
    deletePrimaryBot,
    verificarYCorregirBotPrimario
};