import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'reload',
    alias: ['recargar', 'refresh'],
    description: 'Recarga todos los comandos del bot (solo owner)',
    category: 'owner',
    
    async execute(sock, msg, options) {
        const jid = msg.key.remoteJid;
        try {
            const { config, isOwner, pushName, userNumber, plugins } = options;
            
            if (!isOwner) {
                return await sock.sendMessage(jid, { 
                    text: `🌌 El comando \`${config.prefix}reload\` es solo para owner.\n> Usa ${config.prefix}help para ver mis comandos` 
                });
            }
            
            // ===== DELAY RANDOM 1-3 SEGUNDOS =====
            await sock.sendPresenceUpdate('composing', jid).catch(() => {});
            const delay = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(r => setTimeout(r, delay));
            // ======================================
            
            try {
                await sock.sendMessage(jid, { react: { text: '🔄', key: msg.key } });
            } catch (e) {}
            
            try {
                const pluginsDir = path.join(process.cwd(), 'plugins');
                
                if (!fs.existsSync(pluginsDir)) {
                    await sock.sendPresenceUpdate('paused', jid).catch(() => {});
                    return await sock.sendMessage(jid, { text: `🌠 No se encontró la carpeta de plugins` });
                }
                
                function getPluginFiles(dir) {
    let files = [];

    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            files.push(...getPluginFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

const pluginFiles = getPluginFiles(pluginsDir);
                
                let successCount = 0;
                let failCount = 0;
                const failedPlugins = [];
                
                // Limpiar plugins
                if (plugins) {
                    plugins.clear();
                }
                
                // Recargar plugins
                for (const file of pluginFiles) {
                    try {
                        const filePath = file;
                        const fileUrl = `file://${filePath}?update=${Date.now()}`;
                        const pluginModule = await import(fileUrl);
                        const pluginData = pluginModule.default || pluginModule;
                        
                        if (pluginData && pluginData.name) {
                            if (plugins) {
                                plugins.set(pluginData.name.toLowerCase(), pluginData);
                                
                                if (pluginData.alias && Array.isArray(pluginData.alias)) {
                                    pluginData.alias.forEach(alias => {
                                        plugins.set(alias.toLowerCase(), pluginData);
                                    });
                                }
                            }
                            successCount++;
                            console.log(`✅ Plugin recargado: ${pluginData.name}`);
                        } else {
                            failCount++;
                            failedPlugins.push({
                                nombre: file,
                                error: 'El plugin no exporta un nombre válido'
                            });
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 10));
                        
                    } catch (error) {
                        failCount++;
                        failedPlugins.push({
                            nombre: file,
                            error: error.message || error.toString()
                        });
                        console.error(`❌ Error recargando ${file}:`, error);
                    }
                }
                
                let resultMessage = `🌠 *Plugins Recargados*\n> ✅ Exitosos: ${successCount}\n> ❌ Fallidos: ${failCount}`;
                
                if (failCount > 0 && failedPlugins.length > 0) {
                    resultMessage += `\n\n❌ *Plugins con error:*`;
                    failedPlugins.forEach(plugin => {
                        resultMessage += `\n\n📄 *${plugin.nombre}*\n\`\n${plugin.error}\n\`\``;
                    });
                }
                
                await sock.sendPresenceUpdate('paused', jid).catch(() => {});
                
                // Enviar resultado normal
                if (resultMessage.length > 4000) {
                    await sock.sendMessage(jid, { 
                        text: `🌠 *Plugins Recargados*\n> ✅ Exitosos: ${successCount}\n> ❌ Fallidos: ${failCount}\n\n📄 Enviando errores...` 
                    });
                    
                    for (const plugin of failedPlugins) {
                        const errorMsg = `📄 *${plugin.nombre}*\n\`\`\n${plugin.error}\n\`\``;
                        await sock.sendMessage(jid, { text: errorMsg });
                    }
                } else {
                    await sock.sendMessage(jid, { text: resultMessage });
                }
                
                try {
                    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
                } catch (e) {}
                
                console.log(`✅ Plugins recargados por OWNER: ${pushName || userNumber} - Éxito: ${successCount}, Fallos: ${failCount}`);
                
            } catch (error) {
                await sock.sendPresenceUpdate('paused', jid).catch(() => {});
                console.error('Error en reload:', error);
                await sock.sendMessage(jid, { 
                    text: `🌠 Error al recargar plugins:\n\`\n${error.stack || error.message}\n\`\`` 
                });
            }
            
        } catch (error) {
            await sock.sendPresenceUpdate('paused', jid).catch(() => {});
            console.error('❌ Error en reload:', error);
            
            try {
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            await sock.sendMessage(jid, { 
                text: `❌ *Error:*\n\`\n${error.stack || error.message}\n\`\`` 
            });
        }
    }
};