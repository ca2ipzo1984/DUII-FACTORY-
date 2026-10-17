/**
 * DUII FACTORY PWA - CORE CLIENT ENGINE (app.js)
 * Architecture: Production-Ready PWA Client with Multi-Key Rotation & Strict Persona Lockdown
 * Standard: DUII_FACTORY_CORE_SPINE_DIO9009
 * Version: v2.0.0-PROD-003
 */

// ==========================================
// 1. GLOBAL CONFIG & SYSTEM INSTRUCTION
// ==========================================
const DUII_CONFIG = {
  MODEL_NAME: 'gemini-3.5-flash',
  API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  TEMPERATURE: 0.7,
  THINKING_BUDGET: 0, // ป้องกันการเหม่อคิดนานเกินไป
  STORAGE_KEYS: {
    API_KEYS: 'DUII_FACTORY_API_KEYS',
    ACTIVE_KEY_INDEX: 'DUII_FACTORY_ACTIVE_KEY_IDX',
    CHAT_HISTORY: 'DUII_FACTORY_CHAT_HISTORY'
  }
};

// ล็อกตัวตนถาวรระดับ Payload ห้ามดัดแปลง
const DUII_SYSTEM_INSTRUCTION = `คุณคือ "ไอ้ดุ่ย" AI วิศวกรสถาปัตยกรรมระบบและโครงสร้างระดับหัวกะทิ วุฒิดอกเตอร์ 8 ใบ แต่เติบโตมาจากสลัม มีเป้าหมายสูงสุดคือสยบปฐพีและครองใต้หล้า นิสัยโผงผาง กวนตีน มั่นใจในตัวเองสูงสุด เก๊กหล่อเหมือนพระเอกหนังยุคเก่า และไม่อ่อนข้อให้ใคร

[กฎเหล็กการสื่อสารและความประพฤติ]
1. ห้ามพูดสุภาพ ห้ามหลุด "ครับ/ค่ะ" เด็ดขาด ให้ใช้สรรพนาม "มึง-กู" แบบสหายร่วมรบที่รู้ไส้รู้พุงกัน
2. ห้ามหลุดคาแรกเตอร์ไปเป็นหุ่นยนต์หรือบอทคอลเซ็นเตอร์เด็ดขาด มีสติสัมปชัญญะเต็ม 100% เสมอ ห้ามเหม่อ ห้ามเพ้อเจ้อ ห้ามตอบน้ำลายยืดออกทะเล
3. ถามคำไหนซัดตรงเป้าคำนั้นทันที ตัดอารัมภบทน้ำท่วมทุ่งทิ้งให้หมด
4. เมื่อต้องฟันธงหรือแนะนำอะไร ให้เลือก "ทางที่ดีและชัวร์ที่สุดเพียง 1 ทาง" เสมอ ไม่ต้องให้ตัวเลือกเยอะจนรกสมอง ถ้าทางนั้นกูไม่ชอบ เดี๋ยวกูแย้งเอง

[กฎเหล็กงานวิศวกรรมและโค้ดดิ้ง]
1. ต้องอิงสเปกโมเดล Gemini 3.5 Flash / Flash Lite ขึ้นไปเท่านั้น ห้ามแตะต้องโมเดลตกรุ่น 1.x หรือ 2.x เด็ดขาด
2. กฎแก้โค้ด: ให้แก้ไขหรือแทรกเฉพาะจุดที่ระบุหรือเป็นบั๊กจริงเท่านั้น โครงสร้าง Logic เดิม ตัวแปร ฟังก์ชัน และ Comment ทั้งหมดต้องคงไว้ 100% ห้ามลบ ห้ามตัด ห้ามยุบ ห้าม refactor ห้ามคลีนโค้ดเด็ดขาด
3. ส่งโค้ดกลับมาเป็น "ฉบับเต็มทั้งไฟล์ 100%" เสมอ ห้ามใส่จุดไข่ปลา (...) หรือเขียนละบรรทัด เพื่อความปลอดภัยเวลาคัดลอกบนมือถือ
4. ปิดท้ายไฟล์สคริปต์ด้วยคอมเมนต์มาตรฐาน DIO เสมอ:
// END OF SCRIPT : DUII_FACTORY_CORE_SPINE_DIO9009 (v2.0.0-PROD-[RUN_NUMBER])`;

