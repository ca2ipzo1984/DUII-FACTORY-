/**
 * 💬 SocialRadarModule.gs - ระบบดักจับแจ้งเตือนแอปโซเชียลลงชีตและเรียกดู (/chat, /แชท)
 * บันทึกลงชีตหลัก (CONFIG.SPREADSHEET_ID) แท็บ "Social_Alerts"
 * กรองย้อนหลัง 2 ชม. + Flex Message โทนฟ้า-น้ำเงิน (#00B4D8 / #03045E)
 * @version 1.0.0-SOCIAL-RADAR
 */

// ============================================================================
// 1. MACRODROID SOCIAL ALERT RECEIVER (บันทึกลงแท็บ Social_Alerts)
// ============================================================================
function handleMacroDroidSocialAlert(data) {
  try {
    const message = data.text || data.message || JSON.stringify(data);
    const appName = data.appName || data.source || "Social App";
    const timestamp = new Date();
    const formattedTime = Utilities.formatDate(timestamp, "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

    const targetId = (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) ? 
                     CONFIG.SPREADSHEET_ID : 
                     PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

    const ss = SpreadsheetApp.openById(targetId);
    let sheet = ss.getSheetByName('Social_Alerts');
    if (!sheet) {
      sheet = ss.insertSheet('Social_Alerts');
      sheet.appendRow(['Timestamp', 'App_Name', 'Alert_Message']);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([formattedTime, appName, message]);

    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "saved": message })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('handleMacroDroidSocialAlert Error:', error);
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2. SOCIAL CHECK ENGINE (ดึงย้อนหลัง 2 ชม. Flex ฟ้า-น้ำเงิน เมื่อพิมพ์ /chat หรือ /แชท)
// ============================================================================
function handleCheckSocialFromSheet(replyToken) {
  try {
    const targetId = (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) ? 
                     CONFIG.SPREADSHEET_ID : 
                     PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

    const ss = SpreadsheetApp.openById(targetId);
    const sheet = ss.getSheetByName('Social_Alerts');
    
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));

    // กรณีแท็บยังไม่เคยถูกสร้าง หรือชีตว่าง
    if (!sheet || sheet.getLastRow() <= 1) {
      sendCleanSocialMessage(replyToken, now);
      return;
    }

    const lastRow = sheet.getLastRow();
    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    let validAlerts = [];

    for (let i = 0; i < rows.length; i++) {
      const timeVal = rows[i][0];
      const appName = (rows[i][1] || 'โซเชียล').toString().trim();
      const alertText = (rows[i][2] || '').toString().trim();

      if (!alertText) continue;

      let alertDate = null;
      if (timeVal instanceof Date) {
        alertDate = timeVal;
      } else if (typeof timeVal === 'string' && timeVal.trim() !== '') {
        const normalized = timeVal.replace(/-/g, '/');
        const parsed = new Date(normalized);
        if (!isNaN(parsed.getTime())) {
          alertDate = parsed;
        }
      }

      // กรองเฉพาะรายการที่อยู่ในช่วง 2 ชม. ย้อนหลัง
      if (alertDate && !isNaN(alertDate.getTime())) {
        if (alertDate >= twoHoursAgo && alertDate <= now) {
          validAlerts.push({
            date: alertDate,
            appName: appName,
            text: alertText
          });
        }
      } else {
        // Fallback: หากแถวท้ายๆ แปลงเวลาติดขัด แต่มาร์กไว้เป็นข้อมูลสดใหม่ ให้ดึงมาแสดงผล
        if (i >= rows.length - 3) {
          validAlerts.push({
            date: now,
            appName: appName,
            text: alertText
          });
        }
      }
    }

    // ถ้าไม่มีแจ้งเตือนใหม่เลยในช่วง 2 ชม.
    if (validAlerts.length === 0) {
      sendCleanSocialMessage(replyToken, now);
      return;
    }

    // เรียงจากใหม่สุดไปหาเก่าสุด
    validAlerts.sort((a, b) => b.date.getTime() - a.date.getTime());

    // สร้างกล่องรายการแชท (การ์ดย่อยสีฟ้าอ่อน ขอบน้ำเงิน)
    let alertBoxes = [];
    for (const a of validAlerts) {
      const timeStr = Utilities.formatDate(a.date, "Asia/Bangkok", "HH:mm น.");
      alertBoxes.push({
        type: "box",
        layout: "vertical",
        backgroundColor: "#E0F2FE",
        cornerRadius: "8px",
        borderWidth: "1px",
        borderColor: "#0284C7",
        paddingAll: "9px",
        spacing: "xs",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: `💬 ${a.appName}`, size: "xxs", color: "#0369A1", weight: "bold", flex: 6 },
              { type: "text", text: `⏰ ${timeStr}`, size: "xxs", color: "#0284C7", align: "end", flex: 4 }
            ]
          },
          { 
            type: "text", 
            text: a.text, 
            size: "xs", 
            color: "#0F172A", 
            weight: "bold", 
            wrap: true 
          }
        ]
      });
      alertBoxes.push({ type: "separator", color: "#BAE6FD" });
    }

    // การ์ด Flex Message หลัก (Theme: พื้นฟ้าสว่างนวล #F0F9FF ขอบน้ำเงินเข้ม #0284C7)
    const flexJson = {
      type: "bubble",
      size: "giga",
      styles: { 
        body: { backgroundColor: "#F0F9FF" } 
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        borderWidth: "3px",
        borderColor: "#0284C7",
        cornerRadius: "14px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#BAE6FD",
            borderWidth: "1.5px",
            borderColor: "#0284C7",
            cornerRadius: "10px",
            paddingAll: "8px",
            alignItems: "center",
            contents: [
              { 
                type: "text", 
                text: "💬 รายงานข้อความโซเชียล (ย้อนหลัง 2 ชม.) 📱", 
                weight: "bold", 
                color: "#0369A1", 
                size: "sm" 
              },
              { 
                type: "text", 
                text: `พบการแจ้งเตือนทั้งหมด ${validAlerts.length} ข้อความ`, 
                size: "xxs", 
                color: "#075985", 
                margin: "xs" 
              }
            ]
          },
          ...alertBoxes,
          {
            type: "box",
            layout: "horizontal",
            paddingTop: "4px",
            contents: [
              {
                type: "text",
                text: `เรดาร์สแกนโซเชียล • ตรวจสอบเมื่อ ${Utilities.formatDate(now, "Asia/Bangkok", "HH:mm น.")}`,
                size: "xxs",
                color: "#0369A1",
                align: "center",
                flex: 1
              }
            ]
          }
        ]
      }
    };

    sendReplyMessages(replyToken, [{
      type: "flex",
      altText: `💬 พบ ${validAlerts.length} รายงานแจ้งเตือนโซเชียลล่าสุด`,
      contents: flexJson
    }]);

  } catch (err) {
    console.error("handleCheckSocialFromSheet Error:", err);
    sendReplyMessages(replyToken, [{ type: 'text', text: '⚠️ ไม่สามารถเปิดดูข้อมูลแชทได้ในขณะนี้ลูกพี่' }]);
  }
}

