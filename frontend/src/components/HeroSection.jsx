import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, Check, X, Search, ChevronRight } from 'lucide-react';

const HeroSection = ({ onGetStarted }) => {
  return (
    <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden bg-gradient-to-b from-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Scientific literature
            <br />
            reviews made fast
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
            Silvi is an AI tool for fast, transparent
            <br />
            scientific evidence
          </p>
          <Button 
            onClick={onGetStarted}
            className="bg-[#6B8E7B] hover:bg-[#5a7a69] text-white px-8 py-6 rounded-full text-base font-medium inline-flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-[#6B8E7B]/20"
          >
            Get started <span className="text-white/80">— it&apos;s free</span>
          </Button>
        </div>

        {/* Product Illustration */}
        <div className="mt-16 md:mt-20 relative">
          <div className="flex justify-center items-end gap-4 md:gap-6">
            {/* Left Panel - Study List */}
            <div className="hidden md:block bg-white rounded-2xl shadow-xl p-4 w-64 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gray-100 rounded-lg p-2 flex-1">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h18M3 12h18" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item, idx) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className={`h-2 rounded-full flex-1 ${idx === 0 ? 'bg-gray-300' : idx === 1 ? 'bg-gray-200' : 'bg-gray-100'}`} style={{ width: `${80 - idx * 10}%` }} />
                    {idx === 0 && <Check className="w-4 h-4 text-green-500" />}
                    {idx === 1 && <X className="w-4 h-4 text-red-400" />}
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-sm font-semibold text-[#6B8E7B]">83%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#6B8E7B] rounded-full" style={{ width: '83%' }} />
                </div>
              </div>
            </div>

            {/* Center Panel - Main App */}
            <div className="bg-[#2D3436] rounded-t-2xl shadow-2xl w-full max-w-md md:max-w-lg transform scale-95 md:scale-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#6B8E7B] rounded-md flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm">/ Literature review</span>
                  <div className="flex gap-1 ml-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#6B8E7B] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-[#6B8E7B] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-[#6B8E7B] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-6 md:p-8">
                <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white text-sm">◀</button>
                    <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white text-sm">▶</button>
                    <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-white text-sm">■</button>
                  </div>
                  <div className="bg-yellow-200 h-8 w-24 mx-auto rounded mb-2 flex items-center justify-center">
                    <span className="text-gray-800 font-mono text-lg">⟂</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <button className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors">
                    <Check className="w-6 h-6 text-white" />
                  </button>
                  <button className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Data Extraction */}
            <div className="hidden md:block bg-white rounded-2xl shadow-xl p-4 w-72 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#C9A961] bg-[#FEF9E7] px-3 py-1 rounded-full">Dosis</span>
                  <div className="h-2 bg-gray-100 rounded-full flex-1" />
                  <span className="text-xs text-gray-400">mg</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#6B8E7B] bg-[#E8F5E9] px-3 py-1 rounded-full">Study design</span>
                  <div className="h-2 bg-gray-100 rounded-full flex-1" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#6B8E7B] bg-[#E8F5E9] px-3 py-1 rounded-full">Conclusion</span>
                  <div className="h-2 bg-gray-100 rounded-full flex-1" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-end justify-between h-24">
                  {[40, 65, 30, 80, 55, 70].map((height, idx) => (
                    <div
                      key={idx}
                      className={`w-6 rounded-t-md ${idx % 2 === 0 ? 'bg-[#6B8E7B]' : 'bg-[#A8C5B5]'}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#6B8E7B]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#6B8E7B]/5 rounded-full blur-3xl" />
    </section>
  );
};

export default HeroSection;
