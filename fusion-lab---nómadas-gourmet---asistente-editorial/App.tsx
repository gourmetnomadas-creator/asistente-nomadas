
import React, { useState, useEffect, useRef } from 'react';
import { TIEMPOS, TEMPORADAS, LEVELS, DISH_TYPES, INGREDIENTES_FAVORITOS, EMOJIS, PREFERENCIAS, INGREDIENT_CONSTRAINTS } from './constants';
import { Tiempo, Temporada, CookingLevel, DishType, FusionResult, Review, BlogPost, Preference, TasteProfile, IngredientConstraint } from './types';
import { generateRecipeIdeas, generateEditorialRecipe, getIngredientSubstitute } from './services/geminiService';
import { fetchHumanRecipes } from './services/wordpressService';
import SocialSection from './components/SocialSection';

const formatQuantity = (num: number | null) => {
  if (num === null) return '';
  if (num === 0.5) return '1/2';
  if (num === 0.25) return '1/4';
  if (num === 0.33 || num === 0.34) return '1/3';
  if (num === 0.75) return '3/4';
  if (num % 1 === 0) return num.toString();
  if (num < 1) return num.toFixed(2).replace(/\.?0+$/, '');
  if (num < 10) return num.toFixed(1).replace(/\.?0+$/, '');
  return Math.round(num).toString();
};

