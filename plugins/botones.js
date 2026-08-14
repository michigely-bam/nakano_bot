import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

export default {
  name: "botones",
  alias: ["boton"],
  description: "Prueba botones simples",
  category: "Utilidad",

  async execute(sock, m) {

    const from = m.chat;

    try {

      const msg = generateWAMessageFromContent(
        from,
        {
          buttonsMessage: {
            contentText: "Prueba de botones",
            footerText: "✦ Test Bot ✦",
            buttons: [
              {
                buttonId: "boton1",
                buttonText: {
                  displayText: "Botón 1"
                },
                type: 1
              },
              {
                buttonId: "boton2",
                buttonText: {
                  displayText: "Botón 2"
                },
                type: 1
              }
            ],
            headerType: 1
          }
        },
        {
          userJid: sock.user?.id || sock.user?.jid
        }
      );

      await sock.relayMessage(
        from,
        msg.message,
        {
          messageId: msg.key.id
        }
      );

    } catch (e) {

      console.error(e);

      await sock.sendMessage(from, {
        text: "❌ Error: " + e.message
      });

    }
  }
};