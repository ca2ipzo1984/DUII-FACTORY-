/**
 * 🏍️ EventTripModule.gs - ระบบบริหารกิจกรรมและทริป
 */

function handleEventUnifiedCommand(cleanMsg, replyToken, senderName, userId) {
  const lines = cleanMsg.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let eventId = '1';

  // 1. รองรับการส่งคำสั่งเพิ่ม/ลบหลายบรรทัดพร้อมกัน
  if (lines.length > 1 && lines.every(l => l.startsWith('/'))) {
    let processedCount = 0;
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      eventId = cmd.replace(/^\/e/, '') || '1';
      const subContent = line.substring(parts[0].length).trim();
      if (subContent.startsWith('+')) {
        addParticipantToEvent(eventId, subContent.substring(1).trim(), senderName, userId);
        processedCount++;
      } else if (subContent.startsWith('-')) {
        removeParticipantFromEvent(eventId, subContent.substring(1).trim());
        processedCount++;
      }
    }
    const replyMessages = [{ type: 'text', text: `⚡ บันทึกสำเร็จรวดเดียว ${processedCount} รายการ!` }, buildEventFlexMessage(eventId)];
    const extractedLink = extractAllUniversalLinks(getEventInfo(eventId).details);
    if (extractedLink) replyMessages.push({ type: 'text', text: `📍 ลิงก์พิกัด/ข้อมูลที่เกี่ยวข้อง:\n${extractedLink}` });
    sendReplyMessages(replyToken, replyMessages);
    return;
  }

  // 2. คำสั่งบรรทัดเดียว
  const firstLine = lines[0];
  const parts = firstLine.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  if (cmd.startsWith('/e') && cmd !== '/event' && cmd !== '/events') {
    eventId = cmd.replace(/^\/e/, '') || '1';
  }
  const content = cleanMsg.substring(parts[0].length).trim();

  // ดูรายการสรุปภาพรวม (/event หรือ /e เปล่าๆ)
  if (cmd === '/event' || cmd === '/events' || (cmd === '/e' && !content)) {
    handleAllEventsSummary(replyToken);
    return;
  }

  // เรียกดูเฉพาะการ์ดทริป (/e1)
  if (!content) {
    const replyMessages = [buildEventFlexMessage(eventId)];
    const links = extractAllUniversalLinks(getEventInfo(eventId).details);
    if (links) replyMessages.push({ type: 'text', text: `📍 ลิงก์พิกัด/ข้อมูลที่เกี่ยวข้อง:\n${links}` });
    sendReplyMessages(replyToken, replyMessages);
    return;
  }

  // ลงชื่อ (+ชื่อ รถ)
  if (content.startsWith('+')) {
    addParticipantToEvent(eventId, content.substring(1).trim(), senderName, userId);
    const replyMessages = [{ type: 'text', text: `🛵 ลงชื่อร่วมทริป #${eventId} เรียบร้อย!` }, buildEventFlexMessage(eventId)];
    const links = extractAllUniversalLinks(getEventInfo(eventId).details);
    if (links) replyMessages.push({ type: 'text', text: `📍 ลิงก์พิกัด/ข้อมูลที่เกี่ยวข้อง:\n${links}` });
    sendReplyMessages(replyToken, replyMessages);
    return;
  }

  // ลบชื่อ (-ชื่อ)
  if (content.startsWith('-')) {
    removeParticipantFromEvent(eventId, content.substring(1).trim());
    const replyMessages = [{ type: 'text', text: `🗑️ ลบรายชื่อออกจากทริป #${eventId} เรียบร้อย!` }, buildEventFlexMessage(eventId)];
    const links = extractAllUniversalLinks(getEventInfo(eventId).details);
    if (links) replyMessages.push({ type: 'text', text: `📍 ลิงก์พิกัด/ข้อมูลที่เกี่ยวข้อง:\n${links}` });
    sendReplyMessages(replyToken, replyMessages);
    return;
  }

  // สร้างหรืออัปเดตรายละเอียดทริปใหม่
  createNewOrUpdateEvent(eventId, content, senderName, userId);
  const replyMessages = [{ type: 'text', text: `✨ สร้าง/อัปเดตรายละเอียดทริป #${eventId} เรียบร้อย!` }, buildEventFlexMessage(eventId)];
  const extractedLink = extractAllUniversalLinks(content);
  if (extractedLink) replyMessages.push({ type: 'text', text: `📍 ลิงก์พิกัดที่พบ:\n${extractedLink}` });
  sendReplyMessages(replyToken, replyMessages);
}

function extractAllUniversalLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)].join('\n') : null;
}

function getEventInfo(eventId) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Events');
  if (!sheet) return { title: `ทริป #${eventId}`, details: 'ยังไม่มีรายละเอียด', participants: [] };

  const data = sheet.getDataRange().getValues();
  let title = `ทริป #${eventId}`;
  let details = 'ยังไม่มีรายละเอียด';
  let participants = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === eventId.toString()) {
      title = data[i][1] || title;
      details = data[i][2] || details;
      if (data[i][3]) participants.push({ name: data[i][3], vehicle: data[i][4] || '' });
    }
  }
  return { title, details, participants };
}

