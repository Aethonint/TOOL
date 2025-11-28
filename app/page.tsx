"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// ✅ IMPORT FIX: Navigate up one level to find components
import DynamicThumbnail from "./components/DynamicThumbnail"; 

interface Product {
  id: number;
  sku: string;
  title: string;
  price: string;
  discount_price: string | null;
  thumbnail_url: string; 
  type: string;
  // Dynamic Thumbnail needs these:
  canvas_settings?: { width: number; height: number }; 
  preview_zones?: any[];
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // FETCH FUNCTION
  const fetchProducts = (page: number) => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/products?page=${page}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        setProducts(data.data || []);
        setLastPage(data.last_page || 1);
        setCurrentPage(data.current_page || 1);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  };

  // Initial Load
  useEffect(() => {
    fetchProducts(1);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 dark:bg-black">
      <main className="flex min-h-screen w-full max-w-7xl flex-col py-20 px-6 sm:px-12 bg-white dark:bg-black">

        {/* HEADER */}
        <div className="mb-12 text-center sm:text-left">
          <Image
            className="dark:invert mb-6 mx-auto sm:mx-0"
            src="/next.svg"
            alt="Logo"
            width={100}
            height={20}
            priority
          />
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 mb-4">
            Explore Our Greeting Cards
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Browse our collection and click on any card to view details.
          </p>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex justify-center items-center py-20 min-h-[400px]">
            <p className="text-xl font-semibold dark:text-white animate-pulse">
              Loading products...
            </p>
          </div>
        )}

        {/* PRODUCT GRID */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full">
            {products.map((product) => (
              <div
                key={product.id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* ✅ REPLACED STATIC IMAGE WITH DYNAMIC THUMBNAIL */}
                <div className="relative w-full bg-zinc-100 dark:bg-zinc-800">
                  
                  {/* The Live Preview Component */}
                  <DynamicThumbnail product={product} />

                  {/* Badge Overlay (Z-Index ensures it stays on top) */}
                  <span className="absolute top-2 left-2 z-10 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {product.type === "fixed" ? "Ready-made" : "Customizable"}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {product.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      £{parseFloat(product.price).toFixed(2)}
                    </span>
                  </div>
                  
                  

                  <div className="mt-auto pt-4">
                    <Link
                      href={`/products/${product.sku}`}
                      className="flex w-full items-center justify-center rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      👁️ View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {!loading && products.length > 0 && (
          <div className="mt-16 flex items-center justify-center gap-4">
            
            <button
              onClick={() => fetchProducts(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-semibold border ${
                currentPage === 1 
                  ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed" 
                  : "bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              ← Previous
            </button>

            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Page {currentPage} of {lastPage}
            </span>

            <button
              onClick={() => fetchProducts(currentPage + 1)}
              disabled={currentPage === lastPage}
              className={`px-4 py-2 rounded-lg font-semibold border ${
                currentPage === lastPage 
                  ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed" 
                  : "bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              Next →
            </button>
            
          </div>
        )}

      </main>
    </div>
  );
}