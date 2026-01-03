import React from 'react';
import { Button } from './ui/button';

const CTASection = () => {
  return (
    <section className="py-20 md:py-32 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Need a high-quality
            </h2>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              systematic review? <span className="text-[#6B8E7B]">Let us help!</span>
            </h2>
            <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
              At Silvi, we make it easy to gain a clear picture of the evidence landscape—just as we already have for more than <strong className="text-gray-700">50 companies</strong> and scientific groups.
            </p>
            <Button className="bg-[#6B8E7B] hover:bg-[#5a7a69] text-white px-8 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-lg hover:shadow-[#6B8E7B]/20">
              Learn more
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
