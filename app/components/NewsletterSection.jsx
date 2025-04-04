import React, { useState } from 'react';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStatus({ 
        type: 'success', 
        message: 'Thank you for subscribing to our newsletter!' 
      });
      setEmail('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setStatus(null);
      }, 3000);
    }, 1000);
    
    // In a real application, you would make an actual API call:
    // try {
    //   const response = await fetch('/api/newsletter', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email })
    //   });
    //   
    //   const data = await response.json();
    //   
    //   if (response.ok) {
    //     setStatus({ type: 'success', message: data.message });
    //     setEmail('');
    //   } else {
    //     setStatus({ type: 'error', message: data.message });
    //   }
    // } catch (error) {
    //   setStatus({ type: 'error', message: 'An error occurred. Please try again.' });
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="bg-primary py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Our Newsletter
          </h2>
          <p className="text-white opacity-90 mb-6">
            Stay updated with the latest trends, exclusive offers, and new arrivals.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow px-4 py-3 rounded-md focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-white text-primary font-medium px-6 py-3 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
            
            {status && (
              <div className={`mt-4 text-sm ${
                status.type === 'success' ? 'text-green-200' : 'text-red-200'
              }`}>
                {status.message}
              </div>
            )}
          </form>
          
          <p className="text-white opacity-70 text-sm mt-4">
            By subscribing, you agree to our privacy policy and consent to receive marketing emails.
          </p>
        </div>
      </div>
    </div>
  );
} 