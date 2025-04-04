import React from 'react';
import Link from 'next/link';

export default function PageHero({ title, subtitle, breadcrumbs }) {
  return (
    <div className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{title}</h1>
          {subtitle && <p className="text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          
          {breadcrumbs && (
            <div className="flex justify-center mt-4 text-sm">
              <ul className="flex items-center space-x-2">
                <li>
                  <Link href="/" className="text-primary hover:text-primary-dark">
                    Home
                  </Link>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-primary hover:text-primary-dark">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-600">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 