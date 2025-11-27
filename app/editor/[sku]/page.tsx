"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// --- 1. TYPES (Matching your JSON) ---
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

// --- 2. THE "AUTO-FIT" TEXT COMPONENT (Reusable) ---
// --- 2. THE "AUTO-FIT" TEXT COMPONENT (Reusable) ---
const AutoFitTextZone = ({ zone, value, onChange }: { zone: Zone; value: string; onChange: (val: string) => void }) => {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState(zone.fontSize || 32);
  const [isFocused, setIsFocused] = useState(false); // Track focus state

  // AUTO-FIT LOGIC: Shrink text if it overflows the box
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    el.style.fontSize = `${zone.fontSize}px`;
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
  }, [value, zone.width, zone.height, zone.fontSize]);

  // Clean Font Name
  const fontName = zone.fontFamily ? zone.fontFamily.replace(/['"]/g, "").split(",")[0] : "Arial";

  return (
    <div
      style={{
        position: "absolute",
        left: `${zone.x}px`,
        top: `${zone.y}px`,
        width: `${zone.width}px`,
        height: `${zone.height}px`,
        transform: `rotate(${zone.rotation}deg)`,
        zIndex: 20,
      }}
      className="group" // Tailwind group for hover effects
    >
      {/* ✅ NEW: "T" INDICATOR ICON 
         - Shows a blue "T" in top-left
         - Fades out when user starts typing (focus) so it doesn't block view
      */}
      <div 
        className={`absolute -top-3 -left-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-30 pointer-events-none transition-opacity duration-200 ${
            isFocused || value.length > 0 ? 'opacity-0' : 'opacity-100'
        }`}
      >
        T
      </div>

      <textarea
        ref={textRef}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => {
           if (zone.maxChars && e.target.value.length > zone.maxChars) return;
           onChange(e.target.value);
        }}
        placeholder={zone.text || "Click to type"}
        // Added 'group-hover' border to make it clearer
        className="w-full h-full resize-none outline-none border-2 border-dashed border-blue-300/60 hover:border-blue-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 bg-transparent transition-all p-1 overflow-hidden"
        style={{
          fontFamily: fontName,
          fontSize: `${currentFontSize}px`,
          fontWeight: (zone.fontWeight as any) || "normal",
          color: zone.color || "#000",
          backgroundColor: zone.backgroundColor && zone.backgroundColor !== "transparent" 
              ? zone.backgroundColor 
              : "rgba(255, 255, 255, 0.01)", 
          textAlign: zone.textAlign || "center",
          lineHeight: 1.1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', 
          paddingTop: zone.textAlign === 'center' ? '0' : '0', 
        }}
      />
      
      {/* Character Count Badge */}
      <div className={`absolute -bottom-6 right-0 bg-black text-white text-[10px] px-1 rounded transition-opacity duration-200 pointer-events-none z-50 ${
          isFocused ? 'opacity-100' : 'opacity-0'
      }`}>
        {value.length} / {zone.maxChars}
      </div>
    </div>
  );
};

