"use client";

import { useEffect, useRef, useState } from "react";

// 1. Define the Types
interface Zone {
  id: number | string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  textAlign?: "left" | "center" | "right";
}

interface Product {
  id: number;
  sku: string;
  title: string;
  thumbnail_url: string;
  canvas_settings?: { width: number; height: number };
  preview_zones?: Zone[];
}

// 2. Apply Type to Props ({ product }: { product: Product })
export default function DynamicThumbnail({ product }: { product: Product }) {
  // Fix: Type the ref as an HTMLDivElement
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth;
        const designWidth = product.canvas_settings?.width || 600;
        setScale(parentWidth / designWidth);
      }
    };

    handleResize(); // Run once
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [product]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full overflow-hidden bg-gray-100"
      style={{ aspectRatio: `${product.canvas_settings?.width || 600}/${product.canvas_settings?.height || 850}` }}
    >
      
      {/* 1. BACKGROUND */}
      <img 
        src={product.thumbnail_url || "/placeholder.png"} 
        alt={product.title} 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 2. TEXT OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${product.canvas_settings?.width || 600}px`,
          height: `${product.canvas_settings?.height || 850}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {product.preview_zones?.map((zone) => (
          <div
            key={zone.id}
            style={{
              position: "absolute",
              left: `${zone.x}px`,
              top: `${zone.y}px`,
              width: `${zone.width}px`,
              height: `${zone.height}px`,
              transform: `rotate(${zone.rotation}deg)`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: zone.fontFamily,
              fontSize: `${zone.fontSize}px`,
              fontWeight: zone.fontWeight,
              color: zone.color,
              textAlign: zone.textAlign,
              whiteSpace: "pre-wrap",
            }}
          >
            {zone.text || "Sample"}
          </div>
        ))}
      </div>
    </div>
  );
}