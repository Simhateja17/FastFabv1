import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAdminApiClient } from '@/app/utils/apiClient';
import { calculateAdjustedPrice } from '@/app/utils/priceAdjustment';

// Use the frontend Next.js API routes
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const PriceAdjustment = () => {
  // State for statistics data
  const [stats, setStats] = useState(null);

  // State for adjustment form
  const [adjustmentType, setAdjustmentType] = useState('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentDirection, setAdjustmentDirection] = useState('increase');
  const [maxAdjustment, setMaxAdjustment] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [applyToActive, setApplyToActive] = useState(true);
  const [applyToInactive, setApplyToInactive] = useState(false);
  const [affectMrpPrice, setAffectMrpPrice] = useState(false);

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);

  // Fetch initial statistics
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch product statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const apiClient = getAdminApiClient();
      const response = await apiClient.get(`/api/admin/price-adjustment/stats`);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching price adjustment stats:', error);
      setError('Failed to load product statistics. Please try again.');
      setLoading(false);
    }
  };

  // Search for products
  const searchProducts = async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    try {
      setIsSearching(true);
      // Make a request to search products
      const apiClient = getAdminApiClient();
      const response = await apiClient.get(`/api/admin/products?search=${searchTerm}`);
      
      // Format and limit results
      const formattedResults = response.data
        .slice(0, 10)
        .map((product) => ({
          id: product.id,
          name: product.name,
          sellingPrice: product.sellingPrice,
          mrpPrice: product.mrpPrice,
          category: product.category,
          shopName: product.seller?.shopName || 'Unknown Shop',
        }));
        
      setSearchResults(formattedResults);
      setIsSearching(false);
    } catch (error) {
      console.error('Error searching products:', error);
      setIsSearching(false);
      setError('Failed to search products. Please try again.');
    }
  };

  // Handle adding product to selected list
  const addProductToSelected = (product) => {
    if (!selectedProducts.some((p) => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, product]);
      setSearchResults([]);
      setSearchTerm('');
    }
  };

  // Handle removing product from selected list
  const removeProductFromSelected = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  // Calculate adjustment for preview
  const calculateAdjustment = (price, mrpPrice) => {
    return calculateAdjustedPrice(
      price,
      mrpPrice,
      adjustmentValue,
      adjustmentType,
      adjustmentDirection,
      maxAdjustment
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare base request data
      const requestData = {
        adjustmentType,
        adjustmentValue: parseFloat(adjustmentValue) * (adjustmentDirection === 'increase' ? 1 : -1),
        maxAdjustment: maxAdjustment ? parseFloat(maxAdjustment) : null,
        applyToActive,
        applyToInactive,
        affectMrpPrice,
      };
      
      let response;
      const apiClient = getAdminApiClient();
      
      // Call the appropriate API based on target type
      if (targetType === 'all') {
        response = await apiClient.post(
          `/api/admin/price-adjustment/all`,
          requestData
        );
      } else if (targetType === 'category') {
        if (!selectedCategory) {
          setError('Please select a category');
          setLoading(false);
          return;
        }
        
        response = await apiClient.post(
          `/api/admin/price-adjustment/category/${selectedCategory}`,
          requestData
        );
      } else if (targetType === 'specific') {
        if (selectedProducts.length === 0) {
          setError('Please select at least one product');
          setLoading(false);
          return;
        }
        
        response = await apiClient.post(
          `/api/admin/price-adjustment/products`,
          {
            ...requestData,
            productIds: selectedProducts.map((p) => p.id),
          }
        );
      }
      
      // Set result and success message
      setResult(response.data);
      setSuccess(response.data.message);
      setLoading(false);
      
      // Refresh statistics after successful update
      fetchStats();
    } catch (error) {
      console.error('Error adjusting prices:', error);
      setError(error.response?.data?.message || 'Failed to adjust prices. Please try again.');
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setAdjustmentType('percentage');
    setAdjustmentValue(0);
    setAdjustmentDirection('increase');
    setMaxAdjustment('');
    setTargetType('all');
    setSelectedCategory('');
    setSelectedProducts([]);
    setApplyToActive(true);
    setApplyToInactive(false);
    setAffectMrpPrice(false);
    setResult(null);
  };

  // Handle search input changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        searchProducts();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4">Product Price Adjustment</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Statistics Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Product Statistics</h2>
          {loading && !stats?.totalProducts ? (
            <div className="flex justify-center my-6">
              <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <span className="text-2xl font-bold text-blue-600">{stats?.totalProducts}</span>
                <p className="text-gray-600 text-sm">Total Products</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <span className="text-2xl font-bold text-green-600">{stats?.activeProducts}</span>
                <p className="text-gray-600 text-sm">Active Products</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <span className="text-2xl font-bold text-red-600">{stats?.inactiveProducts}</span>
                <p className="text-gray-600 text-sm">Inactive Products</p>
              </div>
            </div>
          )}
          
          {/* Categories */}
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">Top Categories</h3>
            <div className="flex flex-wrap gap-2">
              {stats?.categories?.slice(0, 10).map((category) => (
                <span
                  key={category.name}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm cursor-pointer hover:bg-blue-100"
                  onClick={() => {
                    setTargetType('category');
                    setSelectedCategory(category.name);
                  }}
                >
                  {category.name} ({category.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Price Adjustment Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Adjust Prices</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4">
                {/* Adjustment Type */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Price Adjustment Method</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="percentage"
                        checked={adjustmentType === 'percentage'}
                        onChange={() => setAdjustmentType('percentage')}
                        className="mr-2"
                      />
                      Percentage
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="fixed"
                        checked={adjustmentType === 'fixed'}
                        onChange={() => setAdjustmentType('fixed')}
                        className="mr-2"
                      />
                      Fixed Amount (₹)
                    </label>
                  </div>
                </div>
                
                {/* Adjustment Value & Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {adjustmentType === 'percentage' ? 'Percentage' : 'Amount (₹)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={adjustmentValue}
                        onChange={(e) => setAdjustmentValue(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                      <span className="absolute right-3 top-2 text-gray-500">
                        {adjustmentType === 'percentage' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Direction
                    </label>
                    <select
                      value={adjustmentDirection}
                      onChange={(e) => setAdjustmentDirection(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                    </select>
                  </div>
                </div>
                
                {/* Max Adjustment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Adjustment per Product (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={maxAdjustment}
                      onChange={(e) => setMaxAdjustment(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Leave empty for no limit"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">₹</span>
                  </div>
                </div>
                
                <div className="my-4 border-t border-gray-200 pt-4">
                  <h3 className="text-md font-semibold mb-2">Target Products</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="targetType"
                        value="all"
                        checked={targetType === 'all'}
                        onChange={() => setTargetType('all')}
                        className="mr-2"
                      />
                      All Products
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="targetType"
                        value="category"
                        checked={targetType === 'category'}
                        onChange={() => setTargetType('category')}
                        className="mr-2"
                      />
                      By Category
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="targetType"
                        value="specific"
                        checked={targetType === 'specific'}
                        onChange={() => setTargetType('specific')}
                        className="mr-2"
                      />
                      Specific Products
                    </label>
                  </div>
                </div>
                
                {/* Category Selection */}
                {targetType === 'category' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required={targetType === 'category'}
                    >
                      <option value="">Select a category</option>
                      {stats?.categories?.map((category) => (
                        <option key={category.name} value={category.name}>
                          {category.name} ({category.count} products)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Product Selection */}
                {targetType === 'specific' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search for products
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Type at least 2 characters to search"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-2 animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                      )}
                    </div>
                    
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-auto">
                        <ul className="divide-y divide-gray-200">
                          {searchResults.map((product) => (
                            <li
                              key={product.id}
                              className="p-2 hover:bg-gray-50 cursor-pointer"
                              onClick={() => addProductToSelected(product)}
                            >
                              <div className="text-sm font-medium">{product.name}</div>
                              <div className="text-xs text-gray-500">
                                ₹{product.sellingPrice} | {product.category} | {product.shopName}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Selected Products */}
                    {selectedProducts.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Selected Products ({selectedProducts.length})
                        </h4>
                        <div className="border border-gray-200 rounded-md max-h-40 overflow-auto">
                          <ul className="divide-y divide-gray-200">
                            {selectedProducts.map((product) => {
                              const newPrice = calculateAdjustment(product.sellingPrice, product.mrpPrice);
                              const wouldExceedMrp = product.sellingPrice + 
                                (adjustmentType === 'percentage' 
                                  ? (product.sellingPrice * parseFloat(adjustmentValue) * (adjustmentDirection === 'increase' ? 1 : -1)) / 100 
                                  : parseFloat(adjustmentValue) * (adjustmentDirection === 'increase' ? 1 : -1)) 
                                > product.mrpPrice;
                              
                              return (
                                <li key={product.id} className="p-2 flex justify-between items-center">
                                  <div>
                                    <div className="text-sm font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500">
                                      Current: ₹{product.sellingPrice} → New: ₹
                                      {calculateAdjustment(product.sellingPrice, product.mrpPrice).toFixed(2)}
                                      {wouldExceedMrp && (
                                        <span className="text-orange-500 ml-1">
                                          (capped at MRP: ₹{product.mrpPrice})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="text-red-500 text-sm hover:text-red-700"
                                    onClick={() => removeProductFromSelected(product.id)}
                                  >
                                    Remove
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="my-4 border-t border-gray-200 pt-4">
                  <h3 className="text-md font-semibold mb-2">Additional Options</h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={applyToActive}
                        onChange={(e) => setApplyToActive(e.target.checked)}
                        className="mr-2"
                      />
                      Apply to Active Products
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={applyToInactive}
                        onChange={(e) => setApplyToInactive(e.target.checked)}
                        className="mr-2"
                      />
                      Apply to Inactive Products
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={affectMrpPrice}
                        onChange={(e) => setAffectMrpPrice(e.target.checked)}
                        className="mr-2"
                      />
                      Also adjust MRP price
                    </label>
                  </div>
                  
                  <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Note: The selling price will never exceed the MRP of the product, regardless of the adjustment value.</p>
                    </div>
                  </div>
                </div>
                
                {/* Submit buttons */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-grow px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent animate-spin"></span>
                        Processing...
                      </>
                    ) : (
                      'Apply Price Changes'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    onClick={resetForm}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        {/* Results Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <h2 className="text-lg font-semibold mb-4">Adjustment Results</h2>
            
            {!result ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>Apply a price adjustment to see the results here</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p>{result.message}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-md font-semibold mb-2">Adjustment Summary</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <span className="text-xl font-bold text-blue-600">{result.updatedCount}</span>
                      <p className="text-gray-600 text-sm">Products Updated</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <span className={`text-xl font-bold ${result.avgPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(result.avgPriceChange).toFixed(2)}
                      </span>
                      <p className="text-gray-600 text-sm">
                        Avg. Price {result.avgPriceChange >= 0 ? 'Increase' : 'Decrease'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-md font-semibold mb-2">Details</h3>
                    
                    <ul className="text-sm space-y-2 border border-gray-200 rounded-md divide-y divide-gray-200">
                      <li className="p-2 bg-gray-50">
                        <span className="font-medium">Adjustment Type:</span>{' '}
                        {result.adjustmentType === 'percentage' 
                          ? `Percentage (${Math.abs(result.adjustmentValue)}%)`
                          : `Fixed Amount (₹${Math.abs(result.adjustmentValue)})`}
                      </li>
                      
                      <li className="p-2">
                        <span className="font-medium">Direction:</span>{' '}
                        {result.adjustmentValue >= 0 ? 'Increase' : 'Decrease'}
                      </li>
                      
                      {result.category && (
                        <li className="p-2 bg-gray-50">
                          <span className="font-medium">Category:</span> {result.category}
                        </li>
                      )}
                      
                      <li className="p-2">
                        <span className="font-medium">Total Price Change:</span>{' '}
                        ₹{Math.abs(result.totalPriceChange).toFixed(2)}{' '}
                        {result.totalPriceChange >= 0 ? 'increase' : 'decrease'}
                      </li>
                    </ul>
                  </div>
                  
                  {/* Product Results (if specific products were updated) */}
                  {result.productsResults && result.productsResults.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Product Changes</h3>
                      
                      <div className="border border-gray-200 rounded-md max-h-60 overflow-auto">
                        <ul className="divide-y divide-gray-200">
                          {result.productsResults.map((product) => (
                            <li key={product.id} className="p-2">
                              <div className="text-sm font-medium">{product.name}</div>
                              <div className="text-xs text-gray-500">
                                ₹{product.oldSellingPrice} → ₹{product.newSellingPrice}{' '}
                                ({product.priceChange >= 0 ? '+' : ''}₹{product.priceChange.toFixed(2)})
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceAdjustment; 