// --- 3. MAIN EDITOR PAGE ---
export default function EditorPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [currentSlideKey, setCurrentSlideKey] = useState<keyof ProductData['design_data']['slides']>("front");

  // User Inputs State
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});

  // Canvas Scaling State
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // FETCH DATA
  useEffect(() => {
    if (!params.sku) return;
    fetch(`http://127.0.0.1:8000/api/products/${params.sku}`)
      .then((res) => {
        if(!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  }, [params.sku]);

  // RESIZE LOGIC
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && product) {
        const parentWidth = containerRef.current.offsetWidth;
        // Padding of 32px (16px each side)
        const newScale = Math.min((parentWidth - 32) / product.canvas_settings.width, 1); 
        setScale(newScale > 0 ? newScale : 1);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [product]);

  // DYNAMIC FONT LOADER (Loads fonts for ALL slides)
  useEffect(() => {
    if (!product) return;
    const slides = product.design_data?.slides;
    
    // Combine all zones to check fonts
    const allZones = [
      ...slides.front.dynamic_zones,
      ...slides.left_inner.dynamic_zones,
      ...slides.right_inner.dynamic_zones,
      ...slides.back.dynamic_zones,
    ];

    allZones.forEach((zone) => {
      if (zone.fontFamily) {
        const cleanFont = zone.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
        const link = document.createElement("link");
        link.href = `https://fonts.googleapis.com/css2?family=${cleanFont.replace(/ /g, "+")}&display=swap`;
        link.rel = "stylesheet";
        if (!document.querySelector(`link[href="${link.href}"]`)) {
            document.head.appendChild(link);
        }
      }
    });
  }, [product]);

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Editor...</div>;
  if (!product) return <div className="p-20 text-center">Product not found</div>;

  const { width, height } = product.canvas_settings;
  const currentSlide = product.design_data.slides[currentSlideKey];

  // Helper to change pages
  const changePage = (direction: 'next' | 'prev') => {
    const order: Array<keyof ProductData['design_data']['slides']> = ['front', 'left_inner', 'right_inner', 'back'];
    const currentIndex = order.indexOf(currentSlideKey);
    
    if (direction === 'next' && currentIndex < 3) {
      setCurrentSlideKey(order[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentSlideKey(order[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center py-6">
      
      {/* HEADER */}
      <div className="w-full max-w-[800px] px-4 mb-6 flex justify-between items-center z-50">
        <Link href={`/products/${params.sku}`} className="text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white font-medium">
          ← Cancel
        </Link>
        
        {/* TAB SWITCHER */}
        <div className="hidden sm:flex bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
            {(['front', 'left_inner', 'right_inner', 'back'] as const).map((key) => (
                <button
                    key={key}
                    onClick={() => setCurrentSlideKey(key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        currentSlideKey === key 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                >
                    {key.replace('_', ' ').toUpperCase()}
                </button>
            ))}
        </div>

        <button 
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full font-bold shadow-lg text-sm transition transform active:scale-95"
            onClick={() => alert("Add to Cart Logic Here!\nData: " + JSON.stringify(userInputs))}
        >
            Add to Basket
        </button>
      </div>

      {/* CANVAS AREA */}
      <div ref={containerRef} className="w-full flex flex-col items-center px-4 pb-20 overflow-visible">
        
        {/* CURRENT PAGE INDICATOR (Mobile) */}
        <div className="sm:hidden mb-2 font-bold text-zinc-500 text-sm">
            {currentSlideKey.replace('_', ' ').toUpperCase()}
        </div>

        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            position: "relative",
            backgroundColor: "#fff", // White background for inner pages
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.3)",
          }}
        >
          {/* 1. BACKGROUND IMAGE */}
          {currentSlide.background_url && (
            <img
              src={currentSlide.background_url}
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
              alt="Card Background"
            />
          )}

          {/* 2. STATIC ZONES (Emojis, etc.) */}
          {currentSlide.static_zones?.map((zone) => (
            <div
              key={zone.id}
              style={{
                position: "absolute",
                left: `${zone.x}px`,
                top: `${zone.y}px`,
                width: `${zone.width}px`,
                height: `${zone.height}px`,
                transform: `rotate(${zone.rotation}deg)`,
                fontSize: `${(zone.fontSize || zone.height) * 0.8}px`, // Fallback size for emojis
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 5
              }}
            >
              {zone.type === 'emoji' ? zone.emoji : ''}
            </div>
          ))}

          {/* 3. DYNAMIC ZONES (Editable Text Inputs) */}
          {currentSlide.dynamic_zones.map((zone) => (
            <AutoFitTextZone 
                key={zone.id}
                zone={zone}
                value={userInputs[String(zone.id)] || ""}
                onChange={(val) => setUserInputs(prev => ({...prev, [String(zone.id)]: val}))}
            />
          ))}

        </div>
        
        {/* BOTTOM NAVIGATION BUTTONS */}
        <div className="w-full max-w-[400px] mt-8 flex gap-4">
             {currentSlideKey !== 'front' && (
                 <button 
                    onClick={() => changePage('prev')}
                    className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-white font-bold rounded-xl shadow-sm hover:bg-zinc-300 transition"
                 >
                    ← Prev Page
                 </button>
             )}
             
             {currentSlideKey !== 'back' ? (
                 <button 
                    onClick={() => changePage('next')}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
                 >
                    Next Page →
                 </button>
             ) : (
                <button 
                    onClick={() => alert("Added to Basket!")}
                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 transition"
                 >
                    Finish & Add
                 </button>
             )}
        </div>

      </div>
    </div>
  );
}