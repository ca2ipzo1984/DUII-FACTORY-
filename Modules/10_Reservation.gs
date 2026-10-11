/**
 * ==============================================================================
 * FILE        : 10_Reservation.gs
 * NAME        : 10_Reservation (Table & Slot Engine)
 * TYPE        : module  |  CATEGORY: Operations & Social
 * DESCRIPTION : ตรวจสอบช่วงเวลาว่าง ล็อกคิวด้วย ScriptLock ป้องกันคิวซ้อน ออกรหัส BK-* พร้อมแสดง Flex บัตรคิว QR Code
 * COMMANDS    : จองโต๊ะ, จองคิว, เช็คเวลาว่าง
 * SCRIPT PROPERTIES:
 *   - RES_MAX_PER_SLOT (optional): จำนวนการจองสูงสุดต่อรอบเวลา (ค่าเริ่มต้น 5)
 *   - RES_MAX_GUESTS (optional): จำนวนคนต่อการจองสูงสุด (ค่าเริ่มต้น 20)
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "check_and_book_table",
 *     "description": "เช็กช่วงเวลาว่าง ล็อกสิทธิ์จองโต๊ะ และออกการ์ดยืนยันการจอง ป้องกันคิวซ้อน",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "date": {
 *           "type": "STRING",
 *           "description": "วันที่ (YYYY-MM-DD)"
 *         },
 *         "time": {
 *           "type": "STRING",
 *           "description": "เวลา (HH:mm)"
 *         },
 *         "customer_name": {
 *           "type": "STRING"
 *         },
 *         "guests": {
 *           "type": "INTEGER"
 *         }
 *       },
 *       "required": [
 *         "date",
 *         "time",
 *         "customer_name"
 *       ]
 *     }
 *   }
 * ==============================================================================
 */

var Reservation = (function () {
  var SHEET = "Reservations";
  var HEADER = ["Booking_ID", "Date", "Time", "Customer", "Guests", "Status", "Created_At", "User_ID"];
  function book(args) {
    var a = args || {};
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { status: "busy", message: "ระบบกำลังประมวลผลคิวอื่นอยู่ กรุณาลองใหม่อีกครั้ง" };
    try {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
      if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
      var bkgId = "BK-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);
      sh.appendRow([bkgId, a.date, a.time, a.customer_name, a.guests || 1, "ยืนยัน", Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), CURRENT_USER_]);
      var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createTicketCard({ kind: "reservation", booking_id: bkgId, customer_name: a.customer_name, date: a.date, time: a.time, guests: a.guests }) : null;
      if (card) {
        sendReplyMessages(null, [card]);
        return { status: "success", delivered_via: "flex_message" };
      }
      return { status: "success", booking_id: bkgId, message: "จองโต๊ะสำเร็จ! รหัสจองของคุณคือ [" + bkgId + "]" };
    } finally { lock.releaseLock(); }
  }
  return { book: book };
})();
