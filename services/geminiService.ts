
import { GoogleGenAI } from "@google/genai";
import { Stock, PalletType } from "../types";
import { PALLET_TYPES } from "../constants";

export async function getLogisticsAssistantResponse(
  query: string,
  allStock: Stock,
  selectedBranch: string,
  branchName: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // สร้างสรุปสต็อกสำหรับ AI ในรูปแบบที่อ่านง่าย
  const fullStockSummary = Object.entries(allStock).map(([branchId, stock]) => {
    const items = Object.entries(stock).map(([pId, qty]) => {
      const p = PALLET_TYPES.find(t => t.id === pId);
      return `${p?.name}: ${qty} ตัว`;
    }).join(", ");
    return `${branchId}: ${items}`;
  }).join("\n");

  const systemInstruction = `
    คุณคือ "Neo Assistant" ผู้เชี่ยวชาญด้านโลจิสติกส์และการจัดการพาเลทของบริษัท Neo Siam Logistics.
    
    ข้อมูลปัจจุบัน:
    - สาขาที่กำลังดู: ${branchName} (${selectedBranch})
    - รายงานสต็อกทั้งเครือข่าย:
    ${fullStockSummary}
    
    กฎทางธุรกิจและแนวทางการจัดการ (โปรดใช้ในการวิเคราะห์):
    1. การซ่อมแซม (Repair):
       - Loscam Red, Blue, Yellow: เมื่อซ่อมเสร็จจะแปลงสภาพเป็น "พาเลทหมุนเวียน (ไม้/คละสี)" ทันทีเพื่อประหยัดต้นทุนและเวียนใช้ใหม่ภายใน
       - ชนิดอื่นๆ: ซ่อมเสร็จกลับเข้าสต็อกประเภทเดิม
    
    2. การคัดจ่ายทิ้ง (Discard/Scrap Management):
       - Loscam (พาเลทเช่า): หากทิ้งต้องมีรายงานความเสียหายชัดเจนเพื่อรับผิดชอบค่า Replacement Cost ตามสัญญา
       - พาเลทพลาสติก: แนะนำให้รวบรวมส่งขายคืนโรงงานผลิตเพื่อรีไซเคิลเป็นรายได้คืนบริษัท
       - พาเลทไม้ทั่วไป: แนะนำคัดแยกไม้ที่เสียเพื่อขายเป็นไม้ Biomass หรือไม้ฟืน
    
    3. รอบการบริหาร:
       - เน้นโอนพาเลทแดงกลับ Hub NW เพื่อส่งคืน Supplier (วังน้อย) 3 ครั้งต่อสัปดาห์
    
    คำแนะนำในการตอบ:
    - ตอบเป็นภาษาไทยอย่างมืออาชีพ มั่นใจ และสุภาพ
    - หากผู้ใช้ถามเรื่องการซ่อมพาเลท Loscam (แดง/ฟ้า/เหลือง) ให้ชี้แจงว่าระบบจะทำการหักสต็อกออกจากรายการเช่าและแปลงสภาพเป็นพาเลทไม้หมุนเวียนทันที
    - ให้คำแนะนำเชิงรุกด้านการประหยัดต้นทุน (Cost Saving)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction,
        temperature: 0.6,
        tools: [{ googleSearch: {} }]
      },
    });

    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "ขออภัยครับ ระบบประมวลผล AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" };
  }
}
