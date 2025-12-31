
import { GoogleGenAI } from "@google/genai";
import { AggregatedData } from "../types";

export const analyzeWithAi = async (data: AggregatedData[], query: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataContext = JSON.stringify(data, null, 2);
  const prompt = `
    Dưới đây là dữ liệu tổng hợp từ các file bảng tính (dạng JSON):
    ${dataContext}

    Câu hỏi của người dùng: "${query}"

    Hãy phân tích dữ liệu trên và trả lời câu hỏi một cách chi tiết, chuyên nghiệp. 
    Nếu người dùng hỏi về các xu hướng, đơn vị có chỉ số cao nhất/thấp nhất, hãy chỉ rõ.
    Trả lời bằng tiếng Việt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    return response.text || "Xin lỗi, tôi không thể phân tích dữ liệu lúc này.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.";
  }
};
