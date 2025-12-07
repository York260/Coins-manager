import { GoogleGenAI } from "@google/genai";
import { Account, Transaction, AutomationRule } from '../types';

// NOTE: In a real production app, we would not instantiate this until we need it,
// and we definitely wouldn't want to expose keys if this wasn't a client-side demo.
// The user prompt instructions dictate using process.env.API_KEY.

export const analyzeFinances = async (
  accounts: Account[],
  transactions: Transaction[],
  rules: AutomationRule[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "請先設定 API Key 才能使用 AI 分析功能。";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare data for the prompt
    const accountSummary = accounts.map(a => `${a.name}: $${a.balance}`).join(', ');
    
    // Get last 20 transactions
    const recentTx = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map(t => `${t.date.split('T')[0]} - ${t.note} (${t.type === 'DEPOSIT' ? '+' : '-'}${t.amount})`)
      .join('\n');

    const ruleSummary = rules
      .filter(r => r.active)
      .map(r => `${r.description}: ${r.type === 'DEPOSIT' ? '匯入' : '扣款'} $${r.amount} (排除假日: ${r.excludeWeekends ? '是' : '否'})`)
      .join('\n');

    const prompt = `
      你是一個專業的財務顧問。請根據以下使用者的財務數據提供簡短、有見地的分析與建議 (繁體中文)。
      
      現有帳戶餘額:
      ${accountSummary}

      自動化規則:
      ${ruleSummary}

      最近 20 筆交易:
      ${recentTx}

      請分析資金流動狀況，是否有潛在風險，以及針對自動化儲蓄/扣款設定的建議。請保持語氣友善且專業，回答控制在 300 字以內。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法產生分析結果。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI 分析發生錯誤，請稍後再試。";
  }
};