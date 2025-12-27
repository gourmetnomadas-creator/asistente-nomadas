import { GoogleGenerativeAI } from "@google/generative-ai";

// Usamos la variable con prefijo VITE_ para que el navegador la vea
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY no está definida. Configúrala en Vercel.");
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateRecipeIdeas = async (dishType, tiempo, ingredientes) => {
  try {
    const prompt = `Como chef de Nómadas Gourmet, sugiere 3 ideas para ${dishType} con ${ingredientes.join(', ')} en ${tiempo}. Responde en JSON con formato { "ideas": ["idea1", "idea2", "idea3"] }`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()).ideas;
  } catch (error) {
    console.error("Error en IA:", error);
    return ["Error al conectar con el chef", "Intenta de nuevo en un momento", "Revisa tu conexión"];
  }
};

// ... (puedes ir añadiendo las demás funciones una vez que confirmemos que esto carga)
