import { execFile } from 'child_process'
import { promisify } from 'util'
import { performance } from 'perf_hooks'

const exec_file = promisify(execFile)

function cutText(text, limit = 2200) {
  text = String(text || '').trim()
  return text.length > limit
    ? text.slice(0, limit) + '\n...[recortado]'
    : text
}

function errorOutput(err) {
  return [
    err?.stdout,
    err?.stderr,
    err?.message,
    String(err || '')
  ]
    .filter(Boolean)
    .join('\n')
}

export default {
  name: 'pull',
  alias: ['update', 'actualizar'],
  description: 'Actualiza el bot desde GitHub.',
  category: 'owner',
  usage: '/pull',

  async execute(sock, msg, options = {}) {
    const start = performance.now()
    const cwd = process.cwd()

    try {
      await exec_file(
        'git',
        ['rev-parse', '--is-inside-work-tree'],
        {
          cwd,
          timeout: 10000
        }
      )

      const { stdout, stderr } = await exec_file(
        'git',
        ['pull'],
        {
          cwd,
          timeout: 120000,
          maxBuffer: 1024 * 1024 * 8
        }
      )

      let npmOut = ''

      try {
        const npmResult = await exec_file(
          'npm',
          ['install', '--omit=dev'],
          {
            cwd,
            timeout: 120000,
            maxBuffer: 1024 * 1024 * 8
          }
        )

        npmOut = [
          npmResult.stdout,
          npmResult.stderr
        ]
          .filter(Boolean)
          .join('\n')

      } catch (npmErr) {
        npmOut = errorOutput(npmErr)
      }

      const {
        reload_files,
        reload_all_files,
        load_plugins
      } = options

      const reloader =
        typeof reload_files === 'function'
          ? reload_files
          : typeof reload_all_files === 'function'
            ? reload_all_files
            : typeof load_plugins === 'function'
              ? load_plugins
              : typeof globalThis.reloadAllFiles === 'function'
                ? globalThis.reloadAllFiles
                : null

      const reloadResult = reloader
        ? await reloader()
        : null

      const time = (performance.now() - start).toFixed(2)

      const output =
        cutText(
          [stdout, stderr]
            .filter(Boolean)
            .join('\n')
        ) || 'Sin cambios.'

      const npmOutput =
        cutText(npmOut) || 'Sin cambios.'

      const reloadText = reloadResult
        ? `${reloadResult.plugins ?? 0} plugins / ${reloadResult.commands ?? 0} comandos`
        : 'No disponible'

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
            `🌴 Actualización Realizada!\n\n` +
            `> *=>* Tiempo: ${time} ms\n` +
            `> *=>* Recargado: ${reloadText}\n\n` +
            `*• Git:*\n${output}\n\n` +
            `*• NPM:*\n${npmOutput}`
        },
        {
          quoted: msg
        }
      )

    } catch (err) {
      console.error('[PULL]', err)

      const output =
        cutText(errorOutput(err)) ||
        'Error desconocido.'

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
            `📍 Fix Failed\n\n` +
            `⚠️ Reason:\n${output}`
        },
        {
          quoted: msg
        }
      )
    }
  }
}
