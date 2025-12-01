"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReadOnlyCard from "../../components/ReadOnlyCard"; // Import the component above



export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [userInputs, setUserInputs] = useState({});
  const [userStyles, setUserStyles] = useState({});
  const [viewState, setViewState] = useState<'front' | 'inner' | 'back'>('front');
  
  // Checklist State
  const [checks, setChecks] = useState({ spelling: false, layout: false });
  const [envelope, setEnvelope] = useState('white'); // 'white' | 'red' | 'kraft'

  useEffect(() => {
    if (!params.sku) return;
    
    // 1. Fetch Product Data
    fetch(`https://papillondashboard.devshop.site/api/products/${params.sku}`)
      .then((res) => res.json())
      .then((data) => setProduct(data));

    // 2. Load User's Customization
    const savedDraft = localStorage.getItem(`draft_${params.sku}`);
    if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setUserInputs(parsed.inputs || {});
        setUserStyles(parsed.styles || {});
    }
  }, [params.sku]);

  if (!product) return <div className="p-20 text-center">Loading Preview...</div>;

  const canCheckout = checks.spelling && checks.layout;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4 flex flex-col items-center">
      
      {/* 1. TOP BAR */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
         <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Review Your Card</h1>
         <button onClick={() => router.back()} className="text-blue-600 hover:underline">← Go Back & Edit</button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* 2. LEFT COLUMN: THE INTERACTIVE CARD */}
          <div className="lg:col-span-2">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center">
                  
                  {/* The Reused 3D Card (Read Only) */}
                  <div className="w-full relative" style={{ minHeight: '500px' }}>
                      <ReadOnlyCard 
                          product={product} 
                          viewState={viewState} 
                          userInputs={userInputs} 
                          userStyles={userStyles} 
                      />
                  </div>

                  {/* Simple Controls */}
                  <div className="flex gap-4 mt-8">
                      <button onClick={() => setViewState('front')} className={`px-4 py-2 rounded-full text-sm font-bold ${viewState==='front' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Front</button>
                      <button onClick={() => setViewState('inner')} className={`px-4 py-2 rounded-full text-sm font-bold ${viewState==='inner' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Inside</button>
                      <button onClick={() => setViewState('back')} className={`px-4 py-2 rounded-full text-sm font-bold ${viewState==='back' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Back</button>
                  </div>
              </div>
          </div>

          {/* 3. RIGHT COLUMN: APPROVAL & UPSELLS */}
          <div className="space-y-6">
              
              {/* Approval Box */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-bold text-lg mb-4">Please Check Carefully</h3>
                  <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                 checked={checks.spelling} onChange={(e) => setChecks(prev => ({...prev, spelling: e.target.checked}))} />
                          <span className="text-sm text-zinc-600 dark:text-zinc-300">I have checked spelling and grammar. (We don't spell check for you!)</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                 checked={checks.layout} onChange={(e) => setChecks(prev => ({...prev, layout: e.target.checked}))} />
                          <span className="text-sm text-zinc-600 dark:text-zinc-300">I am happy with the photo layout and text position.</span>
                      </label>
                  </div>
              </div>

              {/* Envelope Upsell */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-bold text-lg mb-4">Choose Envelope</h3>
                  <div className="space-y-3">
                      <label className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition ${envelope === 'white' ? 'border-blue-600 bg-blue-50' : 'border-zinc-200'}`}>
                          <div className="flex items-center gap-3">
                              <input type="radio" name="env" checked={envelope === 'white'} onChange={() => setEnvelope('white')} />
                              <span className="text-sm font-medium">Standard White</span>
                          </div>
                          <span className="text-xs font-bold text-green-600">FREE</span>
                      </label>

                      <label className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition ${envelope === 'red' ? 'border-blue-600 bg-blue-50' : 'border-zinc-200'}`}>
                          <div className="flex items-center gap-3">
                              <input type="radio" name="env" checked={envelope === 'red'} onChange={() => setEnvelope('red')} />
                              <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-red-600 border border-black/10"></span>
                                  <span className="text-sm font-medium">Premium Red</span>
                              </div>
                          </div>
                          <span className="text-xs font-bold">+ £0.50</span>
                      </label>
                  </div>
              </div>

              {/* Final CTA */}
              <button 
                  disabled={!canCheckout}
                  onClick={() => alert("Added to cart with envelope: " + envelope)}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
                      canCheckout 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" 
                      : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                  }`}
              >
                  {canCheckout ? "Approve & Add to Basket" : "Approve above to continue"}
              </button>

          </div>
      </div>
    </div>
  );
}