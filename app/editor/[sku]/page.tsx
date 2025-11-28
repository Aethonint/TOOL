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

// --- 1. PROTECTED IMAGE ---
const ProtectedImage = ({ url }: { url: string | null }) => {
  if (!url) return null;
  return (
    <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <div className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${url}')` }} />
    </div>
  );
};

// --- 2. AUTO-FIT TEXT ZONE (Optimized for Full Page Messages) ---
const AutoFitTextZone = ({ zone, value, onChange }: { zone: Zone; value: string; onChange: (val: string) => void }) => {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState(zone.fontSize || 32);
  const [isFocused, setIsFocused] = useState(false);

  // DETECT ZONE TYPE
  // If height > 200px, treat it as a "Body Message" (Right Inner). 
  // If smaller, treat it as a "Title/Name" (Front).
  const isMessageBody = zone.height > 200;

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // 1. Reset font size to max
    el.style.fontSize = `${zone.fontSize}px`;
    
    // 2. Measure Content vs Container
    // We check scrollHeight (content) vs clientHeight (fixed box)
    let size = zone.fontSize || 32;
    const minSize = 10; 

    while (
      (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && 
      size > minSize
    ) {
      size--;
      el.style.fontSize = `${size}px`;
    }
    
    setCurrentFontSize(size);

  }, [value, zone.width, zone.height, zone.fontSize, zone.fontFamily]);

  const fontName = zone.fontFamily ? zone.fontFamily.replace(/['"]/g, "").split(",")[0] : "Arial";
  
  // Alignment Defaults
  // Titles default to Center. Body Messages default to Left (or whatever Admin set).
  const textAlign = zone.textAlign || (isMessageBody ? 'left' : 'center');

  return (
    <div
      style={{
        position: "absolute", left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`,
        transform: `rotate(${zone.rotation}deg)`, zIndex: 20,
        backgroundColor: zone.backgroundColor && zone.backgroundColor !== "transparent" ? zone.backgroundColor : "rgba(255, 255, 255, 0.01)", 
        
        // CONTAINER LAYOUT
        display: 'flex', 
        flexDirection: 'column', 
        // If it's a Body Message, align Top (flex-start). If Title, align Center.
        justifyContent: isMessageBody ? 'flex-start' : 'center', 
        overflow: 'hidden'       
      }}
      className={`group cursor-text transition-all ${isFocused ? "border-2 border-blue-600 ring-4 ring-blue-500/20" : "border-2 border-dashed border-blue-300/60 hover:border-blue-500"}`}
      onClick={() => textRef.current?.focus()}
    >
      <div className={`absolute -top-3 -left-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-30 pointer-events-none transition-opacity duration-200 ${isFocused || value.length > 0 ? 'opacity-0' : 'opacity-100'}`}>T</div>
      
      <textarea
        ref={textRef} value={value} 
        rows={isMessageBody ? 6 : 1} // Give more initial rows for body text
        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
        onChange={(e) => { if (zone.maxChars && e.target.value.length > zone.maxChars) return; onChange(e.target.value); }}
        placeholder={zone.text || "Click to type"}
        className="resize-none outline-none bg-transparent p-1"
        style={{
          fontFamily: fontName, fontSize: `${currentFontSize}px`, fontWeight: (zone.fontWeight as any) || "normal",
          color: zone.color || "#000", textAlign: textAlign, lineHeight: 1.2,
          
          // ✅ FULL FILL LOGIC:
          // 1. Width always 100% of box.
          // 2. Height: If Message Body, take 100% of box (so you can click anywhere).
          //    If Title, take 'auto' (so it centers perfectly).
          width: '100%', 
          height: isMessageBody ? '100%' : 'auto', 
          maxHeight: '100%', 
          whiteSpace: 'pre-wrap', 
        }}
      />
      <div className={`absolute -bottom-6 right-0 bg-black text-white text-[10px] px-1 rounded transition-opacity duration-200 pointer-events-none z-50 ${isFocused ? 'opacity-100' : 'opacity-0'}`}>{value.length} / {zone.maxChars}</div>
    </div>
  );
};

// --- 3. PAGE CONTENT ---
const PageContent = ({ slide, userInputs, setUserInputs }: { slide: Slide, userInputs: any, setUserInputs: any }) => (
    <>
        <ProtectedImage url={slide.background_url} />
        {slide.static_zones?.map((zone) => (
            <div key={zone.id} style={{ position: "absolute", left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`, transform: `rotate(${zone.rotation}deg)`, fontSize: `${(zone.fontSize || zone.height) * 0.8}px`, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
                {zone.type === 'emoji' ? zone.emoji : ''}
            </div>
        ))}
        {slide.dynamic_zones.map((zone) => (
            <AutoFitTextZone key={zone.id} zone={zone} value={userInputs[String(zone.id)] || ""} onChange={(val) => setUserInputs((prev: any) => ({...prev, [String(zone.id)]: val}))} />
        ))}
    </>
);

export default function EditorPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [viewState, setViewState] = useState<'front' | 'inner' | 'back'>('front');
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!params.sku) return;
    fetch(`http://127.0.0.1:8000/api/products/${params.sku}`)
      .then((res) => res.json())
      .then((data) => { setProduct(data); setLoading(false); });
  }, [params.sku]);

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

  useEffect(() => {
    if (!product) return;
    const slides = product.design_data?.slides;
    const allZones = [...slides.front.dynamic_zones, ...slides.left_inner.dynamic_zones, ...slides.right_inner.dynamic_zones, ...slides.back.dynamic_zones];
    allZones.forEach((zone) => {
      if (zone.fontFamily) {
        const cleanFont = zone.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
        const link = document.createElement("link");
        link.href = `https://fonts.googleapis.com/css2?family=${cleanFont.replace(/ /g, "+")}&display=swap`;
        link.rel = "stylesheet";
        if (!document.querySelector(`link[href="${link.href}"]`)) document.head.appendChild(link);
      }
    });
  }, [product]);

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Editor...</div>;
  if (!product) return <div className="p-20 text-center">Product not found</div>;

  const { width, height } = product.canvas_settings;

  const isInner = viewState === 'inner'; 
  const isBack = viewState === 'back';   

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center py-6 select-none overflow-x-hidden" onContextMenu={(e) => e.preventDefault()}>
      
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
                width: `${width}px`, 
                height: `${height}px`,
                transform: `scale(${scale}) translateX(${isInner ? '50%' : '0%'}) rotateY(${isBack ? '-180deg' : '0deg'})`, 
                transformStyle: "preserve-3d",
            }}
        >
            {/* LEAF 1: COVER */}
            <div 
                className="absolute inset-0 origin-left transition-transform duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                style={{
                    transformStyle: "preserve-3d",
                    transform: isInner ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                    zIndex: isBack ? 0 : 20, 
                }}
            >
                {/* Front Cover */}
                <div className="absolute inset-0 bg-white shadow-xl backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}>
                    <PageContent slide={product.design_data.slides.front} userInputs={userInputs} setUserInputs={setUserInputs} />
                    <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-r from-black/20 to-transparent"></div>
                </div>

                {/* Inside Left */}
                <div className="absolute inset-0 bg-white shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)' }}>
                    <PageContent slide={product.design_data.slides.left_inner} userInputs={userInputs} setUserInputs={setUserInputs} />
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* LEAF 2: BASE */}
            <div 
                className="absolute inset-0"
                style={{ 
                    transformStyle: "preserve-3d", 
                    zIndex: isBack ? 20 : 10 
                }}
            >
                {/* Inside Right */}
                <div className="absolute inset-0 bg-white shadow-md backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                    <PageContent slide={product.design_data.slides.right_inner} userInputs={userInputs} setUserInputs={setUserInputs} />
                    <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                </div>

                {/* Back of Card */}
                <div className="absolute inset-0 bg-white shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(2px)' }}>
                    <PageContent slide={product.design_data.slides.back} userInputs={userInputs} setUserInputs={setUserInputs} />
                </div>
            </div>

        </div>
      </div>

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
      `}</style>
    </div>
  );
}