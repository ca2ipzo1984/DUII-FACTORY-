/**
 * ==============================================================================
 * SCRIPT NAME : ImageMultimodalModule.gs
 * VERSION     : v6.0.0-DIO-STANDARD
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO_STANDARD
 * DESCRIPTION : ระบบวิเคราะห์รูปภาพผ่าน Header x-goog-api-key (DIO STANDARD)
 * ==============================================================================
 */

const LINE_DATA_URL = 'https://api-data.line.me/v2/bot/message';

function handleImageMessage(event, replyToken, groupId, userId) {
  try {
    const messageId = event.message.id;
    const imgBytes = downloadLineImageBinary(messageId);
    if (!imgBytes) return;

    const base64Image = Utilities.base64Encode(imgBytes);
    const dynamicInstruction = typeof getDynamicSystemInstruction === 'function' ? getDynamicSystemInstruction() : 'คุณคือ AI ผู้ช่วย';
    const prompt = `${dynamicInstruction}\n\n[สถานะ: มีสมาชิกส่งภาพเข้ามา ให้วิเคราะห์ แซว หรือถ้าเป็นสลิปโอนเงินให้ตรวจเช็คยอดเงินและผู้รับโอน ตอบสั้นกระชับ]`;

    const payload = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 384 }
    };

    const replyText = callGeminiImageRawPayload(payload);
    if (replyText) {
      sendReplyMessages(replyToken, [{ type: 'text', text: replyText }]);
    }
  } catch (err) {
    console.error('handleImageMessage Error:', err);
  }
}

function downloadLineImageBinary(messageId) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    const res = UrlFetchApp.fetch(`${LINE_DATA_URL}/${messageId}/content`, {
      method: 'get',
      headers: { 'Authorization': `Bearer ${token}` },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) return res.getBlob().getBytes();
  } catch (e) {}
  return null;
}

function callGeminiImageRawPayload(payload) {
  const props = PropertiesService.getScriptProperties();
  const rawKeyList = props.getProperty('GEMINI_API_KEYS');
  const keys = rawKeyList
    ? rawKeyList.split(',').map(k => k.trim()).filter(Boolean)
    : [
        props.getProperty('GEMINI_API_KEY_1'),
        props.getProperty('GEMINI_API_KEY_2'),
        props.getProperty('GEMINI_API_KEY_3'),
        props.getProperty('GEMINI_API_KEY_4'),
        props.getProperty('GEMINI_API_KEY_5'),
        props.getProperty('GEMINI_API_KEY_6')
      ].filter(k => !!k);
  const models = ['gemini-3.8-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
    for (const key of keys) {
      try {
        const cleanKey = String(key).replace(/[\r\n\s]/g, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-goog-api-key': cleanKey },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        if (res.getResponseCode() === 200) {
          const json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates[0].content) {
            return json.candidates[0].content.parts.map(p => p.text).join(' ');
          }
        }
      } catch (e) {}
    }
  }
  return null;
}
