import cp, { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec).bind(cp);

export default {
    name: 'r',
    alias: ['exec', 'ejecutar', '$'],
    category: 'owner',
    
    async execute(sock, msg, { args, isOwner, replyWithContext }) {
        if (!isOwner) return; // Silencioso si no es owner
        
        const command = args.join(' ');
        if (!command) return replyWithContext(`❌ Mete un comando\nEj:.r pm2 list`);

        try {
            await sock.sendMessage(msg.key.remoteJid, { react: { text: '🕒', key: msg.key } });
            const { stdout, stderr } = await exec(command);
            await sock.sendMessage(msg.key.remoteJid, { react: { text: '✔️', key: msg.key } });
            
            if (stdout?.trim()) await replyWithContext(`\`\`${stdout}\`\``);
            if (stderr?.trim()) await replyWithContext(`\`\`${stderr}\`\``);
            
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { react: { text: '✖️', key: msg.key } });
            await replyWithContext(`\`\`${e.message}\`\``);
        }
    }
};