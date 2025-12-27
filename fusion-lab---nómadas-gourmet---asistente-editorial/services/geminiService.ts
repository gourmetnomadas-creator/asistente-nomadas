
import { GoogleGenAI, Type } from "@google/genai";
import { Tiempo, Temporada, CookingLevel, Recipe, FusionResult, Preference, DishType, IngredientConstraint } from "../types";

// Always use the apiKey parameter directly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const processPreferencias = (preferencias: Preference[]) => {
  const dietas = preferencias.filter(p => ['vegano', 'vegetariano'].includes(p));
  const exclusiones = preferencias.filter(p => !['vegano', 'vegetariano'].includes(p));
  
  let text = "";
  if (dietas.length > 0) {
    text += `DIETA REQUERIDA (OBLIGATORIO): ${dietas.join(' y ')}. `;
  }
  if (exclusiones.length > 0) {
    text += `EXCLUSIONES ESTRICTAS (PROHIBIDO USAR): ${exclusiones.join(', ')}. `;
  }
  return text;
};

export const generateRecipeIdeas = async (
  dishType: DishType,
  tiempo: Tiempo,
  temporada: Temporada,
  level: CookingLevel,
  ingredientes: string[],
  customPrompt: string,
  preferencias: Preference[],
  ingredientConstraint: IngredientConstraint
): Promise<string[]> => {
  const constraintsText = processPreferencias(preferencias);
  const ingredientLimit = ingredientConstraint === 'Libre' ? 'sin límite' : (ingredientConstraint === 'Esencial (< 10)' ? 'menos de 10 ingredientes' : 'menos de 5 ingredientes');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Propón 3 ideas de platos distintas para una persona que no sabe qué cocinar.
    Contexto: Tipo de plato: ${dishType}, Tiempo: ${tiempo}, Época: ${temporada}, Nivel: ${level}.
    Restricción de ingredientes: ${ingredientLimit}.
    ${constraintsText}
    ${ingredientes.length > 0 ? `Ingrediente base deseado: ${ingredientes.join(', ')}` : ''}
    ${customPrompt ? `Notas adicionales del usuario: "${customPrompt}"` : ''}`,
    config: {
      systemInstruction: `Eres el editor de cocina de Nómadas Gourmet. Tu objetivo es proponer 3 direcciones culinarias cortas, claras y diferenciadas (Paso 1).
      
      REGLAS CRÍTICAS:
      - CUMPLE EL LÍMITE DE INGREDIENTES: Si es 'menos de 5' o 'menos de 10', las ideas deben ser extremadamente sencillas.
      - Si se indica 'vegano', el plato NO PUEDE contener carne, pescado, lácteos, huevo, miel ni ningún derivado animal.
      - Si se indica 'vegetariano', el plato NO PUEDE contener carne ni pescado.
      - Si hay exclusiones (ej: sin gluten), asegúrate de que la idea sea compatible.
      - El usuario ha indicado que busca un tipo de plato: ${dishType}.
      - Si el tipo es 'Dulces', enfócate en postres o dulces reconfortantes.
      - Si el tipo es 'Snacks', enfócate en meriendas o picoteos.
      - NO des recetas ni listas de ingredientes todavía.
      - Usa lenguaje editorial (ej: "Un guiso de cuchara reconfortante", "Salteado cítrico y crujiente").
      - Idioma: Español.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 3,
            maxItems: 3
          }
        },
        required: ["ideas"]
      }
    }
  });

  const data = JSON.parse(response.text || '{"ideas":[]}');
  return data.ideas;
};

