import cp, { exec as _exec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec).bind(cp);

export default {
    name: 'restart',
    alias: ['reiniciar', 'reboot'],
    description: 'Reinicia el bot (solo owner)',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, isOwner, replyWithContext } = options;
            
            if (!isOwner) {
                return await replyWithContext(`🌌 El comando \`${config.prefix}restart\` Es solo para owner.\n> Usa ${config.prefix}help para ver mis comandos`);
            }
            
            await replyWithContext(`🌌 Reiniciando el bot...\n> *Espere un momento...*`);
            
            setTimeout(async () => {
                try {
                    // Ejecutar pm2 restart shinobu
                    const { stdout, stderr } = await exec('pm2 restart shinobu');
                    console.log('✅ Bot reiniciado con PM2:', stdout);
                    if (stderr) console.log('⚠️ PM2 stderr:', stderr);
                } catch (error) {
                    console.error('❌ Error al reiniciar con PM2:', error.message);
                    // Si falla PM2, intentar con process.exit
                    if (process.send) {
                        process.send("restart");
                    } else {
                        process.exit(0);
                    }
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ Error en restart:', error);
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};