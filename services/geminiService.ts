import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ImageFile } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
}

export async function generateInitialReport(images: ImageFile[], notes: string): Promise<string> {
    const imageParts = images.map(img => fileToGenerativePart(img.src, img.mimeType));
    
    const prompt = `You are a helpful assistant for a handyman. Your task is to generate a professional work report for a client based on the provided images and notes.
    The report should be clear, concise, and instill confidence in the work performed. Use Markdown for formatting (e.g., headings, bold text, bullet points).
    
    Structure your response as follows:
    1. A brief, friendly opening and summary of the job.
    2. A bulleted list detailing the key tasks completed.
    3. A concluding sentence reassuring the client.

    Here are the details:
    ${notes ? `\n**Handyman's Notes:**\n${notes}` : ''}
    
    Analyze the images and notes to create the report.`;

    const contents = {
        parts: [
            ...imageParts,
            { text: prompt }
        ]
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating initial report:", error);
        throw new Error("The AI failed to generate a report. Please try again.");
    }
}


export function initializeChat(images: ImageFile[], notes: string, initialReport: string): Chat {
    const imageParts = images.map(img => fileToGenerativePart(img.src, img.mimeType));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a writing assistant helping a handyman refine a work report for their client. The user will provide feedback or a command. Your task is to respond with the **entire, rewritten report** that incorporates their changes. Always output the full, updated report text. Maintain a professional, clear, and confident tone. Use Markdown for formatting like tables, bold text, and lists. The original context is based on photos and notes the user provided.",
      },
      history: [
        {
            role: 'user',
            parts: [
                ...imageParts,
                { text: `Here are my initial notes: "${notes}". Based on these and the images, you generated a first draft.`}
            ]
        },
        {
            role: 'model',
            parts: [
                { text: initialReport }
            ]
        }
      ]
    });
    return chat;
}


export async function refineReport(chatSession: Chat, userInput: string): Promise<string> {
    try {
        const response: GenerateContentResponse = await chatSession.sendMessage({ message: userInput });
        return response.text;
    } catch (error) {
        console.error("Error refining report:", error);
        throw new Error("The AI failed to refine the report. Please try again.");
    }
}
