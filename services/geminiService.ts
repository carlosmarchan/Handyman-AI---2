import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";
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
    const imageParts = images.map(img => fileToGenerativePart(img.annotatedSrc || img.src, img.mimeType));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a writing assistant helping a handyman refine a work report for their client. The user will provide feedback or a command. Your task is to respond with the **entire, rewritten report** that incorporates their changes. Always output the full, updated report text. Maintain a professional, clear, and confident tone. Use Markdown for formatting. The original context is based on photos (some may be annotated with highlights or arrows) and notes the user provided. When a user provides a command based on an annotated image, ensure the report text reflects that annotation clearly.",
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

export async function analyzeImageForAnnotation(image: ImageFile): Promise<string> {
    const imagePart = fileToGenerativePart(image.src, image.mimeType);
    const prompt = `Analyze this image from a handyman's report. What is the single most important detail a client should notice? Describe this detail in a short, natural language phrase that could be used as an instruction to visually highlight it.

Examples of good phrases:
- "The repaired crack in the drywall"
- "The newly installed water filter"
- "The water damage before it was fixed"
- "The dent on the bumper"

Your response should ONLY be the descriptive phrase itself, with no extra text, quotes, or explanation.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error analyzing image for annotation:", error);
        // Return a generic prompt on failure
        return "The area of interest.";
    }
}

export async function annotateImage(image: ImageFile, prompt: string): Promise<string> {
    const imagePart = fileToGenerativePart(image.src, image.mimeType);
    const fullPrompt = `Your task is to visually highlight a key detail in the provided image based on the user's request. The highlight should be professional, clean, and highly visible for a client report (use bold, high-contrast colors like safety yellow or bright red). Your default action should be to draw a clean circle around the detail. If a circle is not appropriate, use an arrow pointing to the detail. Do not add any text to the image. The user's request describing the detail is: "${prompt}"`;
    const textPart = { text: fullPrompt };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imageResponsePart = response.candidates[0].content.parts.find(part => part.inlineData);
        if (imageResponsePart?.inlineData) {
            const base64ImageBytes: string = imageResponsePart.inlineData.data;
            return `data:${imageResponsePart.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
        
        const textResponsePart = response.candidates[0].content.parts.find(part => part.text);
        if (textResponsePart?.text) {
            // The model responded with text, likely explaining why it couldn't annotate.
            throw new Error(textResponsePart.text);
        }

        throw new Error("The AI did not return an annotated image. Please rephrase your prompt and try again.");

    } catch (error) {
        console.error("Error annotating image:", error);
        // Re-throw the specific error from the model or the generic one
        throw error;
    }
}

export async function getReportSuggestionAfterAnnotation(chatSession: Chat, annotationPrompt: string): Promise<string> {
    const prompt = `I just annotated an image with the instruction: "${annotationPrompt}". Based on this, suggest a concise command I can use to add a sentence to my report that mentions this annotation. The command should be phrased as an instruction to an AI assistant. Your response must ONLY be the suggested command itself, with no introductory text or quotes. For example, a good response would be: 'Add a sentence explaining that the temporary spare tire has been securely installed, as circled in the photo.'`;
    
    try {
        // Use a temporary chat session that inherits the history to avoid polluting the main chat
        // FIX: The 'history' property on a Chat object is private. Use the public 'getHistory()' method instead.
        const history = await chatSession.getHistory();
        const suggestionChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
        });
        const suggestionResponse: GenerateContentResponse = await suggestionChat.sendMessage({ message: prompt });
        return suggestionResponse.text.trim().replace(/^"|"$/g, ''); // Trim and remove quotes
    } catch (error) {
        console.error("Error getting report suggestion:", error);
        throw new Error("The AI failed to provide a suggestion.");
    }
}