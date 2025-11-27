"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// Define the interface for Type Safety
interface Product {
  id: number;
  sku: string;
  title: string;
  price: string;
  discount_price: string | null;
  thumbnail_url: string; 
  type: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch from your Laravel API
    fetch("http://127.0.0.1:8000/api/products")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Network response was not ok");
        }
        return res.json();
      })
      .then((data) => {
        // 2. Laravel Pagination Handling
        const productList = data.data ? data.data : data;
        setProducts(productList);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setLoading(false);
      });
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

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center items-center py-20">
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
                {/* Thumbnail */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={product.thumbnail_url || "/placeholder.png"} 
                    alt={product.title}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />

                  <span className="absolute top-2 left-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {product.type === "fixed" ? "Ready-made" : "Customizable"}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {product.title}
                  </h3>

                  {/* Price */}
                  <div className="mt-2 flex items-center gap-2">
                    {product.discount_price ? (
                      <>
                        <span className="text-lg font-bold text-red-600">
                          £{parseFloat(product.discount_price).toFixed(2)}
                        </span>
                        <span className="text-sm text-zinc-500 line-through">
                          £{parseFloat(product.price).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        £{parseFloat(product.price).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Button: View Details Only */}
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

        {/* EMPTY STATE */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <h2 className="text-xl font-medium dark:text-white">No products found.</h2>
            <p className="text-zinc-500 mt-2">
              Add some products in your Laravel admin panel.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}