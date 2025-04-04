import React, { useState } from 'react';
import { FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';

export default function FilterSidebar({ filters, onFilterChange }) {
  const [openSections, setOpenSections] = useState({
    category: true,
    price: true,
    size: true,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryChange = (category) => {
    onFilterChange({
      ...filters,
      category
    });
  };

  const handlePriceRangeChange = (min, max) => {
    onFilterChange({
      ...filters,
      priceRange: [min, max]
    });
  };

  const handleSizeChange = (size) => {
    onFilterChange({
      ...filters,
      size
    });
  };

  const handleReset = () => {
    onFilterChange({
      category: '',
      priceRange: [0, 10000],
      size: '',
      sortBy: 'latest'
    });
  };

  // Predefined category options
  const categories = [
    'Men',
    'Women',
    'Kids',
    'Accessories',
    'Footwear'
  ];

  // Predefined price ranges
  const priceRanges = [
    { label: 'Under ₹500', min: 0, max: 500 },
    { label: '₹500 - ₹1000', min: 500, max: 1000 },
    { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
    { label: '₹2000 - ₹5000', min: 2000, max: 5000 },
    { label: 'Above ₹5000', min: 5000, max: 100000 }
  ];

  // Predefined size options
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FiFilter className="mr-2 text-gray-600" />
          <h2 className="text-lg font-medium">Filters</h2>
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-primary hover:underline"
        >
          Reset All
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div 
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => toggleSection('category')}
        >
          <h3 className="font-medium">Category</h3>
          {openSections.category ? (
            <FiChevronUp className="text-gray-500" />
          ) : (
            <FiChevronDown className="text-gray-500" />
          )}
        </div>
        
        {openSections.category && (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category} className="flex items-center">
                <input
                  type="radio"
                  id={`category-${category}`}
                  name="category"
                  checked={filters.category === category.toLowerCase()}
                  onChange={() => handleCategoryChange(category.toLowerCase())}
                  className="mr-2"
                />
                <label 
                  htmlFor={`category-${category}`}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  {category}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div 
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => toggleSection('price')}
        >
          <h3 className="font-medium">Price Range</h3>
          {openSections.price ? (
            <FiChevronUp className="text-gray-500" />
          ) : (
            <FiChevronDown className="text-gray-500" />
          )}
        </div>
        
        {openSections.price && (
          <div className="space-y-2">
            {priceRanges.map((range, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`price-${index}`}
                  name="priceRange"
                  checked={
                    filters.priceRange[0] === range.min && 
                    filters.priceRange[1] === range.max
                  }
                  onChange={() => handlePriceRangeChange(range.min, range.max)}
                  className="mr-2"
                />
                <label 
                  htmlFor={`price-${index}`}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  {range.label}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Size Filter */}
      <div className="mb-4">
        <div 
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => toggleSection('size')}
        >
          <h3 className="font-medium">Size</h3>
          {openSections.size ? (
            <FiChevronUp className="text-gray-500" />
          ) : (
            <FiChevronDown className="text-gray-500" />
          )}
        </div>
        
        {openSections.size && (
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`w-10 h-10 flex items-center justify-center text-sm border rounded-md ${
                  filters.size === size 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 