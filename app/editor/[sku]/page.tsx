"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// --- TYPES ---
interface Zone {
  id: number | string;
  type: "text" | "image" | "emoji";
  contentType: "dynamic" | "static";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  maxChars?: number;
  emoji?: string;
  emojiSize?: number;
}

interface Slide {
  background_url: string | null;
  dynamic_zones: Zone[];
  static_zones: Zone[];
}

interface ProductData {
  id: number;
  sku: string;
  title: string;
  canvas_settings: { width: number; height: number };
  design_data: {
    slides: {
      front: Slide;
      back: Slide;
      left_inner: Slide;
      right_inner: Slide;
    };
  };
}

// --- CONSTANTS: HANDWRITING FONTS ---
const HANDWRITING_FONTS = [
    { name: 'Standard', family: '' }, // Uses Admin Font
    { name: 'Caveat', family: 'Caveat' },
    { name: 'Indie Flower', family: 'Indie Flower' },
    { name: 'Patrick Hand', family: 'Patrick Hand' },
    { name: 'Homemade Apple', family: 'Homemade Apple' },
];

const INK_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Blue Pen', value: '#1a237e' },
    { name: 'Red Pen', value: '#b71c1c' },
    { name: 'Green Pen', value: '#1b5e20' },
];

// --- 1. PROTECTED IMAGE ---
const ProtectedImage = ({ url }: { url: string | null }) => {
  if (!url) return null;
  return (
    <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <div className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${url}')` }} />
    </div>
  );
};