// ============================================================================
// 3. CLEAN SOCIAL NOTIFICATION (กรณีไม่มีแจ้งเตือนใน 2 ชม.)
// ============================================================================
function sendCleanSocialMessage(replyToken, now) {
  const cleanFlex = {
    type: "bubble",
    size: "kilo",
    styles: { body: { backgroundColor: "#F0F9FF" } },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      borderWidth: "2px",
      borderColor: "#38BDF8",
      cornerRadius: "14px",
      spacing: "md",
      contents: [
        { type: "text", text: "🔵 เรดาร์บักจ่อย: ไม่มีแจ้งเตือนโซเชียล!", weight: "bold", color: "#0369A1", size: "sm" },
        { type: "separator", color: "#BAE6FD" },
        { type: "text", text: "ย้อนหลัง 2 ชม. ที่ผ่านมา เงียบกริบ ไม่มีแจ้งเตือนข้อความใหม่เข้ามาเลยแว้น!", size: "xs", color: "#0C4A6E", wrap: true },
        { type: "text", text: "⏰ ตรวจสอบเมื่อ: " + Utilities.formatDate(now, "Asia/Bangkok", "HH:mm น."), size: "xxs", color: "#0284C7", align: "end" }
      ]
    }
  };
  sendReplyMessages(replyToken, [{ type: "flex", altText: "🔵 ไม่พบแจ้งเตือนแชทย้อนหลัง 2 ชม.", contents: cleanFlex }]);
}

// ============================================================================
// 4. TEST RUNNER (ฟังก์ชันทดสอบใน GAS)
// ============================================================================
function testSocialWebhookInGAS() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        type: "social",
        appName: "Facebook Messenger",
        text: "ทักครับ วันนี้มีวิ่งทริปกันที่ไหนไหม?"
      })
    }
  };
  console.log("⏳ กำลังเริ่มทดสอบรับข้อมูลแจ้งเตือนโซเชียล...");
  const result = doPost(fakeEvent);
  console.log("ผลลัพธ์การทำงาน: " + result.getContent());
}
