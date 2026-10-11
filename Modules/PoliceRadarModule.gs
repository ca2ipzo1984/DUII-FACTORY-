/**
 * 🚨 PoliceRadarModule.gs - ระบบเรดาร์ด่านตรวจ Traffic D PRO
 */

function handleMacroDroidAlert(data) {
  try {
    const message = data.text || data.message || JSON.stringify(data);
    const timestamp = new Date();
    const targetId = PropertiesService.getScriptProperties().getProperty('POLICE_CHECK_ID') || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(targetId);
    let sheet = ss.getSheetByName('Traffic_Alerts') || ss.getActiveSheet();
    sheet.appendRow([timestamp, message]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", saved: message })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleCheckPoliceFromSheet(replyToken) {
  try {
    const targetId = PropertiesService.getScriptProperties().getProperty('POLICE_CHECK_ID') || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(targetId);
    const sheet = ss.getSheetByName('Traffic_Alerts') || ss.getActiveSheet();
    const lastRow = sheet.getLastRow();
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));

    if (lastRow <= 1) {
      sendCleanRoadMessage(replyToken, now);
      return;
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    let validAlerts = [];

    for (let i = 0; i < rows.length; i++) {
      const timeVal = rows[i][0];
      const alertText = (rows[i][1] || '').toString().trim();
      if (!alertText) continue;

      let alertDate = timeVal instanceof Date ? timeVal : new Date(timeVal);
      if (alertDate && !isNaN(alertDate.getTime()) && alertDate >= twoHoursAgo && alertDate <= now) {
        validAlerts.push({ date: alertDate, text: alertText });
      }
    }

    if (validAlerts.length === 0) {
      sendCleanRoadMessage(replyToken, now);
      return;
    }

    validAlerts.sort((a, b) => b.date.getTime() - a.date.getTime());

    let alertBoxes = [];
    for (const a of validAlerts) {
      const timeStr = Utilities.formatDate(a.date, "Asia/Bangkok", "HH:mm น.");
      alertBoxes.push({
        type: "box",
        layout: "vertical",
        backgroundColor: "#FFF1C5",
        cornerRadius: "8px",
        borderWidth: "1px",
        borderColor: "#E5383B",
        paddingAll: "9px",
        spacing: "xs",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🚨 จุดตรวจด่าน", size: "xxs", color: "#9B0000", weight: "bold", flex: 6 },
              { type: "text", text: `⏰ ${timeStr}`, size: "xxs", color: "#BA181B", align: "end", flex: 4 }
            ]
          },
          { type: "text", text: a.text, size: "xs", color: "#660708", weight: "bold", wrap: true }
        ]
      });
      alertBoxes.push({ type: "separator", color: "#FFD166" });
    }

    const flexJson = {
      type: "bubble",
      size: "giga",
      styles: { body: { backgroundColor: "#FFF9E6" } },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        borderWidth: "3px",
        borderColor: "#D90429",
        cornerRadius: "14px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFE3E0",
            borderWidth: "1.5px",
            borderColor: "#D90429",
            cornerRadius: "10px",
            paddingAll: "8px",
            alignItems: "center",
            contents: [
              { type: "text", text: "🚨 รายงานด่านตรวจ (ย้อนหลัง 2 ชม.) ⚠️", weight: "bold", color: "#D90429", size: "sm" },
              { type: "text", text: `พบการแจ้งเตือนทั้งหมด ${validAlerts.length} จุดสด`, size: "xxs", color: "#A4161A", margin: "xs" }
            ]
          },
          ...alertBoxes,
          {
            type: "box",
            layout: "horizontal",
            paddingTop: "4px",
            contents: [{
              type: "text",
              text: `เรดาร์สแกนอัตโนมัติ • ตรวจสอบเมื่อ ${Utilities.formatDate(now, "Asia/Bangkok", "HH:mm น.")}`,
              size: "xxs",
              color: "#800F2F",
              align: "center",
              flex: 1
            }]
          }
        ]
      }
    };

    sendReplyMessages(replyToken, [{ type: "flex", altText: `🚨 พบ ${validAlerts.length} จุดด่านตรวจ`, contents: flexJson }]);
  } catch (err) {
    sendReplyMessages(replyToken, [{ type: 'text', text: '⚠️ ไม่สามารถเปิดดูข้อมูลด่านได้ในขณะนี้ลูกพี่' }]);
  }
}

function sendCleanRoadMessage(replyToken, now) {
  const cleanFlex = {
    type: "bubble",
    size: "kilo",
    styles: { body: { backgroundColor: "#FFFDEB" } },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      borderWidth: "2px",
      borderColor: "#FFB703",
      cornerRadius: "14px",
      spacing: "md",
      contents: [
        { type: "text", text: "🟢 เรดาร์: ถนนโล่ง ปลอดภัย!", weight: "bold", color: "#2D6A4F", size: "sm" },
        { type: "separator", color: "#FFD166" },
        { type: "text", text: "ย้อนหลัง 2 ชม. ที่ผ่านมา ไม่พบรายงานด่านตรวจเลย ขับขี่ปลอดภัย!", size: "xs", color: "#474300", wrap: true },
        { type: "text", text: "⏰ ตรวจสอบเมื่อ: " + Utilities.formatDate(now, "Asia/Bangkok", "HH:mm น."), size: "xxs", color: "#857A00", align: "end" }
      ]
    }
  };
  sendReplyMessages(replyToken, [{ type: "flex", altText: "🟢 ไม่พบรายงานด่านย้อนหลัง 2 ชม.", contents: cleanFlex }]);
}
