"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";

// --- REUSED HELPER COMPONENTS ---

const ProtectedImage = ({ url }: { url: string | null }) => {
  if (!url) return null;
  return (
    <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <div className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${url}')` }} />
    </div>
  );
};

// ** READ ONLY ZONE ** (No Textarea, just Div)
const ReadOnlyZone = ({ zone, value, userStyle }: any) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState(zone.fontSize || 32);

  const isBigZone = zone.height > 200;
  const verticalAlign = isBigZone ? 'flex-start' : 'center';
  
  // Use User Style if exists, else Admin Default
  const activeFont = userStyle?.fontFamily || (zone.fontFamily ? zone.fontFamily.replace(/['"]/g, "").split(",")[0] : "Arial");
  const activeColor = userStyle?.color || zone.color || "#000";

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.fontSize = `${zone.fontSize}px`;
    
    // Auto-shrink logic (Same as editor)
    let size = zone.fontSize || 32;
    const minSize = 10; 
    while ((el.scrollHeight > zone.height || el.scrollWidth > zone.width) && size > minSize) {
      size--;
      el.style.fontSize = `${size}px`;
    }
    setCurrentFontSize(size);
  }, [value, zone.width, zone.height, zone.fontSize, activeFont]);

  const textAlign = zone.textAlign || (isBigZone ? 'left' : 'center');
  let alignItems = 'center'; 
  if (textAlign === 'left') alignItems = 'flex-start';
  if (textAlign === 'right') alignItems = 'flex-end';

  return (
    <div
      style={{
        position: "absolute", left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`,
        transform: `rotate(${zone.rotation}deg)`, zIndex: 20,
        display: 'flex', flexDirection: 'column', justifyContent: verticalAlign, alignItems: alignItems, 
        padding: isBigZone ? '20px' : '0px', overflow: 'hidden'       
      }}
    >
      <div
        ref={textRef}
        style={{
          fontFamily: activeFont, fontSize: `${currentFontSize}px`, fontWeight: (zone.fontWeight as any) || "normal",
          color: activeColor, textAlign: textAlign, lineHeight: 1.2, width: '100%', whiteSpace: 'pre-wrap', 
        }}
      >
        {value}
      </div>
    </div>
  );
};

const PageContent = ({ slide, userInputs, userStyles }: any) => (
    <>
        <ProtectedImage url={slide.background_url} />
        {slide.static_zones?.map((zone: any) => (
            <div key={zone.id} style={{ position: "absolute", left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`, transform: `rotate(${zone.rotation}deg)`, fontSize: `${(zone.fontSize || zone.height) * 0.8}px`, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
                {zone.type === 'emoji' ? zone.emoji : ''}
            </div>
        ))}
        {slide.dynamic_zones.map((zone: any) => (
            <ReadOnlyZone 
                key={zone.id} 
                zone={zone} 
                value={userInputs[String(zone.id)] || ""} 
                userStyle={userStyles[String(zone.id)]}
            />
        ))}
    </>
);

export default function ReadOnlyCard({ product, viewState, userInputs, userStyles }: any) {
    const { width, height } = product.canvas_settings;
    const isInner = viewState === 'inner'; 
    const isBack = viewState === 'back';   
    const coverZ = isBack ? 0 : 20;
    const baseZ = isBack ? 20 : 10;
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Resize Logic (Simplified for Preview)
    useEffect(() => {
        const handleResize = () => {
          if (containerRef.current) {
            const parentWidth = containerRef.current.offsetWidth;
            const contentWidth = viewState === 'inner' ? width * 2.1 : width * 1.1; 
            const newScale = Math.min((parentWidth) / contentWidth, 1); 
            setScale(newScale > 0 ? newScale : 1);
          }
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, [viewState, width]);

    // Font Loader
    useEffect(() => {
        const slides = product.design_data?.slides;
        const allZones = [...slides.front.dynamic_zones, ...slides.left_inner.dynamic_zones, ...slides.right_inner.dynamic_zones, ...slides.back.dynamic_zones];
        allZones.forEach((zone:any) => {
          if (zone.fontFamily) {
            const cleanFont = zone.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
            const link = document.createElement("link");
            link.href = `https://fonts.googleapis.com/css2?family=${cleanFont.replace(/ /g, "+")}&display=swap`;
            link.rel = "stylesheet";
            if (!document.querySelector(`link[href="${link.href}"]`)) document.head.appendChild(link);
          }
        });
    }, [product]);

    return (
      <div ref={containerRef} className="w-full flex justify-center items-center perspective-container" style={{ height: `${height * scale + 40}px` }}>
        <div className="relative transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
            style={{ width: `${width}px`, height: `${height}px`, transform: `scale(${scale}) translateX(${isInner ? '50%' : '0%'}) rotateY(${isBack ? '-180deg' : '0deg'})`, transformStyle: "preserve-3d" }}
        >
            {/* LEAF 1 */}
            <div className="absolute inset-0 origin-left transition-transform duration-700" style={{ transformStyle: "preserve-3d", transform: isInner ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: coverZ }}>
                <div className="absolute inset-0 bg-white shadow-xl backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}>
                    <PageContent slide={product.design_data.slides.front} userInputs={userInputs} userStyles={userStyles} />
                    <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-r from-black/20 to-transparent"></div>
                </div>
                <div className="absolute inset-0 bg-white shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)' }}>
                    <PageContent slide={product.design_data.slides.left_inner} userInputs={userInputs} userStyles={userStyles} />
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
                </div>
            </div>
            {/* LEAF 2 */}
            <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", zIndex: baseZ }}>
                <div className="absolute inset-0 bg-white shadow-md backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                    <PageContent slide={product.design_data.slides.right_inner} userInputs={userInputs} userStyles={userStyles} />
                    <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                </div>
                <div className="absolute inset-0 bg-white shadow-xl" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(2px)' }}>
                    <PageContent slide={product.design_data.slides.back} userInputs={userInputs} userStyles={userStyles} />
                </div>
            </div>
        </div>
        <style jsx global>{` .perspective-container { perspective: 2500px; } .backface-hidden { backface-visibility: hidden; } `}</style>
      </div>
    );
}