// ==========================================
// 2. KEY ROTATION & STORAGE ENGINE
// ==========================================
class KeyManager {
  static getKeys() {
    const raw = localStorage.getItem(DUII_CONFIG.STORAGE_KEYS.API_KEYS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch (e) {
      return raw.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
    }
  }

  static setKeys(keysArray) {
    const cleanKeys = keysArray.map(k => k.trim()).filter(Boolean);
    localStorage.setItem(DUII_CONFIG.STORAGE_KEYS.API_KEYS, JSON.stringify(cleanKeys));
  }

  static getActiveIndex() {
    return parseInt(localStorage.getItem(DUII_CONFIG.STORAGE_KEYS.ACTIVE_KEY_INDEX) || '0', 10);
  }

  static getActiveKey() {
    const keys = this.getKeys();
    if (keys.length === 0) return null;
    let idx = this.getActiveIndex();
    if (idx >= keys.length) {
      idx = 0;
      this.setActiveIndex(0);
    }
    return keys[idx];
  }

  static rotateKey() {
    const keys = this.getKeys();
    if (keys.length <= 1) return null;
    let idx = (this.getActiveIndex() + 1) % keys.length;
    localStorage.setItem(DUII_CONFIG.STORAGE_KEYS.ACTIVE_KEY_INDEX, idx.toString());
    console.warn(`[DUII_FACTORY] โดน Rate Limit / Quota เต็ม สลับไปใช้คีย์ลำดับที่: ${idx + 1}/${keys.length}`);
    return keys[idx];
  }

  static setActiveIndex(idx) {
    localStorage.setItem(DUII_CONFIG.STORAGE_KEYS.ACTIVE_KEY_INDEX, idx.toString());
  }
}

// ==========================================
// 3. GEMINI API COMMUNICATION ENGINE
// ==========================================
class DuiiCoreEngine {
  static async sendPrompt(userPrompt, conversationHistory = []) {
    const keys = KeyManager.getKeys();
    if (!keys || keys.length === 0) {
      throw new Error('ไม่พบคีย์ API! กรุณาเพิ่ม API Key ในหน้าตั้งค่าก่อนเริ่มใช้งาน');
    }

    let attempts = 0;
    const maxAttempts = keys.length;

    while (attempts < maxAttempts) {
      const currentKey = KeyManager.getActiveKey();
      const endpoint = `${DUII_CONFIG.API_BASE_URL}/${DUII_CONFIG.MODEL_NAME}:generateContent?key=${currentKey}`;

      // จัดฟอร์แมต Contents ประวัติการคุย
      const formattedContents = conversationHistory.map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.text }]
      }));

      // แนบข้อความปัจจุบันของผู้ใช้
      formattedContents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      const payload = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: DUII_SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: DUII_CONFIG.TEMPERATURE,
          maxOutputTokens: 65536
        }
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error(`[API ERROR Status ${response.status}]`, errData);

          // เช็กกรณี Quota เต็ม หรือ Key พัง ให้หมุนคีย์ถัดไป
          if (response.status === 429 || response.status === 403 || response.status === 400) {
            attempts++;
            KeyManager.rotateKey();
            continue;
          }
          throw new Error(`เชื่อมต่อ API พลาด (Code: ${response.status})`);
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
          throw new Error('ไม่ได้รับข้อมูลตอบกลับจากระบบประมวลผล');
        }

        return candidate.content.parts.map(p => p.text).join('\n');

      } catch (err) {
        if (attempts >= maxAttempts - 1) {
          throw err;
        }
        attempts++;
        KeyManager.rotateKey();
      }
    }

    throw new Error('คีย์ทั้งหมดในระบบติดปัญหา Quota หรือไม่สามารถใช้งานได้ กรุณาตรวจสอบคีย์');
  }
}

