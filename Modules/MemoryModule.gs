/**
 * 🧠 MemoryModule.gs - ระบบความจำ 2 ชั้น
 */

function handleMemoryCommand(cleanMsg, replyToken, userId) {
  if (cleanMsg.startsWith('/จารึก')) {
    const content = cleanMsg.replace('/จารึก', '').trim();
    if (!content) {
      sendReplyMessages(replyToken, [{ type: 'text', text: 'กรุณาระบุข้อความ เช่น:\n/จารึก ห้ามคุยเรื่องการเมือง' }]);
      return;
    }
    saveDualMemoryToSheet('CORE_DIRECTIVE', content, userId);
    sendReplyMessages(replyToken, [{ type: 'text', text: `📜 [จารึกสำเร็จ] บันทึกกฎตัวตนถาวร:\n"${content}"` }]);
  } else if (cleanMsg.startsWith('/จำ')) {
    const content = cleanMsg.replace('/จำ', '').trim();
    if (!content) {
      sendReplyMessages(replyToken, [{ type: 'text', text: 'กรุณาระบุข้อความ เช่น:\n/จำ พีทชอบดื่มชาเขียว' }]);
      return;
    }
    saveDualMemoryToSheet('EXTERNAL_MEMORY', content, userId);
    sendReplyMessages(replyToken, [{ type: 'text', text: `📝 [จำสำเร็จ] บันทึกความจำเรียบร้อย:\n"${content}"` }]);
  }
}

function saveDualMemoryToSheet(category, content, authorId) {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    let sheet = ss.getSheetByName('Memory_Store') || ss.insertSheet('Memory_Store');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Category', 'Content', 'Author_User_ID']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([new Date(), category, content, authorId || 'SYSTEM']);
  } catch (err) {
    console.error('saveDualMemoryToSheet Error:', err);
  }
}

function getDynamicSystemInstruction() {
  let base = PropertiesService.getScriptProperties().getProperty('SYSTEM_INSTRUCTION') || 'คุณคือผู้ช่วย AI อัจฉริยะ';
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName('Memory_Store');
    if (!sheet || sheet.getLastRow() <= 1) return base;

    const rows = sheet.getRange(2, 2, sheet.getLastRow() - 1, 2).getValues();
    let directives = [];
    let facts = [];
    for (const r of rows) {
      if (r[0] === 'CORE_DIRECTIVE') directives.push(r[1]);
      if (r[0] === 'EXTERNAL_MEMORY') facts.push(r[1]);
    }
    if (directives.length > 0) base += '\n\n[กฎเหล็กและข้อห้าม]:\n- ' + directives.join('\n- ');
    if (facts.length > 0) base += '\n\n[ความรู้และข้อมูลที่ต้องจำ]:\n- ' + facts.slice(-10).join('\n- ');
  } catch (e) {}
  return base;
}
