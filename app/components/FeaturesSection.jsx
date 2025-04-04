import React from 'react';
import { FiTruck, FiCreditCard, FiRefreshCw, FiHeadphones } from 'react-icons/fi';

export default function FeaturesSection() {
  const features = [
    {
      icon: <FiTruck className="w-8 h-8" />,
      title: 'Free Shipping',
      description: 'Free shipping on all orders over ₹999'
    },
    {
      icon: <FiCreditCard className="w-8 h-8" />,
      title: 'Secure Payment',
      description: 'Multiple payment methods accepted'
    },
    {
      icon: <FiRefreshCw className="w-8 h-8" />,
      title: 'Easy Returns',
      description: '15-day easy return policy'
    },
    {
      icon: <FiHeadphones className="w-8 h-8" />,
      title: '24/7 Support',
      description: 'Dedicated support team'
    }
  ];

  return (
    <div className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Shop With Us
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 text-primary rounded-full mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 