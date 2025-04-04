import React from 'react';
import { FiStar } from 'react-icons/fi';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Fashion Enthusiast',
      quote: 'Fast & Fab has completely transformed my shopping experience. The quality of their products is exceptional, and the delivery is always on time.',
      rating: 5,
      avatar: '/avatars/customer1.jpg',
    },
    {
      name: 'Rahul Patel',
      role: 'Regular Customer',
      quote: 'I&apos;ve been shopping here for over a year now. Their collection is always up-to-date with the latest trends, and their customer service is top-notch!',
      rating: 5,
      avatar: '/avatars/customer2.jpg',
    },
    {
      name: 'Ananya Singh',
      role: 'Style Blogger',
      quote: 'As a style blogger, I&apos;m very particular about where I shop. Fast & Fab has been my go-to destination for unique pieces that make a statement.',
      rating: 4,
      avatar: '/avatars/customer3.jpg',
    }
  ];

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <FiStar 
        key={index} 
        className={`w-5 h-5 ${index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don&apos;t just take our word for it. Hear what our satisfied customers have to say about their shopping experience with Fast & Fab.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden mr-4">
                  {/* Placeholder for avatar */}
                  <div className="w-full h-full flex items-center justify-center bg-primary text-white">
                    {testimonial.name.charAt(0)}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{testimonial.name}</h3>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="flex mb-3">
                {renderStars(testimonial.rating)}
              </div>
              
              <p className="text-gray-600 italic">&quot;{testimonial.quote}&quot;</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 