import React from 'react';
import { footerLinks } from '../data/mock';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-6 gap-8 mb-12">
          {/* Logo Column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#6B8E7B] rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <span className="text-xl font-semibold text-gray-800">Silvi</span>
            </div>
            <p className="text-gray-500 text-sm">
              Simple, transparent<br />
              & fast literature reviews!
            </p>
          </div>

          {/* Comparisons */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Comparisons</h4>
            <ul className="space-y-3">
              {footerLinks.comparisons.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-500 hover:text-[#6B8E7B] text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Import from */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Import from</h4>
            <ul className="space-y-3">
              {footerLinks.importFrom.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-500 hover:text-[#6B8E7B] text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-500 hover:text-[#6B8E7B] text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-500 hover:text-[#6B8E7B] text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-gray-100">
          <p className="text-gray-400 text-sm text-center">
            Copyright © 2025 Silvi ApS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
