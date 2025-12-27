
import { BlogPost, DishType } from "../types";

const WP_API_BASE = "https://nomadasgourmet.com/wp-json/wp/v2/posts";
const WP_CAT_API = "https://nomadasgourmet.com/wp-json/wp/v2/categories";

const SINONIMOS: Record<string, string[]> = {
  'Garbanzos': ['garbanzo', 'garbanzos', 'hummus'],
  'Lentejas': ['lenteja', 'lentejas'],
  'Alubias': ['alubias', 'judías', 'frijoles', 'porotos', 'habichuelas', 'alubia'],
  'Arroz': ['arroz'],
  'Patatas': ['patata', 'patatas', 'papa', 'papas'],
  'Cebolla': ['cebolla'],
  'Zanahoria': ['zanahoria'],
  'Tomate': ['tomate'],
  'Calabaza': ['calabaza', 'zapallo', 'auyama'],
  'Berenjena': ['berenjena'],
  'Calabacín': ['calabacín', 'zucchini'],
  'Pimiento': ['pimiento', 'morrón'],
  'Setas': ['setas', 'champiñones', 'hongos'],
  'Espinacas': ['espinaca', 'espinacas'],
  'Tofu': ['tofu'],
  'Puerros': ['puerro', 'puerros'],
  'Batata': ['batata', 'boniato', 'camote'],
  'Coliflor': ['coliflor'],
  'Quinoa': ['quinoa']
};

const DISH_TYPE_TO_SLUGS: Record<string, string[]> = {
  'Desayunos': ['desayunos'],
  'Platos': ['plato-principal', 'almuerzos-veganos'],
  'Entrantes': ['aperitivos', 'guarniciones', 'dips-y-untables'],
  'Cuchara': ['sopas'],
  'Dulces': ['postres'],
  'Snacks': ['snacks', 'meriendas', 'aperitivos']
};

// Cache para evitar peticiones repetidas a las categorías
const categoryIdCache: Record<string, number> = {};

const getCategoryIdsBySlugs = async (slugs: string[]): Promise<number[]> => {
  const ids: number[] = [];
  const slugsToFetch = slugs.filter(slug => !categoryIdCache[slug]);

  if (slugsToFetch.length > 0) {
    try {
      const response = await fetch(`${WP_CAT_API}?slug=${slugsToFetch.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        data.forEach((cat: any) => {
          categoryIdCache[cat.slug] = cat.id;
        });
      }
    } catch (error) {
      console.error("Error fetching category IDs:", error);
    }
  }

  slugs.forEach(slug => {
    if (categoryIdCache[slug]) ids.push(categoryIdCache[slug]);
  });

  return ids;
};

export const fetchHumanRecipes = async (selectedIngredients: string[], dishType: DishType): Promise<BlogPost[]> => {
  const slugs = DISH_TYPE_TO_SLUGS[dishType] || [];
  const categoryIds = await getCategoryIdsBySlugs(slugs);
  
  const mainIngredient = selectedIngredients.length > 0 ? selectedIngredients[0] : null;
  const termsToSearch = mainIngredient ? (SINONIMOS[mainIngredient] || [mainIngredient.toLowerCase()]) : [];
  const searchTerm = termsToSearch.length > 0 ? termsToSearch[0] : "";

  try {
    // Construimos la URL con categorías si existen
    let url = `${WP_API_BASE}?per_page=12&_embed=1`;
    if (categoryIds.length > 0) {
      url += `&categories=${categoryIds.join(',')}`;
    }
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await fetch(url);
    if (!response.ok) return fetchFallbacks(categoryIds);
    
    const data = await response.json();

    const scoredPosts = data.map((post: any) => {
      let score = 0;
      const title = (post.title?.rendered || "").toLowerCase();
      const excerpt = (post.excerpt?.rendered || "").toLowerCase();
      const content = (post.content?.rendered || "").toLowerCase();
      const postCategoryIds = post.categories || [];

      // Relevancia por Ingrediente
      if (termsToSearch.length > 0) {
        termsToSearch.forEach(term => {
          if (title.includes(term)) score += 5;
          if (excerpt.includes(term)) score += 3;
          if (content.includes(term)) score += 2;
        });
      } else {
        // Si no hay ingrediente, puntuamos por fecha/reciente
        score += 1;
      }

      // Relevancia por Tipo de Plato (Bonus si pertenece a la categoría exacta buscada)
      const hasCatMatch = categoryIds.some(id => postCategoryIds.includes(id));
      if (hasCatMatch) score += 4;

      // Bonus por estructura de receta
      if (content.includes("ingredientes") || content.includes("preparación") || content.includes("instrucciones")) score += 5;
      
      // Filtros específicos para Dulces
      if (dishType === 'Dulces') {
        const sweetTerms = ["tarta", "bizcocho", "galletas", "brownie", "helado", "mousse", "pudding", "crema", "postre", "dulce", "chocolate"];
        if (sweetTerms.some(term => title.includes(term))) score += 4;
        // Penalizar si parece salado en dulces
        const saltyTerms = ["ajo", "cebolla", "pimiento", "salado", "guiso", "potaje"];
        if (saltyTerms.some(term => title.includes(term) && !title.includes("chocolate"))) score -= 5;
      }

      // Penalización por posts informativos
      if (title.includes("qué es") || title.includes("beneficios") || title.includes("propiedades") || title.includes("guía")) score -= 5;
      
      return {
        id: post.id,
        title: post.title.rendered,
        link: post.link,
        imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=400",
        date: new Date(post.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        score
      };
    });

    const results = scoredPosts
      .filter((p: any) => p.score > 1) 
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    if (results.length === 0) return fetchFallbacks(categoryIds);
    return results;

  } catch (error) {
    console.error("Error fetching WP recipes:", error);
    return fetchFallbacks(categoryIds);
  }
};

const fetchFallbacks = async (categoryIds: number[]): Promise<BlogPost[]> => {
  try {
    let url = `${WP_API_BASE}?per_page=3&_embed=1&orderby=date`;
    if (categoryIds.length > 0) {
      url += `&categories=${categoryIds.join(',')}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((post: any) => ({
      id: post.id,
      title: post.title.rendered,
      link: post.link,
      imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || "https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=400",
      date: new Date(post.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    }));
  } catch {
    return [];
  }
};
