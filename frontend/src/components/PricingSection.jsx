import React, { useState } from 'react';
import { pricingPlans } from '../data/mock';
import { Check } from 'lucide-react';
import { Button } from './ui/button';

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="pricing" className="py-20 md:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing.
          </h2>
          <p className="text-lg text-gray-500">
            No hidden fees. Cancel anytime
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !isYearly ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setIsYearly(false)}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isYearly ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setIsYearly(true)}
          >
            Yearly
          </button>
          {isYearly && (
            <span className="text-xs text-[#6B8E7B] bg-[#E8F5E9] px-3 py-1 rounded-full font-medium">
              Save more than 50%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan, index) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
                plan.highlighted
                  ? 'ring-2 ring-[#6B8E7B] shadow-lg scale-105'
                  : 'shadow-md hover:scale-102'
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  {typeof plan.monthlyPrice === 'number' ? (
                    <>
                      <span className="text-4xl font-bold text-gray-900">
                        €{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-gray-500">/month</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-gray-900">Custom</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {isYearly && plan.yearlyBilled
                    ? `Billed as €${plan.yearlyBilled} yearly.`
                    : plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#6B8E7B] mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-600">
                      {feature.includes('Everything') ? (
                        <>
                          Everything in <strong>{feature.split('in ')[1]}</strong>
                        </>
                      ) : (
                        feature
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  plan.highlighted
                    ? 'bg-[#6B8E7B] hover:bg-[#5a7a69] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href="#"
            className="text-gray-600 hover:text-[#6B8E7B] text-sm font-medium transition-colors"
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