const FlavorSpectrum = ({ profile }: { profile: TasteProfile }) => {
  const tastes = [
    { label: 'Dulce', value: profile.dulce },
    { label: 'Salado', value: profile.salado },
    { label: 'Ácido', value: profile.acido },
    { label: 'Amargo', value: profile.amargo },
    { label: 'Umami', value: profile.umami },
    { label: 'Picante', value: profile.picante },
  ];

  return (
    <div className="w-full space-y-4 pt-2">
      <h4 className="text-[#161616] text-[10px] font-bold uppercase tracking-widest border-b border-stone-100 pb-3">Perfil de Sabor</h4>
      <div className="space-y-3.5">
        {tastes.map((t, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <span className="w-14 text-[9px] font-bold uppercase tracking-tighter text-stone-400 group-hover:text-stone-600 transition-colors">
              {t.label}
            </span>
            <div className="flex-1 h-px bg-stone-100 relative">
              <div 
                className="absolute w-2 h-2 rounded-full bg-[#9F7459] -translate-y-1/2 shadow-[0_0_8px_rgba(159,116,89,0.4)] transition-all duration-700 ease-out"
                style={{ left: `${(t.value / 10) * 100}%` }}
              />
            </div>
            <span className="w-4 text-[8px] font-mono text-stone-300 text-right opacity-0 group-hover:opacity-100 transition-opacity">
              {t.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [dishType, setDishType] = useState<DishType>('Platos');
  const [tiempo, setTiempo] = useState<Tiempo>('Unos 30 min');
  const [temporada, setTemporada] = useState<Temporada>('Primavera');
  const [level, setLevel] = useState<CookingLevel>('Amateur');
  const [ingredientConstraint, setIngredientConstraint] = useState<IngredientConstraint>('Libre');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<Preference[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showLegals, setShowLegals] = useState(false);
  
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  // Scaling state
  const [multiplier, setMultiplier] = useState(1);
  const [showTotalNutrition, setShowTotalNutrition] = useState(false);

  // Modo Cocina (Wake Lock)
  const [isCookingModeEnabled, setIsCookingModeEnabled] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const [substitutes, setSubstitutes] = useState<Record<number, { text?: string; loading: boolean }>>({});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [emailConsent, setEmailConsent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [result, setResult] = useState<FusionResult | null>(null);
  const [humanRecipes, setHumanRecipes] = useState<BlogPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [reviews, setReviews] = useState<Review[]>([
    { id: '1', name: 'Carmen', rating: 5, comment: 'Buscaba algo ligero para cenar y esta recomendación ha sido un acierto total.', date: '2024-06-20' }
  ]);
  const [newReview, setNewReview] = useState({ name: '', comment: '', rating: 5 });

  const [mixerIngredient, setMixerIngredient] = useState<string>(INGREDIENTES_FAVORITOS[0]);
  const [mixerTime, setMixerTime] = useState<Tiempo>('Unos 30 min');

  useEffect(() => {
    setSelectedIngredients([mixerIngredient]);
  }, [mixerIngredient]);

  useEffect(() => {
    setTiempo(mixerTime);
  }, [mixerTime]);

  // Wake Lock management
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isCookingModeEnabled) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err: any) {
          console.error(`${err.name}, ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    if (isCookingModeEnabled) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCookingModeEnabled]);

  const togglePreference = (pref: Preference) => {
    setSelectedPreferences(prev => 
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const handleConsult = async () => {
    setLoadingIdeas(true);
    setError(null);
    setIdeas(null);
    setSelectedIdea(null);
    setResult(null);
    try {
      const suggestedIdeas = await generateRecipeIdeas(
        dishType, 
        tiempo, 
        temporada, 
        level, 
        [mixerIngredient], 
        customPrompt, 
        selectedPreferences,
        ingredientConstraint
      );
      setIdeas(suggestedIdeas);
    } catch (err) {
      setError("No pudimos conectar con el editor. Inténtalo de nuevo.");
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleSelectIdea = async (idea: string) => {
    setSelectedIdea(idea);
    setLoadingRecipe(true);
    setError(null);
    setHumanRecipes([]);
    setSubstitutes({});
    setMultiplier(1);
    setIsCookingModeEnabled(false); 
    try {
      const [recipeData, realRecipes] = await Promise.all([
        generateEditorialRecipe(idea, selectedPreferences, ingredientConstraint),
        fetchHumanRecipes([mixerIngredient], dishType)
      ]);
      
      setResult(recipeData);
      setHumanRecipes(realRecipes);
    } catch (err) {
      setError("Error al desarrollar la receta. Por favor, vuelve a intentarlo.");
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleToggleIngredient = async (index: number, ingredientName: string) => {
    if (!result) return;

    if (substitutes[index]) {
      const newSubs = { ...substitutes };
      delete newSubs[index];
      setSubstitutes(newSubs);
    } else {
      setSubstitutes(prev => ({ ...prev, [index]: { loading: true } }));
      
      try {
        const substituteText = await getIngredientSubstitute(
          result.recipe.title,
          ingredientName,
          result.recipe.ingredientsStructured.map(i => i.item)
        );
        setSubstitutes(prev => ({ ...prev, [index]: { text: substituteText, loading: false } }));
      } catch (err) {
        setSubstitutes(prev => ({ ...prev, [index]: { text: "Intenta con algo similar que tengas en casa.", loading: false } }));
      }
    }
  };

  const resetFlow = () => {
    setIdeas(null);
    setSelectedIdea(null);
    setResult(null);
    setSubstitutes({});
    setIsCookingModeEnabled(false);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !emailConsent) return;
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      setEmailSuccess(true);
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSuccess(false);
      }, 3000);
    }, 1500);
  };

  const shareOnSocial = (platform: 'whatsapp') => {
    const text = `¡Mira qué pintaza! Nómadas Gourmet me ha recomendado cocinar esto hoy: "${result?.recipe.title}" ✨👩‍🍳\n\nÉchale un ojo aquí:`;
    const url = window.location.href;
    const link = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(link, '_blank');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name || !newReview.comment) return;
    setReviews([{
      id: Date.now().toString(),
      ...newReview,
      date: new Date().toLocaleDateString()
    }, ...reviews]);
    setNewReview({ name: '', comment: '', rating: 5 });
  };

  const Selector = ({ title, value, options, onChange }: any) => (
    <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl flex-1 min-w-[140px]">
      <h3 className="text-[#9F7459] uppercase tracking-widest text-[9px] font-bold mb-3">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-[10px] transition-all border ${
              value === opt 
              ? 'bg-[#161616] border-[#161616] text-white font-medium shadow-sm' 
              : 'bg-white border-stone-200 text-stone-500 hover:border-[#9F7459]'
            }`}
          >
            {EMOJIS[opt]} {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[#161616] pb-24 selection:bg-[#B59171]/20 font-sans">
      <button 
        onClick={() => setShowLegals(true)}
        className="fixed top-6 left-6 z-40 bg-white/80 backdrop-blur-md border border-stone-100 px-4 py-2 rounded-full text-[#9F7459] text-[9px] uppercase tracking-[0.2em] font-bold shadow-sm hover:shadow-md transition-all active:scale-95 hidden md:block"
      >
        Información Legal y Seguridad
      </button>

      <header className="relative pt-24 pb-12 px-6 text-center max-w-4xl mx-auto">
        <p className="text-[#9F7459] font-medium tracking-[0.5em] uppercase mb-4 text-[9px]">Cuaderno Nómadas Gourmet</p>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-[#161616] leading-tight font-serif tracking-tight">Fusion Lab</h1>
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="text-stone-600 text-sm md:text-base font-light italic leading-relaxed">
            Ideas de recetas generadas con IA para explorar, inspirarte y jugar.<br/>
            No son recetas probadas por paladares humanos como las del resto del blog.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        {!ideas && !result && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col items-center justify-center mb-16 relative">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                <div className="flex flex-col items-center gap-4">
                  <span className="text-[#9F7459] uppercase tracking-[0.2em] text-[9px] font-black">ELIGE TU INGREDIENTE BASE</span>
                  <div className="relative group">
                    <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-stone-50 border-2 border-stone-100 flex items-center justify-center text-4xl md:text-6xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform duration-500">
                      {EMOJIS[mixerIngredient]}
                    </div>
                    <select 
                      value={mixerIngredient}
                      onChange={(e) => setMixerIngredient(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      {INGREDIENTES_FAVORITOS.map(ing => <option key={ing} value={ing}>{ing}</option>)}
                    </select>
                  </div>
                  <span className="text-sm font-serif font-bold text-stone-700">{mixerIngredient}</span>
                </div>

                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 font-light text-2xl">
                  +
                </div>

                <div className="flex flex-col items-center gap-4">
                  <span className="text-[#9F7459] uppercase tracking-[0.2em] text-[9px] font-black">Tiempo Disponible</span>
                  <div className="relative group">
                    <div className="w-32 h-32 md:w-44 md:h-44 rounded-full bg-stone-50 border-2 border-stone-100 flex items-center justify-center text-4xl md:text-6xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform duration-500">
                      {EMOJIS[mixerTime]}
                    </div>
                    <select 
                      value={mixerTime}
                      onChange={(e) => setMixerTime(e.target.value as Tiempo)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      {TIEMPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <span className="text-sm font-serif font-bold text-stone-700">{mixerTime}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-5xl mx-auto">
              <Selector title="Tipo de Plato" value={dishType} options={DISH_TYPES} onChange={setDishType} />
              <Selector title="Temporada" value={temporada} options={TEMPORADAS} onChange={setTemporada} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-5xl mx-auto">
              <Selector title="Nivel de Cocina" value={level} options={LEVELS} onChange={setLevel} />
              <Selector title="Modo: Cantidad Ingredientes" value={ingredientConstraint} options={INGREDIENT_CONSTRAINTS} onChange={setIngredientConstraint} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 max-w-5xl mx-auto">
              <div className="bg-stone-50 border border-stone-200 p-6 rounded-2xl">
                <h3 className="text-[#9F7459] uppercase tracking-[0.2em] text-[10px] font-black mb-4">Preferencias y Exclusiones</h3>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCIAS.map(pref => (
                    <button
                      key={pref}
                      onClick={() => togglePreference(pref)}
                      className={`px-3 py-1.5 rounded-full text-[10px] transition-all border flex items-center gap-2 ${
                        selectedPreferences.includes(pref)
                        ? 'bg-stone-800 border-stone-800 text-white font-medium'
                        : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 p-6 rounded-2xl">
                <h3 className="text-[#9F7459] uppercase tracking-[0.2em] text-[10px] font-black mb-1">Notas adicionales</h3>
                <p className="text-[10px] text-stone-500 italic mb-4 leading-snug">
                  Este es tu espacio: menciona intolerancias, preferencias o ingredientes concretos y deja volar la creatividad. Aquí mandas tú y puedes experimentar como chef.
                </p>
                <textarea
                  placeholder="¿Algún detalle más para la IA?"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-white border border-stone-200 p-4 rounded-xl text-[11px] text-[#161616] outline-none focus:border-[#B59171] transition-all h-20 placeholder:opacity-40"
                />
              </div>
            </div>

            <div className="mt-8 mb-16 text-center">
              <button 
                onClick={handleConsult}
                disabled={loadingIdeas}
                className={`
                  relative px-12 py-5 bg-[#161616] text-white rounded-full font-bold text-[10px] tracking-[0.3em] uppercase
                  transition-all duration-500 hover:bg-stone-800
                  ${loadingIdeas ? 'opacity-50 cursor-wait' : 'hover:-translate-y-1 shadow-2xl scale-110'}
                `}
              >
                {loadingIdeas ? "Mezclando sabores..." : "Explorar Fusión"}
              </button>
            </div>
          </div>
        )}

        {ideas && !selectedIdea && !loadingRecipe && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-serif font-bold text-[#161616]">Selecciona un camino</h2>
              <p className="text-stone-500 text-sm italic">Tres interpretaciones culinarias de tu mezcla.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectIdea(idea)}
                  className="bg-stone-50 border border-stone-200 p-8 rounded-[2rem] text-center group hover:bg-[#161616] hover:border-[#161616] transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col justify-center min-h-[220px]"
                >
                  <span className="text-[#9F7459] text-[9px] font-bold uppercase tracking-widest mb-4 group-hover:text-stone-400">Opción {i+1}</span>
                  <p className="text-[#161616] text-lg font-serif font-bold group-hover:text-white leading-snug">{idea}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={resetFlow}
                className="text-stone-400 text-[10px] uppercase tracking-widest font-bold border-b border-stone-200 pb-1 hover:text-[#161616] hover:border-[#161616] transition-all"
              >
                Volver al Mezclador
              </button>
            </div>
          </div>
        )}

        {loadingRecipe && (
          <div className="text-center py-32 space-y-8 animate-in fade-in duration-500">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-2 border-stone-100 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-[#9F7459] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
              <p className="text-[#9F7459] text-[10px] uppercase tracking-[0.3em] font-bold">Consolidando Fusión</p>
              <p className="text-stone-400 text-xs italic">Redactando la receta perfecta para tu momento...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center p-6 bg-stone-50 border border-stone-200 rounded-xl mb-12 text-[#9F7459] text-[11px] font-medium">
            {error}
          </div>
        )}

        {result && !loadingRecipe && (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-white border border-stone-100 rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] ring-1 ring-stone-200">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative h-[500px] lg:h-auto group overflow-hidden">
                  <img src={result.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={result.recipe.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-8 left-8 flex gap-3">
                    <button 
                      onClick={() => setShowEmailModal(true)}
                      className="p-4 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-all border border-stone-100 group"
                      title="Enviarme esta receta"
                    >
                      <svg className="w-5 h-5 fill-[#9F7459] transition-transform group-hover:rotate-12" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </button>
                    <button 
                      onClick={() => shareOnSocial('whatsapp')} 
                      className="p-4 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-all border border-stone-100"
                      title="Compartir por WhatsApp"
                    >
                      <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.395 0 .01 5.388 0 12.044c0 2.129.559 4.207 1.612 6.087L0 24l6.089-1.599a11.811 11.811 0 005.958 1.584h.007c6.654 0 12.04-5.391 12.042-12.047 0-3.224-1.256-6.255-3.536-8.53z"/></svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-10 md:p-16 flex flex-col h-full">
                  <header className="mb-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <span className="text-[#9F7459] text-[9px] font-bold uppercase tracking-[0.3em] block">Nota Editorial</span>
                      
                      {/* Modo Cocina Switch */}
                      <div className="flex items-center gap-3 bg-stone-50 px-4 py-2 rounded-full border border-stone-100">
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-bold text-[#161616] uppercase tracking-tighter">Modo Cocina</span>
                          <span className="text-[8px] text-stone-400 italic">Evita que la pantalla se apague</span>
                        </div>
                        <button
                          onClick={() => setIsCookingModeEnabled(!isCookingModeEnabled)}
                          className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isCookingModeEnabled ? 'bg-[#9F7459]' : 'bg-stone-200'}`}
                          aria-label="Activar modo cocina"
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${isCookingModeEnabled ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-[#161616] mb-6 leading-tight font-serif tracking-tight">{result.recipe.title}</h2>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {result.recipe.badges.map((badge, i) => (
                        <span key={i} className="px-3 py-1 bg-stone-100 text-stone-500 text-[9px] font-bold uppercase tracking-widest rounded-full">{badge}</span>
                      ))}
                    </div>

                    <div className="p-8 bg-stone-50 rounded-2xl border-l-2 border-[#9F7459] mb-8">
                      <p className="text-[#333333] text-[15px] leading-relaxed font-light italic">
                        "{result.recipe.notaPersonal}"
                      </p>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-14 mb-14">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                        <h4 className="text-[#161616] text-[10px] font-bold uppercase tracking-widest">Ingredientes</h4>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold uppercase text-stone-400">Escalar</span>
                          <div className="flex bg-stone-50 rounded-lg p-1">
                            {[1, 2, 3].map(m => (
                              <button
                                key={m}
                                onClick={() => setMultiplier(m)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${multiplier === m ? 'bg-[#161616] text-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                              >
                                {m}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* CTA Message for Ingredient Substitution */}
                      <div className="bg-[#F9F8F6] border-l-2 border-[#D8C19F] p-3 rounded-r-xl animate-in fade-in duration-700">
                        <p className="text-[10px] text-[#161616] font-bold uppercase tracking-tight mb-0.5">¿Te falta algún ingrediente?</p>
                        <p className="text-[11px] text-stone-500 italic leading-snug">Toca el que no tienes y te mostramos alternativas.</p>
                      </div>

                      <div className="bg-stone-50/50 px-4 py-2 rounded-xl flex justify-between items-center mb-4">
                        <span className="text-[10px] text-stone-400 font-medium">Raciones finales:</span>
                        <span className="text-xs font-serif font-bold text-[#9F7459]">{result.recipe.baseServings * multiplier} raciones</span>
                      </div>

                      <ul className="space-y-4">
                        {result.recipe.ingredientsStructured.map((ing, i) => (
                          <li key={i} className="flex flex-col gap-1.5">
                            <button 
                              onClick={() => handleToggleIngredient(i, ing.item)}
                              className={`text-[13px] text-left transition-all duration-300 flex items-start gap-3 group ${substitutes[i] ? 'opacity-40 line-through' : 'text-stone-600 hover:text-[#9F7459]'}`}
                            >
                              <span className="text-[#828C76] mt-1.5 text-[6px] group-hover:scale-150 transition-transform">●</span> 
                              <span>
                                <span className="font-bold mr-1">
                                  {ing.quantity ? formatQuantity(ing.quantity * multiplier) : ''}
                                  {ing.unit ? ` ${ing.unit}` : ''}
                                </span> 
                                {ing.item}
                                {ing.notes ? <span className="text-[11px] italic opacity-60 ml-1">({ing.notes})</span> : ''}
                              </span>
                            </button>
                            {substitutes[i] && (
                              <div className="ml-6 animate-in slide-in-from-left-2 duration-500">
                                {substitutes[i].loading ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-[#9F7459]/20 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] text-stone-400 italic">Buscando sustituto...</span>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#9F7459] font-medium leading-relaxed">
                                    <span className="mr-1.5">✨</span> {substitutes[i].text}
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <h4 className="text-[#161616] text-[10px] font-bold uppercase tracking-widest border-b border-stone-100 pb-3">Logística y Despensa</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-stone-50 rounded-xl text-center">
                            <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Preparación</p>
                            <p className="text-xl font-serif font-bold text-[#161616]">{result.recipe.prepTime}</p>
                          </div>
                          <div className="p-4 bg-stone-50 rounded-xl text-center">
                            <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Cocción</p>
                            <p className="text-xl font-serif font-bold text-[#161616]">{result.recipe.cookTime}</p>
                          </div>
                          <div className="p-4 bg-stone-50 rounded-xl text-center">
                            <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">Raciones</p>
                            <p className="text-xl font-serif font-bold text-[#161616]">{result.recipe.baseServings * multiplier}</p>
                          </div>
                          <div className="p-4 bg-stone-800 rounded-xl text-center text-white">
                            <p className="text-[9px] uppercase tracking-widest text-stone-300 font-bold mb-1">Ingredientes</p>
                            <p className="text-xl font-serif font-bold">{result.recipe.ingredientsStructured.length}</p>
                            <p className="text-[8px] uppercase tracking-tighter opacity-60">Modo {ingredientConstraint.split(' ')[0]}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                          <h4 className="text-[#161616] text-[10px] font-bold uppercase tracking-widest">Información Nutricional</h4>
                          <button 
                            onClick={() => setShowTotalNutrition(!showTotalNutrition)}
                            className="text-[9px] font-bold uppercase text-[#9F7459] hover:underline"
                          >
                            Ver {showTotalNutrition ? 'por ración' : 'total receta'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { label: 'Calorías', val: result.recipe.infoNutricional.calorias, unit: 'kcal' },
                            { label: 'Proteínas', val: result.recipe.infoNutricional.proteinas, unit: 'g' },
                            { label: 'Fibra', val: result.recipe.infoNutricional.fibra, unit: 'g' },
                            { label: 'Carbos', val: result.recipe.infoNutricional.carbohidratos, unit: 'g' },
                            { label: 'Grasas', val: result.recipe.infoNutricional.grasas, unit: 'g' }
                          ].map((macro, idx) => (
                            <div key={idx} className="p-4 bg-stone-50 rounded-xl text-center transition-all">
                              <p className="text-[9px] uppercase tracking-widest text-stone-400 font-bold mb-1">{macro.label}</p>
                              <p className="text-xl font-serif font-bold text-[#161616]">
                                {showTotalNutrition 
                                  ? Math.round(macro.val * result.recipe.baseServings * multiplier) 
                                  : macro.val
                                }
                                <span className="text-[10px] font-sans ml-0.5 opacity-60">{macro.unit}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] text-stone-400 italic text-right">
                          * Mostrando valores {showTotalNutrition ? `para ${result.recipe.baseServings * multiplier} raciones` : 'por ración individual'}
                        </p>
                      </div>

                      <FlavorSpectrum profile={result.recipe.perfilSabor} />
                    </div>
                  </div>

                  <div className="mb-14 space-y-6">
                    <h4 className="text-[#161616] text-[10px] font-bold uppercase tracking-widest border-b border-stone-100 pb-3">El porqué culinario</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.recipe.tipsCulinarios.map((tip, i) => (
                        <div key={i} className="bg-stone-50/50 p-5 rounded-xl border border-stone-100">
                          <span className="text-[#9F7459] text-[11px] font-bold block mb-1.5">{tip.ingrediente}</span>
                          <p className="text-stone-500 text-[12px] leading-relaxed italic">{tip.porque}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <h4 className="text-[#161616] text-[10px] font-bold uppercase tracking-widest border-b border-stone-100 pb-6 mb-10 text-center">Instrucciones paso a paso</h4>
                    <div className="space-y-10">
                      {result.recipe.steps.map((step, i) => (
                        <div key={i} className="flex gap-8 group">
                          <span className="text-[#D8C19F] font-serif text-4xl italic opacity-40 group-hover:opacity-100 transition-all duration-700 leading-none">{i+1}</span>
                          <p className="text-stone-600 text-[14px] leading-relaxed pt-1.5 font-light">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-16 flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={resetFlow}
                      className="px-8 py-4 bg-white border border-stone-200 rounded-full text-stone-400 text-[11px] font-bold uppercase tracking-widest hover:text-[#161616] hover:border-[#161616] transition-all"
                    >
                      Nueva búsqueda
                    </button>
                    <button 
                      onClick={() => setShowEmailModal(true)}
                      className="px-8 py-4 bg-stone-100 text-stone-700 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-stone-200 transition-all flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                      Email
                    </button>
                    <button 
                      onClick={() => shareOnSocial('whatsapp')}
                      className="px-8 py-4 bg-[#25D366] text-white rounded-full text-[11px] font-bold uppercase tracking-widest hover:brightness-95 transition-all flex items-center gap-3 shadow-lg shadow-green-200"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.395 0 .01 5.388 0 12.044c0 2.129.559 4.207 1.612 6.087L0 24l6.089-1.599a11.811 11.811 0 005.958 1.584h.007c6.654 0 12.04-5.391 12.042-12.047 0-3.224-1.256-6.255-3.536-8.53z"/>
                      </svg>
                      Compartir en WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {humanRecipes.length > 0 && (
              <section className="space-y-12 py-12">
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-serif font-bold text-[#161616]">Recetas probadas de Nómadas Gourmet</h3>
                  <p className="text-stone-500 text-sm italic">Basadas en tu selección: {mixerIngredient}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {humanRecipes.map(post => (
                    <a 
                      key={post.id} 
                      href={post.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group bg-stone-50 border border-stone-100 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all duration-500 flex flex-col"
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img src={post.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={post.title} />
                        <div className="absolute inset-0 bg-[#161616]/5 group-hover:bg-transparent transition-colors" />
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest text-[#9F7459] shadow-sm">
                            Real Blog
                          </span>
                        </div>
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                        <span className="text-[#9F7459] text-[9px] font-bold uppercase tracking-widest block mb-3">{post.date}</span>
                        <h4 className="text-lg font-serif font-bold text-[#161616] leading-tight group-hover:text-[#9F7459] transition-colors mb-6" dangerouslySetInnerHTML={{ __html: post.title }} />
                        <div className="mt-auto">
                          <span className="inline-block text-[10px] uppercase tracking-widest font-bold border-b border-[#9F7459] pb-1">Ver receta probada</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-stone-50 p-12 md:p-16 rounded-[3rem] border border-stone-100">
              <h2 className="text-3xl font-bold mb-14 text-[#161616] font-serif text-center">Notas del diario</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <form onSubmit={handleAddReview} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">Tu firma</label>
                    <input 
                      type="text" placeholder="Escribe tu nombre..." 
                      className="w-full bg-white border border-stone-200 p-4 rounded-xl text-xs text-[#161616] focus:border-[#B59171] outline-none transition-all"
                      value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">¿Cómo fue tu momento?</label>
                    <textarea 
                      placeholder="Comparte tu experiencia..." 
                      className="w-full bg-white border border-stone-200 p-4 rounded-xl text-xs text-[#161616] h-32 outline-none focus:border-[#B59171] transition-all"
                      value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="w-full bg-[#161616] text-white font-bold py-5 rounded-xl hover:bg-stone-800 transition-all text-[11px] uppercase tracking-[0.2em]">Guardar nota</button>
                </form>
                <div className="lg:col-span-2 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-6">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-white border border-stone-100 p-10 rounded-[2rem] shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-[#161616] text-base font-serif">{r.name}</span>
                        <div className="text-[#B59171] text-xs">{'★'.repeat(r.rating)}</div>
                      </div>
                      <p className="text-stone-500 text-[14px] italic leading-relaxed font-light">"{r.comment}"</p>
                      <div className="mt-5 pt-5 border-t border-stone-50 text-[9px] uppercase tracking-widest text-stone-300">{r.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            
            <SocialSection />
          </div>
        )}
      </main>

      <footer className="mt-32 border-t border-stone-100 py-24 text-center max-w-4xl mx-auto px-6">
        <div className="mb-8 max-w-2xl mx-auto">
          <p className="text-stone-400 text-[11px] leading-relaxed italic">
            Este experimento es realizado con IA para jugar, sugerir y experimentar. 
            Estas no son recetas probadas por nosotros como las que se encuentran en el resto del Blog.
          </p>
        </div>

        <button 
          onClick={() => setShowLegals(true)}
          className="text-[#9F7459] text-[10px] uppercase tracking-[0.3em] font-bold mb-10 hover:underline decoration-1 underline-offset-4"
        >
          Información Legal y Seguridad
        </button>

        <p className="text-stone-400 text-[9px] tracking-[0.8em] uppercase font-black">
          Nómadas Gourmet © 2026
        </p>
      </footer>

      {showEmailModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowEmailModal(false)} />
          <div className="relative bg-white w-full max-w-lg p-10 md:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <button 
              onClick={() => setShowEmailModal(false)}
              className="absolute top-6 right-6 text-stone-300 hover:text-[#161616] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {!emailSuccess ? (
              <form onSubmit={handleSendEmail} className="space-y-8">
                <header className="text-center space-y-3">
                  <h2 className="text-3xl font-serif font-bold text-[#161616] tracking-tight">¿A dónde te la enviamos?</h2>
                  <p className="text-stone-400 text-[13px] italic">Te la mandamos para que la tengas a mano. Sin spam.</p>
                </header>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-stone-400">Tu correo electrónico</label>
                    <input 
                      type="email" 
                      required
                      placeholder="ejemplo@correo.com" 
                      className="w-full bg-stone-50 border border-stone-200 p-4 rounded-xl text-sm text-[#161616] focus:border-[#9F7459] focus:bg-white outline-none transition-all placeholder:text-stone-300"
                      value={userEmail} 
                      onChange={e => setUserEmail(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-4 items-start">
                    <input 
                      type="checkbox" 
                      id="consent" 
                      required
                      className="mt-1 w-4 h-4 accent-[#9F7459]" 
                      checked={emailConsent}
                      onChange={e => setEmailConsent(e.target.checked)}
                    />
                    <label htmlFor="consent" className="text-[11px] text-stone-500 leading-relaxed cursor-pointer select-none">
                      Quiero recibir esta receta y acepto recibir correos de Nómadas Gourmet. 
                      <span className="block mt-1 opacity-60">Puedes darte de baja cuando quieras.</span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={emailSending || !emailConsent || !userEmail}
                  className={`
                    w-full py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] transition-all duration-500
                    ${emailSending || !emailConsent || !userEmail ? 'bg-stone-100 text-stone-300' : 'bg-[#161616] text-white hover:bg-stone-800 shadow-xl hover:-translate-y-1'}
                  `}
                >
                  {emailSending ? "Preparando envío..." : "Enviar receta"}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6 py-8 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#F5F1EE] rounded-full flex items-center justify-center mx-auto text-[#9F7459]">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-serif font-bold text-[#161616]">¡Receta enviada!</h3>
                  <p className="text-stone-500 text-sm italic">Revisa tu bandeja de entrada en unos minutos.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showLegals && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setShowLegals(false)} />
          <div className="relative bg-white w-full max-w-2xl p-10 md:p-14 rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowLegals(false)}
              className="absolute top-8 right-8 text-stone-300 hover:text-[#161616] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="space-y-8">
              <header className="text-center">
                <h2 className="text-3xl font-serif font-bold text-[#161616] mb-4 tracking-tight">Aviso de Experimento</h2>
                <div className="h-0.5 w-12 bg-[#9F7459] mx-auto" />
              </header>
              
              <div className="space-y-6 text-stone-600 text-[14px] leading-relaxed">
                <p>
                  Este asistente es un experimento creativo desarrollado con la ayuda de <strong>Inteligencia Artificial (Google Gemini)</strong>. Su propósito es inspirarte y ofrecerte ideas culinarias basadas en el estilo editorial de Nómadas Gourmet.
                </p>

                <div className="p-6 bg-stone-50 border-l-2 border-[#9F7459] rounded-r-xl">
                  <h4 className="font-bold text-[#161616] text-xs uppercase tracking-widest mb-3">⚠️ Advertencia Importante</h4>
                  <p>
                    A diferencia del contenido habitual de nuestro blog, <strong>las recetas generadas por este asistente no han sido probadas ni desarrolladas en nuestras cocinas por chefs o especialistas.</strong> Son sugerencias automatizadas basadas en IA.
                  </p>
                </div>

                <p>
                  Te pedimos que utilices tu mejor juicio al cocinar. Siempre prioriza la <strong>seguridad alimentaria</strong>: asegúrate de que los ingredientes estén en buen estado, que las temperaturas de cocción sean las adecuadas y ten precaución con posibles alergias o intolerancias.
                </p>

                <p>
                  Este experimento utiliza el modelo <strong>Gemini 3 Flash</strong> para la generación de texto y el modelo <strong>Gemini 2.5 Flash Image</strong> para la creación de las fotografías. Las imágenes no representan platos cocinados reales, son representaciones artísticas generadas por IA.
                </p>

                <p className="pt-4 border-t border-stone-100 text-[12px] italic text-stone-400">
                  Creado como parte de Nómadas Gourmet Lab. Explora, juega y cocina con conciencia.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        
        body { background-color: #FFFFFF; color: #161616; -webkit-font-smoothing: antialiased; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #F3F4F6; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #E5E7EB; }
        
        .font-serif { font-family: 'Playfair Display', serif; }

        select {
          appearance: none;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          font-family: inherit;
          font-size: inherit;
          cursor: inherit;
          line-height: inherit;
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default App;
