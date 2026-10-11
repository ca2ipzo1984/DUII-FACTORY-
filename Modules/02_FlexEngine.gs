/**
 * ==============================================================================
 * FILE        : 02_FlexEngine.gs
 * NAME        : 02_FlexEngine (Card Generator)
 * TYPE        : module  |  CATEGORY: UI & Presentation
 * DESCRIPTION : ระบบสร้าง LINE Flex Message อัตโนมัติ: การ์ดบิล, ตั๋ว QR Code, การ์ดสลิปเขียว/แดง มี Safe Fallback Text 100%
 * COMMANDS    : Flex Cards, Receipt, Ticket, Order Card
 * ==============================================================================
 */

var FlexEngine = (function () {
  var QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=";
  function text_(t, o) {
    var b = { type: "text", text: String(t || "-") };
    if (o) for (var k in o) b[k] = o[k];
    return b;
  }
  function row_(label, value, valColor) {
    return {
      type: "box", layout: "horizontal", spacing: "sm",
      contents: [ text_(label, { size: "xs", color: "#8A8A8A", flex: 3 }), text_(value, { size: "xs", color: valColor || "#222222", flex: 5, wrap: true, weight: "bold" }) ]
    };
  }
  function createReceiptCard(s) {
    var isOk = s.status === "verified";
    var headBg = isOk ? "#1B6B3A" : "#9B0019";
    var cardBg = isOk ? "#E8F8EE" : "#FFECEC";
    var title = isOk ? "✅ สลิปผ่านการตรวจเบื้องต้น" : "⛔ สลิปมีปัญหา/เคยใช้แล้ว";
    var bubble = {
      type: "bubble", size: "kilo", styles: { body: { backgroundColor: cardBg } },
      body: {
        type: "box", layout: "vertical", paddingAll: "14px", borderWidth: "2px", borderColor: headBg, cornerRadius: "14px",
        contents: [
          { type: "box", layout: "vertical", backgroundColor: headBg, paddingAll: "10px", cornerRadius: "8px", contents: [text_(title, { weight: "bold", size: "sm", color: "#FFFFFF" })] },
          { type: "box", layout: "vertical", spacing: "sm", margin: "md", contents: [
            row_("ยอดเงิน", s.amount ? Number(s.amount).toLocaleString("en-US") + " บาท" : "-"),
            row_("วันที่-เวลา", (s.date || "") + " " + (s.time || "")),
            row_("เลขอ้างอิง", s.ref),
            row_("ผู้รับ", s.receiver),
            row_("ธนาคาร", s.bank)
          ]}
        ]
      }
    };
    return { type: "flex", altText: title, contents: bubble };
  }
  function createOrderCard(o) {
    var lines = Array.isArray(o.items) ? o.items : [String(o.items || "-")];
    var itemBoxes = lines.map(function(l) { return text_("• " + l, { size: "xs", color: "#333333", wrap: true }); });
    var bubble = {
      type: "bubble", size: "kilo",
      body: {
        type: "box", layout: "vertical", paddingAll: "16px", spacing: "xs",
        contents: [
          text_("🧾 สรุปออเดอร์", { weight: "bold", size: "md", color: "#111111" }),
          text_(String(o.order_id || ""), { size: "xxs", color: "#999999" }),
          { type: "separator", margin: "sm" },
          { type: "box", layout: "vertical", spacing: "xs", margin: "sm", contents: itemBoxes },
          { type: "separator", margin: "sm" },
          { type: "box", layout: "horizontal", margin: "sm", contents: [ text_("ยอดรวม", { size: "sm", color: "#555555", flex: 2 }), text_(Number(o.total || 0).toLocaleString("en-US") + " บาท", { size: "lg", weight: "bold", color: "#0B6E4F", align: "end", flex: 4 }) ]},
          row_("เบอร์โทร", o.phone),
          row_("ที่อยู่จัดส่ง", o.address)
        ]
      }
    };
    return { type: "flex", altText: "🧾 สรุปออเดอร์ " + (o.order_id || ""), contents: bubble };
  }
  function createTicketCard(t) {
    var isRes = t.kind === "reservation";
    var accent = isRes ? "#1565C0" : "#6A1B9A";
    var title = isRes ? "📅 ยืนยันการจองสำเร็จ" : "🎫 E-Ticket สำเร็จ";
    var id = isRes ? t.booking_id : t.ticket_id;
    var qrData = isRes ? ("BOOKING|" + id) : ("TICKET|" + id);
    var bubble = {
      type: "bubble", size: "kilo",
      body: {
        type: "box", layout: "vertical", paddingAll: "14px", spacing: "md", borderWidth: "2px", borderColor: accent, cornerRadius: "14px",
        contents: [
          { type: "box", layout: "vertical", backgroundColor: accent, paddingAll: "10px", cornerRadius: "8px", contents: [text_(title, { weight: "bold", size: "sm", color: "#FFFFFF" })] },
          { type: "box", layout: "vertical", spacing: "sm", contents: [
            row_("ชื่อผู้จอง", t.customer_name || t.attendee_name),
            row_("วันที่", t.date),
            row_("เวลา", t.time),
            row_("จำนวน", (t.guests || 1) + " ท่าน"),
            row_("รหัสอ้างอิง", id, accent)
          ]},
          { type: "image", url: QR_URL + encodeURIComponent(qrData), size: "md", aspectMode: "fit", aspectRatio: "1:1" }
        ]
      }
    };
    return { type: "flex", altText: title, contents: bubble };
  }
  return { createReceiptCard: createReceiptCard, createOrderCard: createOrderCard, createTicketCard: createTicketCard };
})();