export const generateEditorialRecipe = async (
  selectedIdea: string,
  preferencias: Preference[],
  ingredientConstraint: IngredientConstraint
): Promise<FusionResult> => {
  const constraintsText = processPreferencias(preferencias);
  const ingredientLimit = ingredientConstraint === 'Libre' ? 'sin límite' : (ingredientConstraint === 'Esencial (< 10)' ? 'máximo 9 ingredientes' : 'máximo 4 ingredientes');

  const recipeResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Desarrolla la receta completa para esta idea seleccionada: "${selectedIdea}".
    LÍMITE DE INGREDIENTES (OBLIGATORIO): ${ingredientLimit}.
    ${constraintsText}`,
    config: {
      systemInstruction: `Actúas como el asistente editorial de cocina de Nómadas Gourmet.
      
      MARCO EDITORIAL Y SEGURIDAD ALIMENTARIA:
      - RESTRICCIÓN DE INGREDIENTES: Es un "hard constraint". Si el límite es 4 o 9, NO puedes pasarte ni por un ingrediente (el agua, la sal y la pimienta cuentan como ingredientes si los pones en la lista).
      - CUMPLIMIENTO ESTRICTO: Si la dieta es 'vegano' o 'vegetariano', o hay exclusiones, CÚMPLELO A RAJATABLA. 
      - Hablas desde la cocina real y calmada (enfoque vegetal y antiinflamatorio).
      - Tono cercano, honesto y poético.

      ESTRUCTURA DE RESPUESTA (JSON):
      - 'title': Nombre hogareño y sugerente.
      - 'notaPersonal': 3 líneas sobre el ritmo y la sensación de cocinar este plato.
      - 'badges': Array de 2-3 etiquetas (ej: "100% Vegetal", "Sin Gluten", "Cena Ligera", "Pocos Ingredientes").
      - 'prepTime': Tiempo de preparación previa (ej: "10 min").
      - 'cookTime': Tiempo de cocción real (ej: "15 min").
      - 'baseServings': Número de raciones base para las que se calculan los ingredientes (número entero, ej: 2).
      - 'infoNutricional': Objeto con desglose detallado POR RACIÓN (no total).
      - 'perfilSabor': Objeto con valores de 0 a 10 para: dulce, salado, acido, amargo, umami, picante.
      - 'ingredientsStructured': Array de objetos con 'quantity' (number), 'unit' (string, ej: 'g', 'ml', 'cdta', 'puñados'), 'item' (string, el nombre del ingrediente) y 'notes' (string, observaciones opcionales).
      - 'steps': Pasos numerados y bien explicados.
      - 'tipsCulinarios': Breve explicación de por qué usas 2 ingredientes clave.
      
      Responde siempre en ESPAÑOL.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          notaPersonal: { type: Type.STRING },
          badges: { type: Type.ARRAY, items: { type: Type.STRING } },
          prepTime: { type: Type.STRING },
          cookTime: { type: Type.STRING },
          baseServings: { type: Type.NUMBER },
          perfilSabor: {
            type: Type.OBJECT,
            properties: {
              dulce: { type: Type.NUMBER },
              salado: { type: Type.NUMBER },
              acido: { type: Type.NUMBER },
              amargo: { type: Type.NUMBER },
              umami: { type: Type.NUMBER },
              picante: { type: Type.NUMBER }
            },
            required: ["dulce", "salado", "acido", "amargo", "umami", "picante"]
          },
          infoNutricional: {
            type: Type.OBJECT,
            properties: {
              calorias: { type: Type.NUMBER },
              perfil: { type: Type.STRING },
              proteinas: { type: Type.NUMBER },
              fibra: { type: Type.NUMBER },
              carbohidratos: { type: Type.NUMBER },
              grasas: { type: Type.NUMBER },
              grasasSaturadas: { type: Type.NUMBER },
              grasasPoliinsaturadas: { type: Type.NUMBER },
              grasasMonoinsaturadas: { type: Type.NUMBER },
              sodio: { type: Type.NUMBER },
              potasio: { type: Type.NUMBER },
              azucar: { type: Type.NUMBER },
              vitaminaA: { type: Type.NUMBER },
              vitaminaC: { type: Type.NUMBER },
              calcio: { type: Type.NUMBER },
              hierro: { type: Type.NUMBER }
            },
            required: ["calorias", "perfil", "proteinas", "fibra", "carbohidratos", "grasas", "grasasSaturadas", "grasasPoliinsaturadas", "grasasMonoinsaturadas", "sodio", "potasio", "azucar", "vitaminaA", "vitaminaC", "calcio", "hierro"]
          },
          ingredientsStructured: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                item: { type: Type.STRING },
                notes: { type: Type.STRING }
              },
              required: ["quantity", "unit", "item", "notes"]
            } 
          },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          tipsCulinarios: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ingrediente: { type: Type.STRING },
                porque: { type: Type.STRING }
              }
            }
          }
        },
        required: ["title", "notaPersonal", "badges", "prepTime", "cookTime", "baseServings", "perfilSabor", "infoNutricional", "ingredientsStructured", "steps", "tipsCulinarios"]
      }
    }
  });

  const recipe: Recipe = JSON.parse(recipeResponse.text || '{}');

  const imagePrompt = `Minimalist professional food photography of: ${recipe.title}. Plated beautifully, natural soft light, high quality, neutral tones. Aesthetic of a premium food blog.`;

  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: imagePrompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  let imageUrl = "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=1000";
  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  return { recipe, imageUrl };
};

// Fix for error in App.tsx: implemented getIngredientSubstitute
export const getIngredientSubstitute = async (
  recipeTitle: string,
  ingredientName: string,
  allIngredients: string[]
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `En la receta "${recipeTitle}", ¿por qué podría sustituir el ingrediente "${ingredientName}"? 
    Teniendo en cuenta que el resto de ingredientes son: ${allIngredients.join(', ')}.`,
    config: {
      systemInstruction: `Eres un experto chef de Nómadas Gourmet. 
      Sugiere una o dos alternativas realistas y sencillas para sustituir un ingrediente específico en una receta. 
      La respuesta debe ser una frase corta y directa (máximo 15 palabras). 
      Enfócate en mantener el equilibrio de sabor y textura de la receta original.
      Idioma: Español.`,
    }
  });

  return response.text?.trim() || "Intenta con algo similar que tengas en casa.";
};