// --- 2. AUTO-FIT TEXT ZONE (With Handwriting & Style Overrides) ---
const AutoFitTextZone = ({ 
    zone, value, onChange, onFocus, userStyle 
}: { 
    zone: Zone; value: string; onChange: (val: string) => void; onFocus: () => void; 
    userStyle?: { fontFamily?: string, color?: string } 
}) => {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState(zone.fontSize || 32);
  const [isFocused, setIsFocused] = useState(false);

  const isBigZone = zone.height > 200;
  const verticalAlign = isBigZone ? 'flex-start' : 'center';

  // Determine Font & Color (User Override > Admin Default)
  const activeFont = userStyle?.fontFamily || (zone.fontFamily ? zone.fontFamily.replace(/['"]/g, "").split(",")[0] : "Arial");
  const activeColor = userStyle?.color || zone.color || "#000";

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.fontSize = `${zone.fontSize}px`;
    el.style.height = 'auto'; 
    let size = zone.fontSize || 32;
    const minSize = 10; 
    while ((el.scrollHeight > zone.height || el.scrollWidth > zone.width) && size > minSize) {
      size--;
      el.style.fontSize = `${size}px`;
    }
    setCurrentFontSize(size);
  }, [value, zone.width, zone.height, zone.fontSize, activeFont]); // Re-calc if font changes

  const textAlign = zone.textAlign || (isBigZone ? 'left' : 'center');
  let alignItems = 'center'; 
  if (textAlign === 'left') alignItems = 'flex-start';
  if (textAlign === 'right') alignItems = 'flex-end';

  return (
    <div
      style={{
        position: "absolute", left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`,
        transform: `rotate(${zone.rotation}deg)`, zIndex: 20,
        backgroundColor: zone.backgroundColor && zone.backgroundColor !== "transparent" ? zone.backgroundColor : "rgba(255, 255, 255, 0.01)", 
        display: 'flex', flexDirection: 'column', justifyContent: verticalAlign, alignItems: alignItems, 
        padding: isBigZone ? '20px' : '0px', overflow: 'hidden'       
      }}
      className={`group cursor-text transition-all duration-200 ${isFocused ? "border-2 border-blue-500/50 ring-4 ring-blue-500/10" : "border-2 border-dashed border-blue-300/60 hover:border-blue-500"}`}
      onClick={() => { textRef.current?.focus(); }}
    >
      <div className={`absolute -top-3 -left-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-30 pointer-events-none transition-opacity duration-200 ${isFocused || value.length > 0 ? 'opacity-0' : 'opacity-100'}`}>T</div>
      
      <textarea
        ref={textRef} value={value} rows={isBigZone ? 4 : 1}
        onFocus={() => { setIsFocused(true); onFocus(); }} 
        onBlur={() => setIsFocused(false)}
        spellCheck={true} // ✅ UX POLISH: Spell check enabled
        onChange={(e) => { if (zone.maxChars && e.target.value.length > zone.maxChars) return; onChange(e.target.value); }}
        placeholder={zone.text || "Click to type"}
        className="resize-none outline-none bg-transparent p-1 w-full"
        style={{
          fontFamily: activeFont, 
          fontSize: `${currentFontSize}px`, 
          fontWeight: (zone.fontWeight as any) || "normal",
          color: activeColor, 
          textAlign: textAlign, 
          lineHeight: 1.2,
          height: isBigZone ? '100%' : 'auto', 
          maxHeight: '100%', 
          whiteSpace: 'pre-wrap', 
        }}
      />
      <div className={`absolute -bottom-6 right-0 bg-black text-white text-[10px] px-1 rounded transition-opacity duration-200 pointer-events-none z-50 ${isFocused ? 'opacity-100' : 'opacity-0'}`}>{value.length} / {zone.maxChars}</div>
    </div>
  );
};

// --- 3. PAGE CONTENT ---
const PageContent = ({ slide, userInputs, setUserInputs, userStyles, activeZoneId, setActiveZoneId }: any) => (
    <>
        <ProtectedImage url={slide.background_url} />
        {slide.static_zones?.map((zone: Zone) => (
            <div key={zone.id} style={{ position: "absolute", left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`, transform: `rotate(${zone.rotation}deg)`, fontSize: `${(zone.fontSize || zone.height) * 0.8}px`, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
                {zone.type === 'emoji' ? zone.emoji : ''}
            </div>
        ))}
        {slide.dynamic_zones.map((zone: Zone) => (
            <AutoFitTextZone 
                key={zone.id} 
                zone={zone} 
                value={userInputs[String(zone.id)] || ""} 
                userStyle={userStyles[String(zone.id)]}
                onChange={(val) => setUserInputs((prev: any) => ({...prev, [String(zone.id)]: val}))} 
                onFocus={() => setActiveZoneId(String(zone.id))}
            />
        ))}
    </>
);

// --- 4. TOOLBAR COMPONENT (New Feature) ---
const FloatingToolbar = ({ activeZoneId, userStyles, setUserStyles }: any) => {
    if (!activeZoneId) return null;

    const currentStyle = userStyles[activeZoneId] || {};

    const handleStyleChange = (key: string, value: string) => {
        setUserStyles((prev: any) => ({
            ...prev,
            [activeZoneId]: { ...prev[activeZoneId], [key]: value }
        }));
    };

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-800 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-6 z-[100] border border-zinc-200 dark:border-zinc-700 animate-slide-up">
            {/* Font Picker */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Handwriting</span>
                <select 
                    className="bg-zinc-100 dark:bg-zinc-700 text-sm rounded px-2 py-1 outline-none border-none focus:ring-2 ring-blue-500"
                    value={currentStyle.fontFamily || ''}
                    onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                >
                    {HANDWRITING_FONTS.map(f => (
                        <option key={f.name} value={f.family} style={{ fontFamily: f.family || 'inherit' }}>{f.name}</option>
                    ))}
                </select>
            </div>

            <div className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-600"></div>

            {/* Color Picker */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ink Color</span>
                <div className="flex gap-2">
                    {INK_COLORS.map(c => (
                        <button
                            key={c.name}
                            onClick={() => handleStyleChange('color', c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${currentStyle.color === c.value ? 'border-blue-500 scale-110' : 'border-transparent hover:scale-110'}`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- 5. LOADING SCREEN ---
const LoadingScreen = () => (
    <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-[9999] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-zinc-800 dark:text-white animate-pulse">Setting up Studio...</h2>
        <p className="text-sm text-zinc-500 mt-2">Loading fonts & assets</p>
    </div>
);


export default function EditorPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductData | null>(null);
  
  // STATE
  const [loading, setLoading] = useState(true); // Initial Load
  const [viewState, setViewState] = useState<'front' | 'inner' | 'back'>('front');
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [userStyles, setUserStyles] = useState<Record<string, { fontFamily?: string, color?: string }>>({});
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. FETCH DATA & RESTORE DRAFT
  useEffect(() => {
    if (!params.sku) return;

    // Simulate 3-sec loading for UX
    const timer = setTimeout(() => {
        fetch(`http://127.0.0.1:8000/api/products/${params.sku}`)
        .then((res) => res.json())
        .then((data) => {
            setProduct(data);
            
            // 💾 RESTORE DRAFT FROM LOCAL STORAGE
            const savedDraft = localStorage.getItem(`draft_${params.sku}`);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                setUserInputs(parsed.inputs || {});
                setUserStyles(parsed.styles || {});
            }
            
            setLoading(false);
        });
    }, 2000); // 2 Seconds forced wait

    return () => clearTimeout(timer);
  }, [params.sku]);

  // 2. AUTO-SAVE DRAFT
  useEffect(() => {
      if (product && !loading) {
          localStorage.setItem(`draft_${params.sku}`, JSON.stringify({
              inputs: userInputs,
              styles: userStyles
          }));
      }
  }, [userInputs, userStyles, product, loading, params.sku]);

  // 3. LOAD FONTS (Standard + Handwriting)
  useEffect(() => {
    if (!product) return;
    
    // Load Admin Fonts
    const slides = product.design_data?.slides;
    const allZones = [...slides.front.dynamic_zones, ...slides.left_inner.dynamic_zones, ...slides.right_inner.dynamic_zones, ...slides.back.dynamic_zones];
    allZones.forEach((zone) => {
      if (zone.fontFamily) loadGoogleFont(zone.fontFamily);
    });

    // Load Handwriting Fonts
    HANDWRITING_FONTS.forEach(f => { if(f.family) loadGoogleFont(f.family); });

  }, [product]);

  const loadGoogleFont = (fontName: string) => {
      const cleanFont = fontName.replace(/['"]/g, "").split(",")[0].trim();
      const link = document.createElement("link");
      link.href = `https://fonts.googleapis.com/css2?family=${cleanFont.replace(/ /g, "+")}&display=swap`;
      link.rel = "stylesheet";
      if (!document.querySelector(`link[href="${link.href}"]`)) document.head.appendChild(link);
  };

  // 4. RESIZE LOGIC
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && product) {
        const parentWidth = containerRef.current.offsetWidth;
        const cardWidth = product.canvas_settings.width; 
        const contentWidth = viewState === 'inner' ? cardWidth * 2.1 : cardWidth * 1.1; 
        const newScale = Math.min((parentWidth - 20) / contentWidth, 1); 
        setScale(newScale > 0 ? newScale : 1);
      }
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100); 
    return () => window.removeEventListener("resize", handleResize);
  }, [product, viewState]);

  if (loading) return <LoadingScreen />;
  if (!product) return <div className="p-20 text-center">Product not found</div>;

  const { width, height } = product.canvas_settings;
  const isInner = viewState === 'inner'; 
  const isBack = viewState === 'back';   
  const coverZ = isBack ? 0 : 20;
  const baseZ = isBack ? 20 : 10;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center py-6 select-none overflow-x-hidden" onContextMenu={(e) => e.preventDefault()} onClick={() => setActiveZoneId(null)}>
      
      <div className="w-full max-w-[1000px] px-4 mb-6 flex justify-between items-center z-50">
        <Link href={`/products/${params.sku}`} className="text-zinc-500 hover:text-black dark:text-zinc-400 font-medium">← Cancel</Link>
        <div className="hidden sm:flex bg-white dark:bg-zinc-800 rounded-full p-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <button onClick={() => setViewState('front')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${viewState === 'front' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:bg-zinc-100'}`}>FRONT</button>
            <button onClick={() => setViewState('inner')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${viewState === 'inner' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:bg-zinc-100'}`}>INSIDE</button>
            <button onClick={() => setViewState('back')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${viewState === 'back' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:bg-zinc-100'}`}>BACK</button>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full font-bold shadow-lg text-sm transition transform active:scale-95" onClick={() => alert("Proceed to Cart")}>Add to Basket</button>
      </div>

      <div ref={containerRef} className="w-full flex justify-center items-center perspective-container" style={{ height: `${height * scale + 60}px` }}>
        
        <div 
            className="relative transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
            style={{
                width: `${width}px`, height: `${height}px`,
                transform: `scale(${scale}) translateX(${isInner ? '50%' : '0%'}) rotateY(${isBack ? '-180deg' : '0deg'})`, 
                transformStyle: "preserve-3d",
            }}
            onClick={(e) => e.stopPropagation()} // Prevent clicking canvas clearing selection
        >
            {/* LEAF 1: COVER */}
            <div 
                className="absolute inset-0 origin-left transition-transform duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                style={{ transformStyle: "preserve-3d", transform: isInner ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: coverZ }}
            >
                {/* Front */}
                <div className="absolute inset-0 bg-white shadow-xl backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}>
                    <PageContent slide={product.design_data.slides.front} userInputs={userInputs} setUserInputs={setUserInputs} userStyles={userStyles} activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId} />
                    <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-r from-black/20 to-transparent"></div>
                </div>
                {/* Left Inner */}
                <div className="absolute inset-0 bg-white shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)' }}>
                    <PageContent slide={product.design_data.slides.left_inner} userInputs={userInputs} setUserInputs={setUserInputs} userStyles={userStyles} activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId} />
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* LEAF 2: BASE */}
            <div 
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d", zIndex: baseZ }}
            >
                {/* Right Inner */}
                <div className="absolute inset-0 bg-white shadow-md backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                    <PageContent slide={product.design_data.slides.right_inner} userInputs={userInputs} setUserInputs={setUserInputs} userStyles={userStyles} activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId} />
                    <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                </div>
                {/* Back */}
                <div className="absolute inset-0 bg-white shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(2px)' }}>
                    <PageContent slide={product.design_data.slides.back} userInputs={userInputs} setUserInputs={setUserInputs} userStyles={userStyles} activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId} />
                </div>
            </div>
        </div>
      </div>

      <FloatingToolbar activeZoneId={activeZoneId} userStyles={userStyles} setUserStyles={setUserStyles} />

      <div className="w-full max-w-[400px] mt-8 flex gap-4 px-4">
             {viewState === 'front' && <button onClick={() => setViewState('inner')} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Open Card →</button>}
             {viewState === 'inner' && (
                 <>
                    <button onClick={() => setViewState('front')} className="flex-1 py-3 bg-zinc-200 text-zinc-800 font-bold rounded-xl">← Close</button>
                    <button onClick={() => setViewState('back')} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Back of Card →</button>
                 </>
             )}
             {viewState === 'back' && <button onClick={() => setViewState('inner')} className="flex-1 py-3 bg-zinc-200 text-zinc-800 font-bold rounded-xl">← Turn Over</button>}
      </div>

      <style jsx global>{`
        .perspective-container { perspective: 2500px; } 
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.3s ease forwards; }
      `}</style>
    </div>
  );
}