import React from 'react';

const MediaSection = () => {
  return (
    <section className="py-12 bg-white border-t border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-400 uppercase tracking-wider mb-8">
          In the media
        </p>
        <div className="relative overflow-hidden">
          <div className="flex animate-scroll gap-16 items-center">
            {[...Array(3)].map((_, setIdx) => (
              <div key={setIdx} className="flex gap-16 items-center shrink-0">
                <div className="h-8 w-32 bg-gray-200 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
                <div className="h-10 w-28 bg-gray-300 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
                <div className="h-8 w-36 bg-gray-200 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
                <div className="h-10 w-32 bg-gray-300 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
                <div className="h-8 w-28 bg-gray-200 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default MediaSection;
