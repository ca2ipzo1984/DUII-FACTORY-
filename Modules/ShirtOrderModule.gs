/**
 * 👕 ShirtOrderModule.gs - ระบบสั่งจองเสื้อกลุ่มฮันย่า
 */

const SHIRT_HOODIE_IMAGE_URL = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500';
const SHIRT_TSHIRT_IMAGE_URL = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500';

function handleShirtCommand(cleanMsg, replyToken, senderName, userId) {
  const content = cleanMsg.replace('/เสื้อ', '').trim();
  let toast = '';

  if (content.startsWith('จ่าย')) {
    const target = content.replace('จ่าย', '').trim();
    if (!target) {
      sendReplyMessages(replyToken, [{ type: 'text', text: 'ระบุชื่อหรือลำดับด้วย เช่น:\n/เสื้อ จ่าย 2 หรือ /เสื้อ จ่าย พีท' }]);
      return;
    }
    const success = updateShirtPaymentStatus(target, true);
    toast = success ? `✅ อัปเดตสถานะ "${target}" จ่ายเงินแล้ว!` : `❌ ไม่พบรายการ "${target}" ในระบบ`;
  } else if (content.startsWith('ยกเลิก') || content.startsWith('ลบ')) {
    const target = content.replace(/^(ยกเลิก|ลบ)/, '').trim();
    if (!target) {
      sendReplyMessages(replyToken, [{ type: 'text', text: 'ระบุชื่อหรือลำดับด้วย เช่น:\n/เสื้อ ยกเลิก 2' }]);
      return;
    }
    const success = removeShirtOrder(target);
    toast = success ? `🗑️ ลบรายการ "${target}" เรียบร้อยแล้ว!` : `❌ ไม่พบรายการ "${target}"`;
  } else if (content) {
    addSmartShirtOrderToSheet(content, senderName, userId);
    toast = '📝 บันทึกออเดอร์เสื้อเรียบร้อย!';
  }

  const replyMessages = [];
  if (toast) replyMessages.push({ type: 'text', text: toast });
  replyMessages.push(buildShirtFlexMessage());
  sendReplyMessages(replyToken, replyMessages);
}

function updateShirtPaymentStatus(target, isPaid) {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName('Shirt_Orders');
    if (!sheet || sheet.getLastRow() <= 1) return false;
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const targetNo = parseInt(target, 10);
    for (let i = 0; i < data.length; i++) {
      if ((!isNaN(targetNo) && data[i][0] === targetNo) || data[i][1].toString().trim().toLowerCase() === target.toLowerCase()) {
        sheet.getRange(i + 2, 4).setValue(isPaid ? 'จ่ายแล้ว ✅' : 'ยังไม่จ่าย ⏳');
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function removeShirtOrder(target) {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName('Shirt_Orders');
    if (!sheet || sheet.getLastRow() <= 1) return false;
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    const targetNo = parseInt(target, 10);
    for (let i = 0; i < data.length; i++) {
      if ((!isNaN(targetNo) && data[i][0] === targetNo) || data[i][1].toString().trim().toLowerCase() === target.toLowerCase()) {
        sheet.deleteRow(i + 2);
        const newLastRow = sheet.getLastRow();
        if (newLastRow > 1) {
          for (let r = 2; r <= newLastRow; r++) sheet.getRange(r, 1).setValue(r - 1);
        }
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function addSmartShirtOrderToSheet(orderText, senderName, userId) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Shirt_Orders') || ss.insertSheet('Shirt_Orders');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ลำดับ', 'ชื่อผู้สั่ง', 'รายการและไซส์', 'สถานะการจ่ายเงิน', 'ผู้บันทึก', 'User_ID', 'Timestamp']);
    sheet.setFrozenRows(1);
  }
  const isPaid = orderText.includes('จ่ายแล้ว') || orderText.includes('✅');
  const cleanDetail = orderText.replace(/จ่ายแล้ว/g, '').replace(/✅/g, '').trim();
  const parts = cleanDetail.split(/\s+/);
  const customerName = parts[0] || senderName;
  const shirtDetail = parts.slice(1).join(' ') || 'ยังไม่ระบุไซส์';
  const nextNo = sheet.getLastRow();
  sheet.appendRow([nextNo, customerName, shirtDetail, isPaid ? 'จ่ายแล้ว ✅' : 'ยังไม่จ่าย ⏳', senderName, userId, new Date()]);
}

function buildShirtFlexMessage() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName('Shirt_Orders');
  let orderBoxes = [];
  if (sheet && sheet.getLastRow() > 1) {
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    for (let i = 0; i < data.length; i++) {
      const isPaid = data[i][3].toString().includes('จ่ายแล้ว');
      orderBoxes.push({
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: `${data[i][0]}. ${data[i][1]}`, size: "xs", color: "#F3E8FF", weight: "bold", flex: 4 },
          { type: "text", text: data[i][2].toString(), size: "xxs", color: "#E0AAFF", flex: 4 },
          { type: "text", text: isPaid ? "จ่ายแล้ว ✅" : "ยังไม่จ่าย ⏳", size: "xxs", color: isPaid ? "#10B981" : "#EF4444", align: "end", flex: 3 }
        ]
      });
    }
  }
  if (orderBoxes.length === 0) {
    orderBoxes.push({ type: "text", text: "(ยังไม่มีรายชื่อผู้สั่งจอง)", size: "xs", color: "#C77DFF", align: "center" });
  }

  return {
    type: "flex",
    altText: "📣 ยอดจองเสื้อกลุ่มฮันย่า",
    contents: {
      type: "bubble",
      size: "giga",
      styles: { body: { backgroundColor: "#10002B" } },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        borderWidth: "2px",
        borderColor: "#9D4EDD",
        cornerRadius: "14px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#240046",
            cornerRadius: "10px",
            paddingAll: "8px",
            alignItems: "center",
            contents: [
              { type: "text", text: "📣 เปิดพรีออเดอร์ เสื้อกลุ่มฮันย่า ⚜️", weight: "bold", color: "#E0AAFF", size: "sm" }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#190033",
            cornerRadius: "8px",
            paddingAll: "10px",
            spacing: "sm",
            contents: [
              { type: "text", text: "⚜️ รายชื่อผู้สั่งซื้อ & สถานะ ⚜️", size: "xs", color: "#E0AAFF", weight: "bold" },
              { type: "separator", color: "#9D4EDD" },
              ...orderBoxes
            ]
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#3C096C",
            cornerRadius: "8px",
            paddingAll: "8px",
            alignItems: "center",
            contents: [
              { type: "text", text: "🟣 ธ.ไทยพาณิชย์: 738-266208-3 (พีรภัทร์ เพ็งสุวรรณ์)", size: "xxs", color: "#FFFFFF", weight: "bold" },
              { type: "text", text: "วิธีสั่ง: /เสื้อ (ชื่อ) (แบบ/ไซส์) | จ่าย: /เสื้อ จ่าย (ชื่อ/ลำดับ)", size: "xxs", color: "#E0AAFF", margin: "xs" }
            ]
          }
        ]
      }
    }
  };
}
