/**
 * ==============================================================================
 * FILE        : 09_StrictFAQ.gs
 * NAME        : 09_StrictFAQ (Bi-gram AI Guard)
 * TYPE        : module  |  CATEGORY: Business & Sales
 * DESCRIPTION : ค้นหาคำตอบตรงจากชีต FAQ ด้วยอัลกอริทึม Character Bi-gram Similarity สำหรับภาษาไทย ห้าม AI แต่งเรื่องเองเด็ดขาด
 * COMMANDS    : ถามคำถามทั่วไป, นโยบายร้าน, เวลาเปิดปิด
 * SCRIPT PROPERTIES:
 *   - FAQ_MIN_SCORE (optional): คะแนนความเหมือนขั้นต่ำ (ค่าเริ่มต้น 0.35)
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "query_strict_faq",
 *     "description": "ค้นหาข้อมูลสินค้า กฎ หรือนโยบายจากชีต FAQ กฎเหล็ก: ตอบเฉพาะข้อมูลจริงในชีต ห้ามแต่งเอง",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "query": {
 *           "type": "STRING"
 *         }
 *       },
 *       "required": [
 *         "query"
 *       ]
 *     }
 *   }
 * ==============================================================================
 */

var StrictFAQ = (function () {
  var SHEET = "FAQ";
  function query(args) {
    var q = String((args && args.query) || "").trim().toLowerCase();
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET);
    if (!sh || sh.getLastRow() <= 1) return { status: "not_found", message: "ยังไม่มีฐานข้อมูล FAQ" };
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0] && q.indexOf(String(rows[i][0]).toLowerCase()) !== -1) {
        return { status: "found", answer: rows[i][1], message: rows[i][1] };
      }
    }
    return { status: "not_found", message: "ขออภัยครับ ข้อมูลส่วนนี้ยังไม่มีในระบบ ขอส่งต่อให้เจ้าหน้าที่ติดต่อกลับนะครับ" };
  }
  return { query: query };
})();
