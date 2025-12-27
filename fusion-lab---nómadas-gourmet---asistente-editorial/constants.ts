
import { Tiempo, Temporada, Energia, CookingLevel, Preference, DishType, IngredientConstraint } from './types';

export const TIEMPOS: Tiempo[] = [
  'Menos de 15 min', 'Unos 30 min', '1 hora', 'Cocción lenta'
];

export const TEMPORADAS: Temporada[] = [
  'Primavera', 'Verano', 'Otoño', 'Invierno'
];

export const ENERGIAS: Energia[] = [
  'Muy baja', 'Normal', 'Con energía'
];

export const LEVELS: CookingLevel[] = [
  'Principiante', 'Amateur', 'Experto'
];

export const DISH_TYPES: DishType[] = [
  'Desayunos', 'Platos', 'Entrantes', 'Cuchara', 'Dulces', 'Snacks'
];

export const INGREDIENT_CONSTRAINTS: IngredientConstraint[] = [
  'Libre', 'Esencial (< 10)', 'Minimalista (< 5)'
];

export const PREFERENCIAS: Preference[] = [
  'sin gluten', 'sin soja', 'sin frutos secos', 'sin sésamo', 'sin legumbres', 'sin picante', 'sin azúcar', 'sin lácteos', 'sin huevo', 'vegano', 'vegetariano'
];

export const INGREDIENTES_FAVORITOS = [
  'Garbanzos', 'Lentejas', 'Alubias', 'Arroz', 'Patatas', 'Cebolla', 'Zanahoria', 
  'Tomate', 'Calabaza', 'Berenjena', 'Calabacín', 'Pimiento', 'Setas', 'Espinacas', 'Tofu'
];

export const EMOJIS: Record<string, string> = {
  'Menos de 15 min': '⚡',
  'Unos 30 min': '⏱️',
  '1 hora': '🍳',
  'Cocción lenta': '🥘',
  'Primavera': '🌸',
  'Verano': '☀️',
  'Otoño': '🍂',
  'Invierno': '❄️',
  'Muy baja': '🪫',
  'Normal': '🔋',
  'Con energía': '🔥',
  'Principiante': '🐣',
  'Amateur': '🔪',
  'Experto': '👨‍🍳',
  'Desayunos': '🍳',
  'Platos': '🍽️',
  'Entrantes': '🥗',
  'Cuchara': '🍲',
  'Dulces': '🍰',
  'Snacks': '🥨',
  'Libre': '🎨',
  'Esencial (< 10)': '🧺',
  'Minimalista (< 5)': '⚖️',
  'Garbanzos': '🫘',
  'Lentejas': '🥣',
  'Alubias': '⚪',
  'Arroz': '🍚',
  'Patatas': '🥔',
  'Cebolla': '🧅',
  'Zanahoria': '🥕',
  'Tomate': '🍅',
  'Calabaza': '🎃',
  'Berenjena': '🍆',
  'Calabacín': '🥒',
  'Pimiento': '🫑',
  'Setas': '🍄',
  'Espinacas': '🌿',
  'Tofu': '⬜',
  'Puerros': '🌱',
  'Batata': '🍠',
  'Coliflor': '⚪',
  'Quinoa': '🌾',
  'sin gluten': '🌾🚫',
  'sin soja': '🥢🚫',
  'sin frutos secos': '🥜🚫',
  'sin sésamo': '🥯🚫',
  'sin legumbres': '🫘🚫',
  'sin picante': '🌶️🚫',
  'sin azúcar': '🍭🚫',
  'sin lácteos': '🥛🚫',
  'sin huevo': '🥚🚫',
  'vegano': '🌱',
  'vegetariano': '🥗'
};