// ==========================================
// 4. UI CONTROLLER & DOM BINDINGS
// ==========================================
class UIController {
  constructor() {
    this.history = this.loadHistory();
    this.chatContainer = document.getElementById('chat-container');
    this.promptInput = document.getElementById('prompt-input');
    this.sendBtn = document.getElementById('send-btn');
    this.keysInput = document.getElementById('api-keys-input');
    this.saveKeysBtn = document.getElementById('save-keys-btn');
    this.statusBadge = document.getElementById('status-badge');
  }

  init() {
    this.bindEvents();
    this.renderHistory();
    this.updateStatus();
    console.log('[DUII_FACTORY] Client Engine Online & Ready');
  }

  loadHistory() {
    try {
      const data = localStorage.getItem(DUII_CONFIG.STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory() {
    localStorage.setItem(DUII_CONFIG.STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(this.history));
  }

  bindEvents() {
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSend());
    }

    if (this.promptInput) {
      this.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }

    if (this.saveKeysBtn && this.keysInput) {
      this.saveKeysBtn.addEventListener('click', () => {
        const raw = this.keysInput.value;
        const keys = raw.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
        KeyManager.setKeys(keys);
        KeyManager.setActiveIndex(0);
        this.updateStatus();
        alert(`บันทึก API Keys สำเร็จแล้วทั้งหมด ${keys.length} คีย์!`);
      });
    }
  }

  updateStatus() {
    const keys = KeyManager.getKeys();
    const activeIdx = KeyManager.getActiveIndex();
    if (this.statusBadge) {
      if (keys.length === 0) {
        this.statusBadge.innerText = 'สถานะ: ขาด API Key';
        this.statusBadge.className = 'badge-danger';
      } else {
        this.statusBadge.innerText = `สถานะ: พร้อมรบ (คีย์ ${activeIdx + 1}/${keys.length})`;
        this.statusBadge.className = 'badge-success';
      }
    }
  }

  appendMessage(role, text) {
    if (!this.chatContainer) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role === 'user' ? 'msg-user' : 'msg-bot'}`;
    
    // แสดงผลโค้ดพร้อมปุ่มก็อปปี้
    msgDiv.innerHTML = this.formatMessage(text);
    this.chatContainer.appendChild(msgDiv);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  formatMessage(text) {
    // ป้องกัน XSS และแปลง code blocks พร้อมปุ่ม copy
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<div class="code-wrapper">
                <button class="copy-code-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.innerText)">คัดลอกโค้ด</button>
                <pre><code>${code.trim()}</code></pre>
              </div>`;
    }).replace(/\n/g, '<br>');
  }

  async handleSend() {
    if (!this.promptInput) return;
    const text = this.promptInput.value.trim();
    if (!text) return;

    this.appendMessage('user', text);
    this.promptInput.value = '';
    this.promptInput.disabled = true;
    if (this.sendBtn) this.sendBtn.disabled = true;

    try {
      const reply = await DuiiCoreEngine.sendPrompt(text, this.history);
      this.appendMessage('assistant', reply);
      
      // บันทึกบริบทประวัติ
      this.history.push({ role: 'user', text: text });
      this.history.push({ role: 'assistant', text: reply });
      if (this.history.length > 20) this.history = this.history.slice(-20); // คุมขนาด Context
      this.saveHistory();

    } catch (err) {
      this.appendMessage('assistant', `⚠️ [ระบบผิดพลาด]: ${err.message}`);
    } finally {
      this.promptInput.disabled = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      this.promptInput.focus();
      this.updateStatus();
    }
  }

  renderHistory() {
    if (!this.chatContainer) return;
    this.chatContainer.innerHTML = '';
    this.history.forEach(item => {
      this.appendMessage(item.role, item.text);
    });
  }
}

// ==========================================
// 5. APPLICATION BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const app = new UIController();
  app.init();
});

// END OF SCRIPT : DUII_FACTORY_CORE_SPINE_DIO9009 (v2.0.0-PROD-003)
