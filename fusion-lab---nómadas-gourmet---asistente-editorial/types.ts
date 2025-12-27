
export interface NutritionalInfo {
  calorias: number;
  perfil: string;
  proteinas: number;
  fibra: number;
  carbohidratos: number;
  grasas: number;
  grasasSaturadas: number;
  grasasPoliinsaturadas: number;
  grasasMonoinsaturadas: number;
  sodio: number;
  potasio: number;
  azucar: number;
  vitaminaA: number;
  vitaminaC: number;
  calcio: number;
  hierro: number;
}

export interface TasteProfile {
  dulce: number;
  salado: number;
  acido: number;
  amargo: number;
  umami: number;
  picante: number;
}

export interface IngredientLine {
  quantity: number | null;
  unit: string;
  item: string;
  notes: string;
}

export interface CulinarioTip {
  ingrediente: string;
  porque: string;
}

export interface Recipe {
  title: string;
  description: string;
  ingredientsStructured: IngredientLine[];
  steps: string[];
  historia: string;
  infoNutricional: NutritionalInfo;
  perfilSabor: TasteProfile;
  tipsCulinarios: CulinarioTip[];
  notaPersonal: string;
  badges: string[];
  prepTime: string;
  cookTime: string;
  baseServings: number;
}

export interface FusionResult {
  recipe: Recipe;
  imageUrl: string;
}

export interface BlogPost {
  id: number;
  title: string;
  link: string;
  imageUrl: string;
  date: string;
  score?: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export type Tiempo = 'Menos de 15 min' | 'Unos 30 min' | '1 hora' | 'Cocción lenta';
export type Temporada = 'Primavera' | 'Verano' | 'Otoño' | 'Invierno';
export type Energia = 'Muy baja' | 'Normal' | 'Con energía';
export type CookingLevel = 'Principiante' | 'Amateur' | 'Experto';
export type DishType = 'Desayunos' | 'Platos' | 'Entrantes' | 'Cuchara' | 'Dulces' | 'Snacks';
export type IngredientConstraint = 'Libre' | 'Esencial (< 10)' | 'Minimalista (< 5)';
export type Preference = 'sin gluten' | 'sin soja' | 'sin frutos secos' | 'sin sésamo' | 'sin legumbres' | 'sin picante' | 'sin azúcar' | 'sin lácteos' | 'sin huevo' | 'vegano' | 'vegetariano';
