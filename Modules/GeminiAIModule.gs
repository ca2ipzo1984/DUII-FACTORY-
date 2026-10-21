/**
 * ==============================================================================
 * SCRIPT NAME : GeminiAIModule.gs
 * VERSION     : v6.0.0-DIO-STANDARD
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO_STANDARD
 * DESCRIPTION : โมดูลเชื่อมต่อ AI Gemini API ผ่าน Header x-goog-api-key (DIO STANDARD)
 * ==============================================================================
 */

const CACHE_TTL_SECONDS = 21600;

function handleAIConversation(userMessage, replyToken, senderName, userId, isGroupChat, isMentioned, isReply) {
  let promptContext = '';
  if (!isGroupChat) {
    promptContext = `[สถานะ: สนทนา 1:1 กับคุณ "${senderName}"]\n[ข้อบังคับภาษา: ให้ตอบกลับด้วยภาษาเดียวกับคู่สนทนาเสมอ เช่น ภาษาไทยตอบภาษาไทย, English respond in English]\nข้อความ: ${userMessage}`;
  } else {
    if (isMentioned || isReply) {
      promptContext = `[สถานะ: ข้อความนี้ส่งจากคุณ "${senderName}" มีการ @ หรือ Reply บอทโดยตรง]\nข้อความ: ${userMessage}`;
    } else {
      promptContext = `[สถานะ: ข้อความในกลุ่มไลน์ ไม่มีการ @ หรือ Reply หากไม่จำเป็นให้ตอบคำว่า "NO_REPLY"]\nผู้ส่ง: "${senderName}"\nข้อความ: ${userMessage}`;
    }
  }

  const session = getSessionState(userId);
  addMessageToHistory(session, 'user', userMessage);
  const geminiReply = callGeminiWithFallback(session, promptContext);

  if (geminiReply && geminiReply.trim() !== 'NO_REPLY') {
    addMessageToHistory(session, 'model', geminiReply);
    sendReplyMessages(replyToken, [{ type: 'text', text: geminiReply.trim() }]);
    saveSessionState(userId, session);
  }
}

function callGeminiWithFallback(session, userPrompt) {
  const props = PropertiesService.getScriptProperties();
  const models = ['gemini-3.8-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
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
  const dynamicInstruction = typeof getDynamicSystemInstruction === 'function' ? getDynamicSystemInstruction() : 'คุณคือ AI ผู้ช่วย';

  for (const model of models) {
    for (const key of keys) {
      try {
        const cleanKey = String(key).replace(/[\r\n\s]/g, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const contents = session.history.slice(-6).map(h => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }]
        }));
        contents.push({ role: 'user', parts: [{ text: `${dynamicInstruction}\n\n${userPrompt}` }] });

        const res = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-goog-api-key': cleanKey },
          payload: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 500 } }),
          muteHttpExceptions: true
        });

        if (res.getResponseCode() === 200) {
          const json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates[0].content) {
            return json.candidates[0].content.parts.map(p => p.text).join('');
          }
        }
      } catch (e) {}
    }
  }
  return "ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งครับ";
}

function getSessionState(userId) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(`session_${userId}`);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  return { history: [] };
}

function saveSessionState(userId, session) {
  CacheService.getScriptCache().put(`session_${userId}`, JSON.stringify(session), CACHE_TTL_SECONDS);
}

function addMessageToHistory(session, role, text) {
  session.history.push({ role, text });
  if (session.history.length > 8) session.history.shift();
}
