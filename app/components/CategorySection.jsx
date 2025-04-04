import React from 'react';
import Link from 'next/link';

export default function CategorySection() {
  const categories = [
    {
      name: 'Men&apos;s Clothing',
      image: '/categories/mens.jpg',
      url: '/products/category/men',
      items: '237+ Items'
    },
    {
      name: 'Women&apos;s Clothing',
      image: '/categories/womens.jpg',
      url: '/products/category/women',
      items: '320+ Items'
    },
    {
      name: 'Accessories',
      image: '/categories/accessories.jpg',
      url: '/products/category/accessories',
      items: '158+ Items'
    },
    {
      name: 'Footwear',
      image: '/categories/footwear.jpg',
      url: '/products/category/footwear',
      items: '180+ Items'
    }
  ];

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Shop by Category
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our wide range of products across different categories to find exactly what you&apos;re looking for.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link 
              key={index} 
              href={category.url}
              className="group relative block overflow-hidden rounded-lg bg-gray-100 transition-all hover:shadow-md"
            >
              {/* Category image placeholder */}
              <div className="aspect-square bg-gray-200 relative">
                {/* Replace with actual image in production */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-300 bg-opacity-10 group-hover:bg-opacity-30 transition-all">
                  <span className="text-xl font-medium text-gray-800">{category.name}</span>
                </div>
              </div>
              
              <div className="p-4 bg-white">
                <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500">{category.items}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 