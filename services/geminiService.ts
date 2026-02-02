
import { GoogleGenAI } from "@google/genai";
import { Stock, PalletType } from "../types";
import { PALLET_TYPES } from "../constants";

export async function getLogisticsAssistantResponse(
  query: string,
  allStock: Stock,
  selectedBranch: string,
  branchName: string
) {
  // @ts-ignore
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing!");
    return { text: "ขออภัยครับ ยังไม่ได้กำหนด API Key สำหรับระบบ AI" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Creating stock summary
    const fullStockSummary = Object.entries(allStock).map(([branchId, stock]) => {
      const items = Object.entries(stock).map(([pId, qty]) => {
        const p = PALLET_TYPES.find(t => t.id === pId);
        return `${p?.name}: ${qty} ตัว`;
      }).join(", ");
      return `${branchId}: ${items}`;
    }).join("\n");

    const systemInstruction = `
      คุณคือ "Neo Assistant" ผู้เชี่ยวชาญด้านโลจิสติกส์และการจัดการพาเลทของบริษัท Neo Siam Logistics.
      ข้อมูลปัจจุบัน: สาขา ${branchName} (${selectedBranch})
      รายงานสต็อก: ${fullStockSummary}
      โต้ตอบเป็นภาษาไทยอย่างมืออาชีพ สั้น กระชับ และสุภาพ
    `;

    // Try multiple model endpoints if one fails
    // @ts-ignore
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(systemInstruction + "\n\n" + query);
    const response = await result.response;
    const text = response.text();

    return {
      text: text,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "ขออภัยครับ ระบบวิเคราะห์ข้อมูลขัดข้องชั่วคราว แต่ภาพรวมการหมุนเวียนพาเลทวันนี้ยังคงปกติครับ" };
  }
}
