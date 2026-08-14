import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

export default {
  name: 'form',
  alias: ['encuesta', 'formulario'],
  description: 'Enviar encuesta con Flow de WhatsApp',
  category: 'Utilidad',

  async execute(sock, m, options) {
    const from = m.key?.remoteJid || m.chat;

    try {
      const txt = `*📊 ENCUESTA*\nEstimado cliente KFG, por favor responda la encuesta.`;

      const buttons = [
        {
          name: "galaxy_message",
          buttonParamsJson: "{\"flow_message_version\":\"3\",\"flow_token\":\"{\\\"ticket_id\\\":\\\"1594484278500636\\\"}\",\"flow_id\":\"1898584297721174\",\"flow_cta\":\"Ver Ticket\",\"flow_action\":\"navigate\",\"flow_action_payload\":{\"screen\":\"SATISFACTION_SCREEN\",\"data\":{\"serializedJson\":\"{\\\"title\\\":\\\"Mira el Ticket\\\",\\\"continue_label\\\":\\\"Continuar\\\",\\\"satisfaction_screen_question\\\":\\\"\\\\u00bfEst\\\\u00e1s satisfecho o insatisfecho con la experiencia de atenci\\\\u00f3n al cliente?\\\",\\\"very_satisfied_label\\\":\\\"Muy satisfecho\\\",\\\"slightly_satisfied_label\\\":\\\"Ligeramente satisfecho\\\",\\\"neutral_label\\\":\\\"Indiferente\\\",\\\"slightly_dissatisfied_label\\\":\\\"Ligeramente insatisfecho\\\",\\\"very_dissatisfied_label\\\":\\\"Muy poco satisfecho\\\",\\\"helpfulness_screen_question\\\":\\\"\\\\u00bfTe parecieron \\\\u00fatiles o poco \\\\u00fatiles tus representantes?\\\",\\\"very_helpful_label\\\":\\\"Muy \\\\u00fatiles\\\",\\\"slightly_helpful_label\\\":\\\"Ligeramente \\\\u00fatiles\\\",\\\"slightly_unhelpful_label\\\":\\\"Ligeramente poco \\\\u00fatiles\\\",\\\"very_unhelpful_label\\\":\\\"Muy poco \\\\u00fatiles\\\",\\\"question_answered_screen_question\\\":\\\"\\\\u00bfRespondimos a tu pregunta?\\\",\\\"yes_label\\\":\\\"S\\\\u00ed\\\",\\\"no_label\\\":\\\"No\\\",\\\"improvement_suggestion_label\\\":\\\"\\\\u00bfQu\\\\u00e9 podr\\\\u00edamos mejorar?\\\",\\\"submit_label\\\":\\\"Enviar\\\"}\"}},\"flow_metadata\":{\"flow_json_version\":700,\"data_api_protocol\":null,\"data_api_version\":null,\"flow_name\":\"In-App CSAT Survey No Agent v3 - es_LA_v1\",\"creation_source\":\"CSAT\",\"categories\":[]},\"icon\":\"DEFAULT\",\"has_multiple_buttons\":false}"
        },
        {
          name: "galaxy_message",
          buttonParamsJson: "{\"flow_message_version\":\"3\",\"flow_token\":\"{\\\"ticket_id\\\":\\\"1594484278500636\\\"}\",\"flow_id\":\"1898584297721174\",\"flow_cta\":\"Dale Like\",\"flow_action\":\"navigate\",\"flow_action_payload\":{\"screen\":\"SATISFACTION_SCREEN\",\"data\":{\"serializedJson\":\"{\\\"title\\\":\\\"Le diste me gusta a este contenido vamooo\\\",\\\"continue_label\\\":\\\"Continuar\\\",\\\"satisfaction_screen_question\\\":\\\"\\\\u00bfTe gust\\\\u00f3 el contenido?\\\",\\\"very_satisfied_label\\\":\\\"Me encanto!\\\",\\\"slightly_satisfied_label\\\":\\\"Esta bien\\\",\\\"neutral_label\\\":\\\"Indiferente\\\",\\\"slightly_dissatisfied_label\\\":\\\"Malo\\\",\\\"very_dissatisfied_label\\\":\\\"Muy malo\\\",\\\"helpfulness_screen_question\\\":\\\"\\\\u00bfTe pareci\\\\u00f3 \\\\u00fatil?\\\",\\\"very_helpful_label\\\":\\\"Muy \\\\u00fatil\\\",\\\"slightly_helpful_label\\\":\\\"Normal\\\",\\\"slightly_unhelpful_label\\\":\\\"Poco \\\\u00fatil\\\",\\\"very_unhelpful_label\\\":\\\"Nada \\\\u00fatil\\\",\\\"question_answered_screen_question\\\":\\\"\\\\u00bfTe sirvi\\\\u00f3?\\\",\\\"yes_label\\\":\\\"S\\\\u00ed\\\",\\\"no_label\\\":\\\"No\\\",\\\"improvement_suggestion_label\\\":\\\"\\\\u00bfQu\\\\u00e9 opinas?\\\",\\\"submit_label\\\":\\\"Enviar\\\"}\"}},\"flow_metadata\":{\"flow_json_version\":700,\"data_api_protocol\":null,\"data_api_version\":null,\"flow_name\":\"In-App CSAT Survey No Agent v3 - es_LA_v1\",\"creation_source\":\"CSAT\",\"categories\":[]},\"icon\":\"REVIEW\",\"has_multiple_buttons\":false}"
        }
      ];

      const msg = generateWAMessageFromContent(from, {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: txt }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "✦ KFG Encuestas ✦" }),
          header: proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: buttons
          })
        })
      }, { userJid: sock.user?.id || sock.user?.jid, quoted: m });

      await sock.relayMessage(from, msg.message, { messageId: msg.key.id });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
    }
  }
}