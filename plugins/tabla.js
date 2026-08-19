import { Buffer } from 'buffer'

export default {
  name: 'tabla',
  command: ['tabla'],
  category: 'test',
  description: 'Prueba una tabla GenAI',

  async execute(m, { conn }) {
    const unifiedResponse = {
      response_id:
        'BAE5' + Math.random().toString(36).substring(2, 15).toUpperCase(),

      sections: [
        {
          view_model: {
            primitive: {
              rows: [
                {
                  is_header: true,
                  cells: [
                    'Nombre',
                    'Precio',
                    'Estado'
                  ]
                },
                {
                  is_header: false,
                  cells: [
                    'Producto A',
                    'S/50',
                    'Disponible'
                  ]
                },
                {
                  is_header: false,
                  cells: [
                    'Producto B',
                    'S/80',
                    'Agotado'
                  ]
                },
                {
                  is_header: false,
                  cells: [
                    'Producto C',
                    'S/100',
                    'Disponible'
                  ]
                }
              ],

              __typename: 'GenATableUXPrimitive'
            },

            __typename: 'GenAISingleLayoutViewModel'
          }
        }
      ]
    }

    const data = Buffer
      .from(JSON.stringify(unifiedResponse))
      .toString('base64')

    await conn.relayMessage(
      m.chat,
      {
        messageContextInfo: {
          threadId: [],
          deviceListMetadata: {
            senderKeyIndexes: [],
            recipientKeyIndexes: []
          },
          deviceListMetadataVersion: 2,
          botMetadata: {
            messageDisclaimerText: 'Contenido Completo de Meta Ai',
            richResponseSourcesMetadata: {
              sources: []
            }
          }
        },

        botForwardedMessage: {
          message: {
            richResponseMessage: {
              submessages: [],
              messageType: 1,

              unifiedResponse: {
                data
              },

              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedAiBotMessageInfo: {
                  botJid: '867051314767696@bot'
                },
                forwardOrigin: 4
              }
            }
          }
        }
      },
      {}
    )
  }
}
