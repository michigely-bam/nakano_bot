export default {
    name: 'xd',
    alias: ['prods'],
    description: 'Anuncio de Facebook con botón',
    category: 'main',
    
    async execute(sock, msg, options) {
        await sock.relayMessage(msg.key.remoteJid,
        {
          interactiveMessage: {
            header: {
              title: "Anuncio de Facebook"
            },
            body: {
              text: "¡Hola, ! ¿Cómo podemos ayudarte?"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "inapp_signup",
                  buttonParamsJson: "{}"
                }
              ],
              messageParamsJson: ""
            },
          contextInfo: {}
          }
        },
        { })
    }
}
