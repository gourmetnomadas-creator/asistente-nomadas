
import React from 'react';

const SocialSection: React.FC = () => {
  const followLinks = {
    instagram: "https://www.instagram.com/nomadasgourmet/",
    tiktok: "https://www.tiktok.com/@nomadas.gourmet",
    youtube: "https://www.youtube.com/channel/UCk6Eo2h90taUUd2D_XEOtaA",
    pinterest: "https://es.pinterest.com/nomadasgourmet/",
  };

  const ActionButton = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
    <div className="flex flex-col items-center gap-2 group">
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full flex items-center justify-center border border-stone-100 bg-white shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1 group-hover:border-stone-200 text-stone-600"
        aria-label={label}
      >
        {icon}
      </a>
      <span className="text-[9px] uppercase tracking-widest font-bold text-stone-400 group-hover:text-stone-600 transition-colors">{label}</span>
    </div>
  );

  return (
    <div className="mt-24 py-20 border-t border-stone-100">
      {/* SECCIÓN: FOLLOW (Se mantiene solo la sección de seguir) */}
      <section className="text-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-3">
          <h3 className="text-xl md:text-2xl font-serif font-bold text-[#161616]">Sigue a Nómadas Gourmet</h3>
          <p className="text-stone-500 text-sm italic">Encuentra más ideas de cocina real en nuestras redes.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          <ActionButton 
            href={followLinks.instagram} 
            label="Instagram" 
            icon={<svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
          />
          <ActionButton 
            href={followLinks.tiktok} 
            label="TikTok" 
            icon={<svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.17-1.35 1.97-.02.32-.02.64.02.95.14.93.82 1.73 1.71 2.04.75.26 1.58.17 2.27-.22.69-.4 1.16-1.11 1.32-1.89.08-2.32.05-4.65.05-6.97 0-3.66.01-7.32.01-10.98z"/></svg>}
          />
          <ActionButton 
            href={followLinks.youtube} 
            label="YouTube" 
            icon={<svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
          />
          <ActionButton 
            href={followLinks.pinterest} 
            label="Pinterest" 
            icon={<svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.259 7.929-7.259 4.162 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.033-1.002 2.324-1.492 3.121 1.124.347 2.316.537 3.551.537 6.619 0 11.983-5.366 11.983-11.987C23.997 5.363 18.63 0 12.017 0z"/></svg>}
          />
        </div>
      </section>
    </div>
  );
};

export default SocialSection;
