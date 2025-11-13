
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully,
  // perhaps by showing a message to the user in the UI.
  console.error("VITE_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix (e.g., "data:application/pdf;base64,").
        // We need to remove this prefix before sending to the API.
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error("Failed to read file as base64 string."));
      }
    };
    reader.onerror = (error) => {
        reject(error);
    };
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export type ConversionFormat = 'txt' | 'word' | 'excel' | 'html' | 'markdown' | 'json';

export const convertFile = async (format: ConversionFormat, file: File): Promise<string> => {
  let prompt = '';
  switch (format) {
      case 'txt':
          prompt = 'Extract all text content from the provided PDF file. The output should be plain text.';
          break;
      case 'word':
          prompt = 'Convert the provided PDF file into a well-structured document format. Preserve text formatting, paragraphs, lists, and headings as best as you can, suitable for pasting into a Word document.';
          break;
      case 'excel':
          prompt = 'Analyze the provided PDF file, identify any tables, and extract the data into a CSV (Comma-Separated Values) format. Each table should be a separate CSV block. If no tables are found, state that clearly.';
          break;
      case 'html':
          prompt = 'Convert the provided PDF file into semantic HTML. Preserve structure like headings (h1, h2, etc.), paragraphs (p), lists (ul, ol, li), and tables (table, tr, td, th). The output should be a complete HTML snippet ready to be embedded in a webpage body.';
          break;
      case 'markdown':
          prompt = 'Convert the provided PDF file into Markdown format. Preserve text formatting (bold, italics), headings (#, ##), lists (*, 1.), and tables using Markdown syntax. The output should be clean, readable Markdown.';
          break;
      case 'json':
          prompt = 'Analyze the provided PDF file and extract any structured data into a valid JSON format. Identify key-value pairs, lists, and tables. The output should be a well-formed JSON object or an array of objects.';
          break;
      default:
          throw new Error("Invalid format selected.");
  }

  try {
    const filePart = await fileToGenerativePart(file);
    const textPart = { text: prompt };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [filePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error converting file with Gemini:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "An unknown error occurred during file conversion.";
  }
};