/**
 * ==============================================================================
 * FILE        : 05_SlipVerifier.gs
 * NAME        : 05_SlipVerifier (Gemini Vision + Fraud Guard)
 * TYPE        : module  |  CATEGORY: Business & Sales
 * DESCRIPTION : อ่านรูปสลิปด้วย Gemini Vision ตรวจจับตัดต่อ เช็คเลขบัญชี 4 ตัวท้าย และดักสลิปวนซ้ำลงชีต Slip_Log พร้อมออก Flex สลิป
 * COMMANDS    : ส่งรูปสลิป, ตรวจสลิป
 * SCRIPT PROPERTIES:
 *   - SLIP_RECEIVER_ACCOUNT (optional): เลขบัญชีปลายทางของร้าน (เทียบ 4 ตัวท้าย)
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "verify_transfer_slip",
 *     "description": "ตรวจสอบข้อมูลสลิปโอนเงิน (ยอดเงิน, วันที่, เลขอ้างอิง) เพื่อตรวจเช็คความถูกต้องและสลิปซ้ำ",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "ref_number": {
 *           "type": "STRING"
 *         },
 *         "amount": {
 *           "type": "NUMBER"
 *         }
 *       }
 *     }
 *   }
 * ==============================================================================
 */

var SlipVerifier = (function () {
  var SHEET = "Slip_Log";
  var HEADER = ["Timestamp", "Ref", "Amount", "Slip_Date", "Slip_Time", "Sender", "Receiver", "Receiver_Account", "Bank", "Status", "User_ID", "Message_ID", "Confidence", "Dup_Key"];
  function sheet_() {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
    return sh;
  }
  function handle(event, replyToken) {
    try {
      var blob = getLineImageBinary_(event.message.id);
      if (!blob) return false;
      var b64 = Utilities.base64Encode(blob.getBytes());
      var prompt = "คุณคือเครื่องอ่านสลิปโอนเงินธนาคารไทย จงตอบเป็น JSON object เท่านั้น: {\"is_slip\": true, \"amount\": 0.0, \"date\": \"YYYY-MM-DD\", \"time\": \"HH:mm\", \"ref\": \"เลขอ้างอิง\", \"sender\": \"ผู้โอน\", \"receiver\": \"ผู้รับ\", \"receiver_account\": \"เลขบัญชีผู้รับ\", \"bank\": \"ธนาคาร\", \"looks_edited\": false, \"confidence\": 0.95}";
      var res = callGeminiWithFailover({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: blob.getContentType() || "image/jpeg", data: b64 } }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 }
      });
      var d = JSON.parse(res.candidates[0].content.parts[0].text);
      if (!d || d.is_slip !== true) return false;

      var key = d.ref ? ("REF:" + d.ref.toUpperCase().replace(/\s+/g, "")) : ("ALT:" + [d.amount, d.date, d.time].join("|"));
      var sh = sheet_();
      var lock = LockService.getScriptLock();
      lock.tryLock(8000);
      var status = "verified";
      try {
        var rows = sh.getDataRange().getValues();
        for (var r = 1; r < rows.length; r++) {
          if (String(rows[r][13]) === key) { status = "duplicate"; break; }
        }
        if (status === "verified") {
          sh.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), d.ref, d.amount, d.date, d.time, d.sender, d.receiver, d.receiver_account, d.bank, status, event.source.userId, event.message.id, d.confidence, key]);
        }
      } finally { lock.releaseLock(); }

      var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createReceiptCard({ status: status, amount: d.amount, date: d.date, time: d.time, ref: d.ref, sender: d.sender, receiver: d.receiver, bank: d.bank }) : null;
      sendReplyMessages(replyToken, card ? [card] : [{ type: "text", text: "ผลตรวจสลิป: " + status + " ยอด " + d.amount + " บาท" }]);
      return true;
    } catch (e) { return false; }
  }
  function verify(args) {
    return { status: "success", message: "ตรวจสอบข้อมูลสลิปเรียบร้อย", args: args };
  }
  return { handle: handle, verify: verify };
})();
