import React from 'react';
import { newsArticles } from '../data/mock';
import { Button } from './ui/button';

const NewsSection = () => {
  return (
    <section id="news" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Latest news
          </h2>
          <p className="text-lg text-gray-500">
            The latest news from Silvi
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {newsArticles.map((article) => (
            <a
              key={article.id}
              href="#"
              className="group block"
            >
              <div
                className="h-48 rounded-2xl mb-4 overflow-hidden relative"
                style={{ backgroundColor: article.color }}
              >
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#6B8E7B] transition-colors mb-2 leading-snug">
                {article.title}
              </h3>
              <p className="text-sm text-gray-500">{article.date}</p>
            </a>
          ))}
        </div>

        <div className="text-center">
          <Button className="bg-[#4A5A4F] hover:bg-[#3d4a41] text-white px-6 py-3 rounded-full font-medium">
            See all news
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
