/**
 * 🌐 TranslationModule.gs - ระบบแปลภาษาอัตโนมัติ
 * ใช้ LanguageApp ของ Google Apps Script โดยตรง
 */

function isThaiText(text) {
  const cleaned = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!cleaned) return true;
  const thaiCharCount = (cleaned.match(/[\u0E00-\u0E7F]/g) || []).length;
  return (thaiCharCount / cleaned.length) >= 0.5;
}

function handleGroupTranslation(text, replyToken) {
  const cleanMsg = text.trim();

  // เงื่อนไข: ถ้ามีคำว่า /แปล ให้ตัดคำว่า /แปล ออก แล้วแปลประโยคที่เหลือเป็นภาษาอังกฤษ
  if (cleanMsg.includes('/แปล')) {
    const textToTranslate = cleanMsg.replace(/\/แปล/g, '').trim();
    if (!textToTranslate) return false;
    try {
      const translatedEn = LanguageApp.translate(textToTranslate, 'th', 'en');
      sendReplyMessages(replyToken, [{ type: 'text', text: translatedEn }]);
      return true;
    } catch (e) {
      console.error('Translation error (/แปล):', e);
      return false;
    }
  }

  // เงื่อนไข: ถ้าเป็นภาษาอื่นที่ไม่ใช่ภาษาไทย ให้แปลเป็นไทยทันที
  if (!isThaiText(cleanMsg)) {
    try {
      const translatedTh = LanguageApp.translate(cleanMsg, '', 'th');
      if (translatedTh && translatedTh.trim() !== cleanMsg) {
        sendReplyMessages(replyToken, [{ type: 'text', text: translatedTh }]);
        return true;
      }
    } catch (e) {
      console.error('Auto translation error:', e);
      return false;
    }
  }

  return false;
}
