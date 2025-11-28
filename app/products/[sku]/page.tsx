"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
// IMPORT FIX: Navigate up 3 levels to find components
import DynamicThumbnail from "../../components/DynamicThumbnail";

// 1. UPDATE INTERFACE (Added design_data)
interface Product {
  id: number;
  sku: string;
  title: string;
  price: string;
  description: string;
  thumbnail_url: string;
  gallery_urls: string[]; 
  type: string;
  canvas_settings?: { width: number; height: number };
  // We need to read the raw design data from the API
  design_data?: {
    slides: {
      front: {
        background_url: string; // The API sends this
        dynamic_zones: any[];
      };
    };
  };
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const sku = params.sku;

  useEffect(() => {
    if (!sku) return;

    fetch(`http://127.0.0.1:8000/api/products/${sku}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  }, [sku]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-xl font-semibold animate-pulse dark:text-white">Loading details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-black">
        <h2 className="text-2xl font-bold dark:text-white">Product Not Found</h2>
        <Link href="/" className="mt-4 text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  // ✅ 2. PREPARE DATA FOR DYNAMIC THUMBNAIL
  // The component expects { thumbnail_url, preview_zones }, but the Single Product API
  // returns the deep 'design_data' structure. We map it here.
  const frontSlide = product.design_data?.slides?.front;
  
  const thumbnailProps = {
      id: product.id,
      sku: product.sku,
      title: product.title,
      // If we removed the manual thumbnail input, we MUST use the canvas background
      thumbnail_url: frontSlide?.background_url || product.thumbnail_url || "/placeholder.png",
      canvas_settings: product.canvas_settings,
      preview_zones: frontSlide?.dynamic_zones || [] 
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden border border-zinc-200 dark:border-zinc-800">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          
          {/* LEFT: Product Image Section */}
          <div className="relative bg-zinc-100 dark:bg-zinc-800 p-8 flex items-center justify-center min-h-[400px] md:min-h-[600px]">
             <Link 
                href="/" 
                className="absolute top-6 left-6 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white flex items-center gap-2 transition z-20"
             >
                ← Back
             </Link>

            <div className="relative w-full max-w-md shadow-xl rotate-1 transition hover:rotate-0 duration-500">
              
              <div className="w-full h-full rounded-lg overflow-hidden bg-white">
                 {/* ✅ 3. PASS THE MAPPED PROPS */}
                 <DynamicThumbnail product={thumbnailProps} />
              </div>

            </div>
          </div>

          {/* RIGHT: Details & Actions */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            
            <div className="mb-4">
               <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                  {product.type === 'fixed' ? 'Ready to Ship' : 'Personalised Card'}
               </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              {product.title}
            </h1>

            <div className="flex items-baseline gap-3 mb-6">
               <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                  £{parseFloat(product.price).toFixed(2)}
               </span>
               <span className="text-sm text-zinc-500">Includes Envelope</span>
            </div>

            <div className="prose prose-zinc dark:prose-invert mb-8 text-zinc-600 dark:text-zinc-300">
              <p>{product.description || "A beautiful high-quality greeting card printed on premium 300gsm stock."}</p>
            </div>

            <div className="mt-auto space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                {product.type !== 'fixed' ? (
                  <button
                    onClick={() => router.push(`/editor/${product.sku}`)}
                    className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-1"
                  >
                    ✏️ Personalize This Card
                  </button>
                ) : (
                  <button 
                    className="w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-lg rounded-xl transition dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Add to Basket
                  </button>
                )}

                <p className="text-center text-xs text-zinc-400 mt-3">
                   🔒 Secure checkout • Fast delivery
                </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}