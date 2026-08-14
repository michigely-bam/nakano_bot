import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanNumber(number) {
    if (!number) return '';
    let str = String(number);
    let cleaned = str.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

function getBotConfigPath(sock) {
    let botNumber = '';
    if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
    } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }
    if (!botNumber) return null;

    const subBotPath = path.join(process.cwd(), 'subs', botNumber, 'config.js');
    if (fs.existsSync(subBotPath)) return { path: subBotPath, number: botNumber };

    const mainPath = path.join(process.cwd(), 'config.js');
    if (fs.existsSync(mainPath)) return { path: mainPath, number: botNumber };

    return null;
}

function arrayToString(arr) {
    return arr.map(n => `'${n}'`).join(', ')
}

export default {
    name: 'owner',
    alias: ['addowner', 'addown', 'setowner', 'delowner', 'delown', 'ownerlist', 'listowner'],
    description: 'Añade, elimina y lista los owners del bot',
    category: 'owner',

    execute: async (sock, msg, options) => {
        try {
            const { config, senderNumber, userNumber, replyWithContext } = options
            const from = msg.key.remoteJid
            const reply = replyWithContext || ((text) => sock.sendMessage(from, { text }, { quoted: msg }))

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
            if (!text) return

            const usedPrefix = text[0]
            const fullCmd = text.slice(1).trim().split(' ')[0].toLowerCase()
            const args = text.slice(1).trim().split(' ').slice(1)

            const isAdd = ['addowner', 'addown', 'setowner'].includes(fullCmd)
            const isDel = ['delowner', 'delown'].includes(fullCmd)
            const isList = ['ownerlist', 'listowner'].includes(fullCmd)

            const botConfig = getBotConfigPath(sock)
            if (!botConfig) return reply('❌ No se encontró config.js')
            const configPath = botConfig.path

            let targetNumber = ''
            const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

            // LEER CONFIG ACTUAL
            let configContent = fs.readFileSync(configPath, 'utf8')
            let owners = Array.isArray(config.owner)? [...config.owner] : []
            let botowners = Array.isArray(config.botowner)? [...config.botowner] : []

            // LISTAR
            if (isList) {
                if (owners.length === 0) return reply('📋 *Lista de Owners*\n\n> No hay owners registrados.')
                let txt = '📋 *Lista de Owners*\n\n'
                txt += `*OWNER:*\n${owners.map((n,i)=> `${i+1}. 👑 ${n}`).join('\n')}\n\n`
                txt += `*BOTOWNER:*\n${botowners.map((n,i)=> `${i+1}. 👑 ${n}`).join('\n')}`
                return reply(txt)
            }

            // OBTENER NUMERO
            if (quotedSender) targetNumber = cleanNumber(quotedSender)
            else if (mentionedJid?.[0]) targetNumber = cleanNumber(mentionedJid[0])
            else if (args[0]) {
                targetNumber = cleanNumber(args[0])
                if (targetNumber.startsWith('0')) targetNumber = '51' + targetNumber.slice(1)
            }

            if (!targetNumber) {
                return reply(
                    `👑 *${isAdd? 'ADD' : 'DEL'} OWNER*\n\n` +
                    `╭┈⬡「 📋 *Uso* 」\n` +
                    `┃ ◦ Responde mensaje del usuario\n` +
                    `┃ ◦ Tag @usuario\n` +
                    `┃ ◦ Escribe el número directo\n` +
                    `╰┈⬡\n\n` +
                    `Ejemplo: ${usedPrefix}${fullCmd} 51987654321`
                )
            }

            // AÑADIR
            if (isAdd) {
                if (owners.includes(targetNumber)) {
                    return reply(`❌ \`${targetNumber}\` ya está en la lista de owner.`)
                }

                owners.push(targetNumber)
                botowners.push(targetNumber) // lo metemos en ambos

                // Reemplazar en config.js
                configContent = configContent.replace(/owner:\s*\[[^\]]*\]/, `owner: [${arrayToString(owners)}]`)
                configContent = configContent.replace(/botowner:\s*\[[^\]]*\]/, `botowner: [${arrayToString(botowners)}]`)

                fs.writeFileSync(configPath, configContent, 'utf8')

                // Actualizar en memoria
                if (options.config) {
                    options.config.owner = owners
                    options.config.botowner = botowners
                }

                await sock.sendMessage(from, { react: { text: '👑', key: msg.key } })
                return reply(`👑 *Owner añadido con éxito*\n\n📱 Número: \`${targetNumber}\`\n📊 Total owner: \`${owners.length}\`\n📊 Total botowner: \`${botowners.length}\`\n\n> *Reinicia el bot para aplicar*`)
            }

            // ELIMINAR
            if (isDel) {
                const idx1 = owners.indexOf(targetNumber)
                const idx2 = botowners.indexOf(targetNumber)

                if (idx1 === -1 && idx2 === -1) return reply(`❌ \`${targetNumber}\` no está en la lista.`)

                if (idx1!== -1) owners.splice(idx1, 1)
                if (idx2!== -1) botowners.splice(idx2, 1)

                configContent = configContent.replace(/owner:\s*\[[^\]]*\]/, `owner: [${arrayToString(owners)}]`)
                configContent = configContent.replace(/botowner:\s*\[[^\]]*\]/, `botowner: [${arrayToString(botowners)}]`)

                fs.writeFileSync(configPath, configContent, 'utf8')

                if (options.config) {
                    options.config.owner = owners
                    options.config.botowner = botowners
                }

                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })
                return reply(`✅ *Owner eliminado*\n\nNúmero: \`${targetNumber}\`\nTotal owner: *${owners.length}*\nTotal botowner: *${botowners.length}*\n\n> *Reinicia el bot para aplicar*`)
            }

        } catch (error) {
            console.error('Error en owner:', error)
            const reply = options.replyWithContext || ((text) => sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg }))
            await reply(`🌼 Error: ${error.message}`)
        }
    }
}