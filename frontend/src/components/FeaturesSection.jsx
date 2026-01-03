import React from 'react';
import { features } from '../data/mock';
import { ArrowRight, Check, X, Search, FileText, BookOpen, Database, Archive } from 'lucide-react';

const databaseIntegrations = [
  { name: 'ERIC', icon: BookOpen, color: '#4A7C59' },
  { name: 'OpenAlex', icon: Database, color: '#C74B4B' },
  { name: 'PubMed', icon: FileText, color: '#2E5984' },
  { name: 'Zotero', icon: Archive, color: '#CC2936' },
];

const FeatureIllustration = ({ featureId }) => {
  const illustrations = {
    screen: (
      <div className="bg-gray-50 rounded-2xl p-6 shadow-lg">
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Search studies...</span>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item, idx) => (
              <div key={item} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`h-2 rounded-full flex-1 ${idx === 0 ? 'bg-gray-300' : 'bg-gray-100'}`} style={{ width: `${90 - idx * 15}%` }} />
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${idx === 0 ? 'bg-green-100' : idx === 1 ? 'bg-red-100' : 'bg-gray-100'}`}>
                  {idx === 0 && <Check className="w-3 h-3 text-green-600" />}
                  {idx === 1 && <X className="w-3 h-3 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
            <Check className="w-5 h-5 text-white" />
          </button>
          <button className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    ),
    extract: (
      <div className="bg-[#2D3436] rounded-2xl overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
          <div className="w-6 h-6 bg-[#6B8E7B] rounded-md" />
          <span className="text-white/70 text-sm">/ Literature review</span>
        </div>
        <div className="bg-gray-100 p-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">◀</span>
              </button>
              <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">▶</span>
              </button>
              <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">■</span>
              </button>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
              <div className="h-6 bg-yellow-200 rounded w-1/3 flex items-center justify-center">
                <span className="font-mono text-sm">⟂</span>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    ),
    'ai-extract': (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6B8E7B]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#6B8E7B]" />
            </div>
            <span className="text-sm font-medium text-[#C9A961] bg-[#FEF9E7] px-3 py-1 rounded-full">Dosis</span>
            <div className="h-2 bg-gray-100 rounded-full flex-1" />
            <span className="text-xs text-[#6B8E7B] font-medium">AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6B8E7B]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#6B8E7B]" />
            </div>
            <span className="text-sm font-medium text-[#6B8E7B] bg-[#E8F5E9] px-3 py-1 rounded-full">Sample size</span>
            <div className="h-2 bg-gray-100 rounded-full flex-1" />
            <span className="text-xs text-[#6B8E7B] font-medium">AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6B8E7B]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#6B8E7B]" />
            </div>
            <span className="text-sm font-medium text-[#6B8E7B] bg-[#E8F5E9] px-3 py-1 rounded-full">Outcome</span>
            <div className="h-2 bg-gray-100 rounded-full flex-1" />
            <Check className="w-4 h-4 text-green-500" />
          </div>
        </div>
      </div>
    ),
    tables: (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 mb-3">
            <div className="font-medium">Study</div>
            <div className="font-medium">N</div>
            <div className="font-medium">Design</div>
            <div className="font-medium">Result</div>
          </div>
          {[1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-4 gap-2 text-sm py-2 border-t border-gray-200">
              <div className="h-2 bg-gray-200 rounded" />
              <div className="h-2 bg-gray-300 rounded w-8" />
              <div className="h-2 bg-gray-200 rounded" />
              <div className="h-2 bg-[#6B8E7B]/30 rounded" />
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between h-20 px-4">
          {[40, 65, 30, 80, 55, 70, 45].map((height, idx) => (
            <div
              key={idx}
              className={`w-4 rounded-t ${idx % 2 === 0 ? 'bg-[#6B8E7B]' : 'bg-[#A8C5B5]'}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    ),
    collaborate: (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          {[1, 2, 3].map((user, idx) => (
            <div key={user} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${idx === 0 ? 'bg-[#6B8E7B]' : idx === 1 ? 'bg-[#5B9BD5]' : 'bg-[#C9A961]'}`}>
                {['JD', 'SK', 'ML'][idx]}
              </div>
            </div>
          ))}
          <button className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#6B8E7B] hover:text-[#6B8E7B] transition-colors">
            +
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <div className="w-6 h-6 bg-[#6B8E7B] rounded-full" />
            <div className="flex-1">
              <div className="h-2 bg-gray-300 rounded w-3/4 mb-1" />
              <div className="h-2 bg-gray-200 rounded w-1/2" />
            </div>
            <span className="text-xs text-[#6B8E7B] bg-[#E8F5E9] px-2 py-1 rounded">Assigned</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <div className="w-6 h-6 bg-[#5B9BD5] rounded-full" />
            <div className="flex-1">
              <div className="h-2 bg-gray-300 rounded w-2/3 mb-1" />
              <div className="h-2 bg-gray-200 rounded w-1/3" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Pending</span>
          </div>
        </div>
      </div>
    ),
  };

  return illustrations[featureId] || <div className="bg-gray-100 rounded-2xl h-64" />;
};

const FeaturesSection = () => {
  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Meet Silvi Section */}
        <div className="text-center mb-20">
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-4">Meet</p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-14 bg-[#6B8E7B] rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Silvi</h2>
          </div>
        </div>

        {/* Database Integrations */}
        <div className="mb-20">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
            Collect studies from anywhere
          </h3>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-8">
            When you review literature in Silvi you can import studies from anywhere. Silvi is even integrated directly to some databases, letting you save a search with one click.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {databaseIntegrations.map((db) => (
              <a
                key={db.name}
                href="#"
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-3 hover:shadow-md hover:border-[#6B8E7B] transition-all duration-300 group"
              >
                <span className="text-xl">{db.icon}</span>
                <span className="font-medium text-gray-700 group-hover:text-[#6B8E7B]">{db.name}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#6B8E7B] group-hover:translate-x-1 transition-all" />
              </a>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="space-y-24 md:space-y-32">
          {features.slice(1).map((feature, index) => (
            <div
              key={feature.id}
              className={`flex flex-col ${feature.imagePosition === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 md:gap-20`}
            >
              <div className="flex-1 w-full max-w-lg">
                <FeatureIllustration featureId={feature.id} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>
                {feature.link && (
                  <a
                    href={feature.link.href}
                    className="inline-flex items-center gap-2 text-gray-700 font-medium hover:text-[#6B8E7B] transition-colors group"
                  >
                    {feature.link.text}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
