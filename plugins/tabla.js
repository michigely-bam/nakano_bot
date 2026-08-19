import { randomUUID } from 'crypto'
import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys'

const CTA_TYPES = [
  'OPEN_URL',
  'COPY',
  'CALL',
  'QUICK_REPLY'
]

function buildSections(items) {
  const submessages = []
  const sections = []

  for (const item of items) {

    // TEXTO
    if (item.text !== undefined) {
      submessages.push({
        messageType:
          proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_TEXT,
        messageText: item.text
      })

      sections.push({
        view_model: {
          primitive: {
            text: item.text,
            __typename: 'GenAIMarkdownTextUXPrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })

      continue
    }

    // IMAGEN
    if (item.image !== undefined) {
      const media = {
        url: item.image,
        mime_type: item.mimetype || 'image/png',
        __typename: 'GenAIMediaItem'
      }

      sections.push({
        view_model: {
          primitive: {
            preview_image: media,
            full_image: media,
            __typename: 'GenAIImagePrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })

      continue
    }

    // BOTÓN
    if (item.cta_button) {
      const type =
        (item.cta_button.type || 'OPEN_URL').toUpperCase()

      if (!CTA_TYPES.includes(type)) {
        throw new Error(`cta_type inválido: ${type}`)
      }

      sections.push({
        view_model: {
          primitive: {
            cta_text: item.cta_button.text,
            cta_type: type,
            cta_url: item.cta_button.url,
            __typename: 'GenAIFooterActionPrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })

      continue
    }

    // TABLA
    if (item.table) {
      if (!Array.isArray(item.table.rows)) {
        throw new Error('Las filas de la tabla deben ser un array')
      }

      sections.push({
        view_model: {
          primitive: {
            rows: item.table.rows,
            __typename: 'GenATableUXPrimitive'
          },
          __typename: 'GenAISingleLayoutViewModel'
        }
      })

      continue
    }

    throw new Error(
      `Item no soportado: ${JSON.stringify(item)}`
    )
  }

  return {
    submessages,
    sections
  }
}

async function sendMetaMsg(
  sock,
  jid,
  items,
  quoted,
  disclaimer
) {
  const {
    submessages,
    sections
  } = buildSections(items)

  const data = Buffer
    .from(
      JSON.stringify({
        response_id: randomUUID(),
        sections
      })
    )
    .toString('base64')

  const content = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,

      botMetadata: {
        pluginMetadata: {},
        messageDisclaimerText:
          disclaimer ||
          `Enviado por ${global.botname || 'Miku Nakano'}`
      }
    },

    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType:
            proto.AIRichResponseMessageType
              .AI_RICH_RESPONSE_TYPE_STANDARD,

          submessages,

          unifiedResponse: {
            data
          }
        }
      }
    }
  }

  const userJid = sock.user?.id

  const generated = generateWAMessageFromContent(
    jid,
    content,
    {
      quoted,
      ...(userJid ? { userJid } : {})
    }
  )

  await sock.relayMessage(
    jid,
    generated.message,
    {
      messageId: generated.key.id
    }
  )

  return generated
}

export default {
  name: 'xxx',
  alias: ['metamsg', 'genai'],
  description:
    'Envía mensajes enriquecidos con texto, imagen, botón o tabla.',
  category: 'Owner',
  usage:
    '/randm texto | imagen | texto botón | URL | disclaimer',

  async execute(sock, msg, options = {}) {
    try {
      const args = options.args || []

      const text = args.join(' ').trim()

      const from = msg.key.remoteJid

      const reply = async (text) => {
        return await sock.sendMessage(
          from,
          { text },
          { quoted: msg }
        )
      }

      if (!text) {
        return reply(
          `> *🦖 Falta el contenido.*\n\n` +
          `🍀 *Uso:*\n` +
          `${options.usedPrefix || '.'}${options.command || 'randm'} texto | imagen | botón | url | disclaimer\n\n` +
          `☔ *Ejemplo:*\n` +
          `${options.usedPrefix || '.'}randm Hola Miku | https://ejemplo.com/miku.png | Visitar | https://google.com | Miku Nakano\n\n` +
          `Puedes omitir imagen, botón o disclaimer.`
        )
      }

      const parts = text
        .split('|')
        .map(s => s.trim())

      const body = parts[0] || ''
      const image = parts[1] || ''
      const btnText = parts[2] || ''
      const btnUrl = parts[3] || ''
      const disclaimer = parts[4] || ''

      const items = []

      if (body) {
        items.push({
          text: body
        })
      }

      if (image) {
        items.push({
          image
        })
      }

      if (btnText && btnUrl) {
        items.push({
          cta_button: {
            text: btnText,
            type: 'OPEN_URL',
            url: btnUrl
          }
        })
      }

      if (!items.length) {
        return reply(
          '🍡 No hay contenido para enviar.'
        )
      }

      await sendMetaMsg(
        sock,
        from,
        items,
        msg,
        disclaimer
      )

    } catch (error) {
      console.error(
        '[RANDM]',
        error
      )

      const from = msg.key.remoteJid

      await sock.sendMessage(
        from,
        {
          text:
            `❌ Error al ejecutar /randm\n\n` +
            `${error?.message || error}`
        },
        {
          quoted: msg
        }
      )
    }
  }
}
