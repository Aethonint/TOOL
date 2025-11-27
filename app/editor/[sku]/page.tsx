"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// --- TYPES BASED ON YOUR JSON ---
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
  textAlign?: "left" | "center" | "right";
  maxChars?: number;
  placeholder?: string; // or use 'text' as placeholder
}

interface Slide {
  background_url: string | null;
  dynamic_zones: Zone[];
  static_zones: Zone[]; // emojis etc that user cannot edit
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

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Which slide are we viewing? 
  // Order: 'front' -> 'left_inner' -> 'right_inner' -> 'back'
  const [currentSlideKey, setCurrentSlideKey] = useState<keyof ProductData['design_data']['slides']>("front");

  // Store user inputs: { zoneId: "User typed text" }
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  
  // Scaling logic
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. FETCH DATA
  useEffect(() => {
    if (!params.sku) return;
    fetch(`http://127.0.0.1:8000/api/products/${params.sku}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [params.sku]);

  // 2. RESIZE HANDLER
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && product) {
        const parentWidth = containerRef.current.offsetWidth;
        const canvasWidth = product.canvas_settings.width || 600;
        const newScale = Math.min(parentWidth / canvasWidth, 1); 
        setScale(newScale > 0 ? newScale : 1);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [product]);

  // 3. LOAD FONTS
  useEffect(() => {
    if (!product) return;
    const slides = product.design_data?.slides;
    if (!slides) return;

    const allZones = [
        ...slides.front.dynamic_zones, 
        ...slides.left_inner.dynamic_zones,
        ...slides.right_inner.dynamic_zones,
        ...slides.back.dynamic_zones
    ];

    allZones.forEach((zone) => {
      if (zone.type === "text" && zone.fontFamily) {
        // Remove quotes if present, e.g. "'Noto Sans JP', sans-serif" -> Noto Sans JP
        const cleanFont = zone.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
        const link = document.createElement("link");
        link.href = `https://fonts.googleapis.com/css2?family=${cleanFont.replace(/ /g, "+")}&display=swap`;
        link.rel = "stylesheet";
        // Check if already added to avoid duplicates
        if (!document.querySelector(`link[href="${link.href}"]`)) {
            document.head.appendChild(link);
        }
      }
    });
  }, [product]);


  const handleInputChange = (id: string | number, value: string) => {
    setUserInputs((prev) => ({ ...prev, [String(id)]: value }));
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;
  if (!product) return <div className="p-20 text-center">Product not found</div>;

  const { width, height } = product.canvas_settings;
  const currentSlide = product.design_data.slides[currentSlideKey];

  // Helper to get all dynamic zones for the sidebar form
  // We only show inputs for the CURRENT slide to keep it clean
  const activeZones = currentSlide?.dynamic_zones || [];

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex flex-col md:flex-row">
      
      {/* --- LEFT: CANVAS PREVIEW --- */}
      <div className="flex-1 flex flex-col items-center p-4 bg-zinc-200 dark:bg-black relative">
         
         <div className="w-full max-w-[650px] flex justify-between items-center mb-4">
            <Link href={`/products/${params.sku}`} className="text-zinc-500 hover:text-black">
                ← Cancel
            </Link>
            
            {/* Slide Switcher Buttons */}
            <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
                {(['front', 'left_inner', 'right_inner', 'back'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setCurrentSlideKey(key)}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                            currentSlideKey === key 
                            ? "bg-blue-600 text-white" 
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                    >
                        {key.replace('_', ' ').toUpperCase()}
                    </button>
                ))}
            </div>
         </div>

        <div ref={containerRef} className="w-full max-w-[650px] flex justify-center">
          
          <div
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              position: "relative",
              backgroundColor: "#fff", // White background for inner pages
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            {/* 1. BACKGROUND IMAGE */}
            {currentSlide?.background_url && (
              <img
                src={currentSlide.background_url}
                className="absolute inset-0 w-full h-full object-cover z-0"
                alt="bg"
              />
            )}

            {/* 2. STATIC ZONES (Emojis, fixed text - Not Editable) */}
            {currentSlide?.static_zones?.map((zone) => (
                 <div
                    key={zone.id}
                    style={{
                      position: "absolute",
                      left: `${zone.x}px`,
                      top: `${zone.y}px`,
                      width: `${zone.width}px`,
                      height: `${zone.height}px`,
                      fontSize: `${(zone.fontSize || zone.height) * 0.8}px`, // Rough estimate for emoji size
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      zIndex: 5
                    }}
                  >
                    {zone.type === 'emoji' ? (zone as any).emoji : ''}
                  </div>
            ))}

            {/* 3. DYNAMIC ZONES (User Editable) */}
            {currentSlide?.dynamic_zones?.map((zone) => {
              const userVal = userInputs[String(zone.id)];
              const fontName = zone.fontFamily ? zone.fontFamily.replace(/['"]/g, "").split(",")[0] : "Arial";

              return (
                <div
                  key={zone.id}
                  style={{
                    position: "absolute",
                    left: `${zone.x}px`,
                    top: `${zone.y}px`,
                    width: `${zone.width}px`,
                    height: `${zone.height}px`,
                    // Styles from JSON
                    fontFamily: fontName,
                    fontSize: `${zone.fontSize}px`,
                    fontWeight: zone.fontWeight || "normal",
                    color: zone.color || "#000",
                    textAlign: zone.textAlign || "left",
                    zIndex: 10,
                    whiteSpace: "pre-wrap",
                    display: "flex",
                    alignItems: "center", // Vertically center
                    justifyContent: zone.textAlign === "center" ? "center" : zone.textAlign === "right" ? "flex-end" : "flex-start",
                    lineHeight: 1.2,
                  }}
                >
                  {/* Show User Input OR Placeholder (from 'text' field in JSON) */}
                  {userVal || <span className="opacity-40 border border-dashed border-zinc-400 w-full h-full flex items-center justify-center">{zone.text || "Type here"}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- RIGHT: SIDEBAR FORM --- */}
      <div className="w-full md:w-[400px] bg-white dark:bg-zinc-800 border-l border-zinc-200 dark:border-zinc-700 p-6 shadow-2xl z-20 overflow-y-auto max-h-screen">
        <h2 className="text-xl font-bold mb-1 text-zinc-900 dark:text-white">
            Editing: {currentSlideKey.replace('_', ' ').toUpperCase()}
        </h2>
        <p className="text-sm text-zinc-500 mb-6">Customize the fields below.</p>

        <div className="space-y-6">
          {activeZones.length === 0 ? (
             <p className="text-zinc-400 italic text-sm">No editable fields on this page.</p>
          ) : (
            activeZones.map((zone) => (
                <div key={zone.id}>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    {zone.text === "Your Name" ? "Recipient Name" : zone.text === "Inside Msg" ? "Your Message" : "Custom Text"}
                </label>

                {zone.type === "text" && (
                    <textarea
                    rows={zone.height > 100 ? 4 : 2}
                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder={`Enter ${zone.text}...`}
                    maxLength={zone.maxChars || 200}
                    value={userInputs[String(zone.id)] || ""}
                    onChange={(e) => handleInputChange(zone.id, e.target.value)}
                    />
                )}
                </div>
            ))
          )}
        </div>

        {/* Navigation Buttons inside Sidebar */}
        <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-700 flex gap-2">
            {currentSlideKey !== 'front' && (
                 <button 
                 onClick={() => {
                     const order = ['front', 'left_inner', 'right_inner', 'back'];
                     const currIdx = order.indexOf(currentSlideKey);
                     setCurrentSlideKey(order[currIdx - 1] as any);
                 }}
                 className="flex-1 py-3 bg-zinc-200 text-zinc-800 font-bold rounded-xl"
               >
                 Prev Page
               </button>
            )}
            
            {currentSlideKey !== 'right_inner' ? (
                 <button 
                 onClick={() => {
                     const order = ['front', 'left_inner', 'right_inner', 'back'];
                     const currIdx = order.indexOf(currentSlideKey);
                     setCurrentSlideKey(order[currIdx + 1] as any);
                 }}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl"
               >
                 Next Page
               </button>
            ) : (
                <button 
                 onClick={() => alert("Add to Cart Logic Here!")}
                 className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl"
               >
                 Add to Basket
               </button>
            )}
        </div>
      </div>

    </div>
  );
}