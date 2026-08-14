import {
    generateWAMessageContent,
    generateWAMessageFromContent,
    jidNormalizedUser,
    downloadMediaMessage
} from "@whiskeysockets/baileys";

const sendGroupStatus = async (sock, jid, options = {}) => {
    const {
        text,
        media,
        type = "text",
        caption = "",
        mimetype,
        fileName,
        ptt = false,
        textArgb = 4292401368,
        backgroundArgb = 4283453520,
        font = 5,
        audienceType = 2,
        listName = "Mejores Amigos",
        listEmoji = "⭐",
    } = options;

    if (!sock?.relayMessage) throw new Error("Socket no disponible");
    if (!jid) throw new Error("JID de grupo no recibido");

    const contextInfo = {
        statusSourceType: 0,
        statusAttributions: [{ AttributionData: null, type: 10 }],
        isGroupStatus: true,
        statusAudienceMetadata: { audienceType, listName, listEmoji },
    };

    let innerMessage;

    if (type === "text") {
        if (!text) throw new Error("No text");
        innerMessage = {
            extendedTextMessage: {
                text,
                textArgb,
                backgroundArgb,
                font,
                previewType: 0,
                contextInfo,
            },
        };
    } else {
        if (!sock?.waUploadToServer) throw new Error("No upload");
        if (!media) throw new Error("No media");

        const mediaContent = {
            [type]: typeof media === "string"? { url: media } : media,
        };

        if (caption && ["image", "video"].includes(type)) mediaContent.caption = caption;
        if (mimetype) mediaContent.mimetype = mimetype;
        if (fileName && type === "document") mediaContent.fileName = fileName;
        if (type === "audio") mediaContent.ptt = ptt;

        const content = await generateWAMessageContent(mediaContent, {
            upload: sock.waUploadToServer,
        });

        const messageKey = `${type}Message`;
        if (!content?.[messageKey]) throw new Error(`No se pudo generar ${type}`);

        content[messageKey].contextInfo = contextInfo;
        innerMessage = { [messageKey]: content[messageKey] };
    }

    const senderJid = sock.user?.id? jidNormalizedUser(sock.user.id) : undefined;

    const message = generateWAMessageFromContent(
        jid,
        { groupStatusMessageV2: { message: innerMessage } },
        { userJid: senderJid }
    );

    await sock.relayMessage(jid, message.message, { messageId: message.key.id });
    return message;
};

export default {
    name: '-',
    alias: ['-',],
    description: 'Publica un estado exclusivo para el grupo actual',
    category: 'grupo',

    execute: async (sock, msg) => {
        const from = msg.key.remoteJid
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        const inputContent = text.split(' ').slice(1).join(' ')

        if (!from.endsWith("@g.us")) {
            try { await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }) } catch {}
            return
        }

        try { await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }) } catch {}

        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

        try {
            if (quotedMsg) {
                const type = Object.keys(quotedMsg)[0];
                const mediaType = type.replace("Message", "").toLowerCase();

                if (["image", "video", "audio", "document"].includes(mediaType)) {
                    const quotedMsgObj = {
                        key: {
                            remoteJid: from,
                            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                            participant: msg.message.extendedTextMessage.contextInfo.participant,
                            fromMe: false
                        },
                        message: quotedMsg
                    }

                    const buffer = await downloadMediaMessage(quotedMsgObj, "buffer", {}, {
                        logger: console,
                        reuploadRequest: sock.updateMediaMessage
                    });

                    await sendGroupStatus(sock, from, {
                        type: mediaType,
                        media: buffer,
                        caption: inputContent || quotedMsg[type]?.caption || "",
                        mimetype: quotedMsg[type]?.mimetype,
                        fileName: quotedMsg[type]?.fileName,
                    });
                } else {
                    const statusText = inputContent || quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
                    if (!statusText) throw new Error("No text");

                    await sendGroupStatus(sock, from, { type: "text", text: statusText });
                }
            } else {
                if (!inputContent) {
                    try { await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }) } catch {}
                    return
                }
                await sendGroupStatus(sock, from, { type: "text", text: inputContent });
            }

            try { await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }) } catch {}

        } catch (e) {
            console.error('Error en estadogrupo:', e)
            try { await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }) } catch {}
        }
    }
};