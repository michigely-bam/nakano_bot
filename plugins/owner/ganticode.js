import fs from "fs";
import path from "path";
import { hotReloadPlugin } from "../../src/lib/ourin-plugins.js";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "ganticode",
  alias: ["replaceplugin", "updateplugin", "gantiplugin"],
  category: "owner",
  description: "Ganti code plugin yang sudah ada",
  usage: ".ganticode [namafile] [folder]",
  example: ".ganticode ping main",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function extractPluginInfo(code) {
  const info = { name: null, category: null };
  const nameMatch = code.match(/name:\s*['"`]([^'"`]+)['"`]/i);
  if (nameMatch) info.name = nameMatch[1];
  const categoryMatch = code.match(/category:\s*['"`]([^'"`]+)['"`]/i);
  if (categoryMatch) info.category = categoryMatch[1];
  return info;
}

function findPluginFile(pluginsDir, name) {
  const folders = fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of folders) {
    const folderPath = path.join(pluginsDir, folder);
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const baseName = file.replace(".js", "");
      if (baseName.toLowerCase() === name.toLowerCase()) {
        return { folder, file, path: path.join(folderPath, file) };
      }
    }
  }

  return null;
}

async function handler(m, { sock }) {
  const quoted = m.quoted;

  if (!quoted) {
    return m.reply(
      `🔄 *GANTI CODE*\n\n` +
        `Reply code plugin baru dengan caption:\n` +
        `\`${m.prefix}ganticode\` - Auto detect\n` +
        `\`${m.prefix}ganticode namafile\` - Custom nama\n` +
        `\`${m.prefix}ganticode namafile folder\` - Custom nama + folder\n\n` +
        `⚠️ *PERINGATAN:*\nCode lama akan di-backup sebelum diganti`,
    );
  }

  let code = quoted.text || quoted.body || "";

  if (
    quoted.mimetype === "application/javascript" ||
    quoted.filename?.endsWith(".js")
  ) {
    try {
      code = (await quoted.download()).toString();
    } catch (e) {
      return m.reply(`❌ *GAGAL*\n\nGagal download file`);
    }
  }

  if (!code || code.length < 50) {
    return m.reply(`❌ *GAGAL*\n\nCode terlalu pendek atau tidak valid`);
  }

  const hasExport = code.includes("module.exports") || code.includes("export ");
  const hasConfig = code.includes("pluginConfig") || code.includes("config");
  if (!hasExport || !hasConfig) {
    return m.reply(
      `❌ *GAGAL*\n\nCode bukan format plugin yang valid\nHarus ada export dan config`,
    );
  }

  const extracted = extractPluginInfo(code);
  const args = m.args;

  let fileName = args[0] || extracted.name;
  let folderName = args[1] || extracted.category;

  if (!fileName) {
    return m.reply(
      `❌ *GAGAL*\n\nTidak bisa mendeteksi nama plugin\nGunakan \`${m.prefix}ganticode <namafile>\``,
    );
  }

  fileName = fileName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");

  if (!fileName) {
    return m.reply(`❌ *GAGAL*\n\nNama file tidak valid`);
  }

  await m.react("🕕");

  try {
    const pluginsDir = path.join(process.cwd(), "plugins");
    const existing = findPluginFile(pluginsDir, fileName);

    let filePath;
    let targetFolder;
    let isNewFile = false;
    let backupPath = null;
    let oldSize = 0;

    if (existing) {
      filePath = existing.path;
      targetFolder = existing.folder;
      oldSize = fs.statSync(filePath).size;

      const backupDir = path.join(process.cwd(), "backup", "plugins");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      backupPath = path.join(backupDir, `${fileName}_${timestamp}.js`);
      fs.copyFileSync(filePath, backupPath);
    } else {
      if (!folderName) folderName = "other";
      folderName = folderName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");

      targetFolder = folderName;
      const folderPath = path.join(pluginsDir, targetFolder);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      filePath = path.join(folderPath, `${fileName}.js`);
      isNewFile = true;
    }

    fs.writeFileSync(filePath, code);

    let reloadResult = { success: false };
    try {
      reloadResult = (await hotReloadPlugin(filePath)) || { success: true };
    } catch {}

    await m.react("✅");

    let replyText =
      `✅ *CODE ${isNewFile ? "DITAMBAH" : "DIGANTI"}*\n\n` +
      `╭─〔 *DETAIL* 〕───⬣\n` +
      `│ File: \`${fileName}.js\`\n` +
      `│ Folder: \`${targetFolder}\`\n` +
      `│ Size: \`${code.length} bytes\`\n`;

    if (!isNewFile) {
      replyText += `│ Old Size: \`${oldSize} bytes\`\n`;
    }

    replyText +=
      ` │ 🔄 Hot Reload: ${reloadResult.success ? "✅ Sukses" : "⚠️ Pending"}\n` +
      `╰───────⬣\n\n`;

    if (backupPath) {
      const relBackup = path.relative(process.cwd(), backupPath);
      replyText += `💾 *Backup:*\n\`${relBackup}\`\n\n`;
    }

    replyText += `Plugin sudah aktif dan siap digunakan!`;

    return m.reply(replyText);
  } catch (error) {
    await m.react("☢");
    await m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