function createNewOrUpdateEvent(eventId, content, senderName, userId) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Events') || ss.insertSheet('Events');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['EventID', 'Title', 'Details', 'Participant', 'Vehicle', 'CreatedBy', 'Timestamp']);
    sheet.setFrozenRows(1);
  }
  const lines = content.split('\n');
  const title = lines[0];
  const details = lines.slice(1).join('\n') || content;
  sheet.appendRow([eventId, title, details, '', '', senderName, new Date()]);
}

function addParticipantToEvent(eventId, participantText, senderName, userId) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Events');
  if (!sheet) return;
  const parts = participantText.split(/\s+/);
  const pName = parts[0];
  const vehicle = parts.slice(1).join(' ') || '-';
  const info = getEventInfo(eventId);
  sheet.appendRow([eventId, info.title, info.details, pName, vehicle, senderName, new Date()]);
}

function removeParticipantFromEvent(eventId, target) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() <= 1) return;
  const data = sheet.getDataRange().getValues();
  const targetIndex = parseInt(target, 10);
  let pCount = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === eventId.toString() && data[i][3]) {
      pCount++;
      if (pCount === targetIndex || data[i][3].toString().toLowerCase() === target.toLowerCase()) {
        sheet.deleteRow(i + 1);
        return;
      }
    }
  }
}

function handleAllEventsSummary(replyToken) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Events');
  if (!sheet || sheet.getLastRow() <= 1) {
    sendReplyMessages(replyToken, [{ type: 'text', text: 'ℹ️ ขณะนี้ยังไม่มีกิจกรรมทริปในระบบ พิมพ์ /e1 [รายละเอียด] เพื่อสร้างได้เลยครับ' }]);
    return;
  }
  const data = sheet.getDataRange().getValues();
  let eventMap = {};
  for (let i = 1; i < data.length; i++) {
    const id = data[i][0].toString();
    if (!eventMap[id]) eventMap[id] = { title: data[i][1], count: 0 };
    if (data[i][3]) eventMap[id].count++;
  }
  const eventIds = Object.keys(eventMap);
  if (eventIds.length === 1) {
    const replyMessages = [buildEventFlexMessage(eventIds[0])];
    const links = extractAllUniversalLinks(getEventInfo(eventIds[0]).details);
    if (links) replyMessages.push({ type: 'text', text: `📍 ลิงก์พิกัด/ข้อมูลที่เกี่ยวข้อง:\n${links}` });
    sendReplyMessages(replyToken, replyMessages);
    return;
  }
  let summaryText = '📋 สรุปรายการทริปทั้งหมด:\n';
  for (const id of eventIds) {
    summaryText += `🔹 ทริป #${id}: ${eventMap[id].title} (${eventMap[id].count} คัน) -> ดูข้อมูล: /e${id}\n`;
  }
  sendReplyMessages(replyToken, [{ type: 'text', text: summaryText.trim() }]);
}

function buildEventFlexMessage(eventId) {
  const info = getEventInfo(eventId);
  let participantBoxes = [];
  info.participants.forEach((p, idx) => {
    participantBoxes.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: `${idx + 1}. ${p.name}`, size: "xs", color: "#FFFFFF", weight: "bold", flex: 6 },
        { type: "text", text: p.vehicle, size: "xxs", color: "#38BDF8", align: "end", flex: 4 }
      ]
    });
  });

  if (participantBoxes.length === 0) {
    participantBoxes.push({ type: "text", text: "(ยังไม่มีผู้ลงชื่อร่วมขบวน)", size: "xs", color: "#94A3B8", align: "center" });
  }

  return {
    type: "flex",
    altText: `🏍️ รายละเอียดกิจกรรม: ${info.title}`,
    contents: {
      type: "bubble",
      size: "giga",
      styles: { body: { backgroundColor: "#0F172A" } },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        borderWidth: "2px",
        borderColor: "#0284C7",
        cornerRadius: "14px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0369A1",
            paddingAll: "8px",
            cornerRadius: "8px",
            alignItems: "center",
            contents: [
              { type: "text", text: info.title, weight: "bold", color: "#FFFFFF", size: "sm", wrap: true, align: "center" },
              { type: "text", text: `[ทริป #${eventId}] ผู้ร่วมขบวน ${info.participants.length} คัน`, size: "xxs", color: "#BAE6FD", margin: "xs" }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#1E293B",
            paddingAll: "10px",
            cornerRadius: "8px",
            contents: [
              { type: "text", text: "📌 กำหนดการและรายละเอียด:", size: "xxs", color: "#38BDF8", weight: "bold" },
              { type: "text", text: info.details, size: "xs", color: "#F8FAFC", wrap: true, margin: "xs" }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#1E293B",
            paddingAll: "10px",
            cornerRadius: "8px",
            spacing: "sm",
            contents: [
              { type: "text", text: `🛵 รายชื่อร่วมขบวน (${info.participants.length} คัน)`, size: "xs", color: "#38BDF8", weight: "bold" },
              { type: "separator", color: "#0284C7" },
              ...participantBoxes
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#0369A1",
            paddingAll: "6px",
            cornerRadius: "6px",
            alignItems: "center",
            contents: [
              { type: "text", text: `ลงชื่อ: /e${eventId} +(ชื่อ) (รถ) | ลบ: /e${eventId} -(ชื่อ)`, size: "xxs", color: "#FFFFFF" }
            ]
          }
        ]
      }
    }
  };
}
