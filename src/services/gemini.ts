import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const PhysicsAI = {
  // 1. OCR and Question Extraction
  extractQuestions: async (imageData?: string, textContent?: string) => {
    const prompt = `你是一个专业的物理老师。请从提供的图片或文字中识别物理题目。
    如果是图片，请进行 OCR 识别。
    请将识别出的题目列表以 JSON 格式返回，包含：题目内容、题型（单选、多选、填空、解答）、预估知识点、正确答案（如果能推导出来）。
    返回格式：Array<{ content: string, type: string, knowledgePoints: string[], correctAnswer: string }>`;

    const contents: any = { parts: [] };
    if (imageData) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.replace(/^data:image\/\w+;base64,/, ""),
        }
      });
    }
    if (textContent) {
      contents.parts.push({ text: textContent });
    }
    contents.parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              type: { type: Type.STRING },
              knowledgePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING }
            },
            required: ["content", "type"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  },

  // 2. Intelligent Grading
  gradeSubmission: async (question: string, correctAnswer: string, studentAnswer: string, studentImage?: string) => {
    const prompt = `你是一个专业的物理老师。请对学生的作答进行批改。
    题目：${question}
    正确答案：${correctAnswer}
    学生作答：${studentAnswer}
    
    请返回 JSON 格式：
    {
      "grade": "优秀/良好/及格/不及格",
      "isCorrect": boolean,
      "feedback": "详细的讲解和错题分析",
      "errorType": "concept (概念理解错误) / notation (答题规范疏漏) / carelessness (低级粗心失误) / none",
      "knowledgePoints": ["识别出的具体知识点"]
    }`;

    const contents: any = { parts: [{ text: prompt }] };
    if (studentImage) {
      contents.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: studentImage.replace(/^data:image\/\w+;base64,/, ""),
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.STRING },
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            errorType: { type: Type.STRING },
            knowledgePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["grade", "isCorrect", "feedback", "errorType", "knowledgePoints"]
        }
      }
    });

    return JSON.parse(response.text);
  },

  // 3. Weekly Profile Analysis
  generateProfileReport: async (historyData: any) => {
    const prompt = `根据以下学生的作答历史数据，生成一份学情画像报告。
    数据：${JSON.stringify(historyData)}
    
    请分析：
    1. 薄弱知识点。
    2. 错误大类分部（概念理解错误、答题规范疏漏、低级粗心失误）。
    3. 学习建议。
    返回 JSON 格式：
    {
      "weakPoints": ["知识点1", "知识点2"],
      "errorStats": { "concept": number, "notation": number, "carelessness": number },
      "advice": "一段话建议"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weakPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            errorStats: {
              type: Type.OBJECT,
              properties: {
                concept: { type: Type.INTEGER },
                notation: { type: Type.INTEGER },
                carelessness: { type: Type.INTEGER }
              }
            },
            advice: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text);
  }
};
