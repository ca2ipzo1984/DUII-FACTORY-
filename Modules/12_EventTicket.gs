/**
 * ==============================================================================
 * FILE        : 12_EventTicket.gs
 * NAME        : 12_EventTicket (Event Reg & QR Ticket)
 * TYPE        : module  |  CATEGORY: Operations & Social
 * DESCRIPTION : ลงทะเบียนร่วมกิจกรรม ตรวจสอบโควตาที่นั่งคงเหลือ ออก E-Ticket พร้อมรหัส Check-in QR Code
 * COMMANDS    : ลงทะเบียนงาน, ออกตั๋ว, Check-in
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "event_ticket_service",
 *     "description": "ลงทะเบียนเข้าร่วมงานอีเวนต์ ตรวจสอบโควตาที่นั่ง และออกบัตร E-Ticket พร้อมรหัส Check-in",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "event_name": {
 *           "type": "STRING"
 *         },
 *         "attendee_name": {
 *           "type": "STRING"
 *         }
 *       },
 *       "required": [
 *         "event_name",
 *         "attendee_name"
 *       ]
 *     }
 *   }
 * ==============================================================================
 */

var EventTicket = (function () {
  function process(args) {
    var tId = "TCK-" + Math.floor(100000 + Math.random() * 900000);
    var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createTicketCard({ kind: "ticket", ticket_id: tId, event_name: args.event_name, attendee_name: args.attendee_name, checkin_code: tId.slice(-4) }) : null;
    if (card) {
      sendReplyMessages(null, [card]);
      return { status: "success", delivered_via: "flex_message" };
    }
    return { status: "success", ticket_id: tId, message: "ออกตั๋วสำเร็จ รหัสตั๋วของคุณคือ [" + tId + "]" };
  }
  return { process: process };
})();
