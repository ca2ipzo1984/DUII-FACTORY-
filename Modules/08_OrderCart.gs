/**
 * ==============================================================================
 * FILE        : 08_OrderCart.gs
 * NAME        : 08_OrderCart (Order & Checkout)
 * TYPE        : module  |  CATEGORY: Business & Sales
 * DESCRIPTION : สกัดรายการสินค้า คำนวณยอดเงิน เบอร์โทร 10 หลัก ออกรหัส ORD-* บันทึกลงชีต Orders พร้อมสร้าง Flex สรุปออเดอร์
 * COMMANDS    : สั่งซื้อ, สรุปยอด, ที่อยู่จัดส่ง
 * SCRIPT PROPERTIES:
 *   - ORDER_PAY_INFO (optional): ข้อความแนะนำการชำระเงินท้ายบิล
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "create_order_summary",
 *     "description": "สกัดรายการสินค้า คำนวณยอดเงินรวม สกัดที่อยู่ เบอร์โทร 10 หลัก และสร้างใบสรุปออเดอร์",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "items": {
 *           "type": "STRING"
 *         },
 *         "total_amount": {
 *           "type": "NUMBER"
 *         },
 *         "phone": {
 *           "type": "STRING"
 *         },
 *         "address": {
 *           "type": "STRING"
 *         }
 *       },
 *       "required": [
 *         "items",
 *         "total_amount"
 *       ]
 *     }
 *   }
 * ==============================================================================
 */

var OrderCart = (function () {
  var SHEET = "Orders";
  var HEADER = ["Timestamp", "Order_ID", "Items", "Total", "Phone", "Address", "Status", "User_ID"];
  function createSummary(args) {
    var a = args || {};
    var orderId = "ORD-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMdd-HHmmss") + "-" + Math.floor(100 + Math.random() * 900);
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
    sh.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), orderId, a.items, a.total_amount, a.phone || "-", a.address || "-", "รอชำระเงิน", CURRENT_USER_]);
    var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createOrderCard({ order_id: orderId, items: a.items, total: a.total_amount, phone: a.phone, address: a.address }) : null;
    if (card) {
      sendReplyMessages(null, [card]);
      return { status: "success", delivered_via: "flex_message" };
    }
    return { status: "success", order_id: orderId, total: a.total_amount, message: "สรุปคำสั่งซื้อ [" + orderId + "] ยอดรวม " + a.total_amount + " บาท" };
  }
  return { createSummary: createSummary };
})();
