import fs from "fs";
import path from "path";
import { hotReloadPlugin } from "../../src/lib/ourin-plugins.js";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "addplugin",
  alias: ["addpl", "tambahplugin"],
  category: "owner",
  description: "Tambah plugin baru dari code yang di-reply",
  usage: ".addplugin [namafile] [folder]",
  example: ".addplugin bliblidl downloader",
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
  const nameMatch = code.match(/name:\s*['"`]([^'"`]+)['"]/i);
  if (nameMatch) info.name = nameMatch[1];
  const categoryMatch = code.match(/category:\s*['"`]([^'"`]+)['"]/i);
  if (categoryMatch) info.category = categoryMatch[1];
  return info;
}

async function handler(m, { sock }) {
  const quoted = m.quoted;

  if (!quoted) {
    return m.reply(
      `📦 *ADD PLUGIN*\n\n` +
        `Reply code plugin dengan caption:\n` +
        `\`${m.prefix}addplugin\` - Auto detect\n` +
        `\`${m.prefix}addplugin namafile\` - Custom nama\n` +
        `\`${m.prefix}addplugin namafile folder\` - Custom nama + folder`,
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
      `❌ *GAGAL*\n\nTidak bisa mendeteksi nama plugin\nGunakan \`${m.prefix}addplugin <namafile>\``,
    );
  }

  if (!folderName) folderName = "other";

  fileName = fileName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");
  folderName = folderName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");

  if (!fileName) {
    return m.reply(`❌ *GAGAL*\n\nNama file tidak valid`);
  }

  await m.react("🕕");

  try {
    const pluginsDir = path.join(process.cwd(), "plugins");
    const folderPath = path.join(pluginsDir, folderName);
    const filePath = path.join(folderPath, `${fileName}.js`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      await m.react("❌");
      return m.reply(
        `❌ *GAGAL*\n\n` +
          `File \`${fileName}.js\` sudah ada di folder \`${folderName}\`\n\n` +
          `💡 Gunakan \`${m.prefix}ganticode ${fileName} ${folderName}\` untuk mengganti code yang sudah ada`,
      );
    }

    fs.writeFileSync(filePath, code);

    let reloadResult = { success: false };
    try {
      reloadResult = (await hotReloadPlugin(filePath)) || { success: true };
    } catch {}

    await m.react("✅");
    return m.reply(
      `✅ *PLUGIN DITAMBAH*\n\n` +
        `╭─〔 *DETAIL* 〕───⬣\n` +
        `│ File: \`${fileName}.js\`\n` +
        `│ Folder: \`${folderName}\`\n` +
        `│ Size: \`${code.length} bytes\`\n` +
        `│ Hot Reload: ${reloadResult.success ? "✅ Sukses" : "⚠️ Pending"}\n` +
        `╰───────⬣\n\n` +
        `Plugin sudah aktif dan siap digunakan!`,
    );
  } catch (error) {
    await m.react("☢");
    await m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
