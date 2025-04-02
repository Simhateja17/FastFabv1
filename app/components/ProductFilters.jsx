"use client";

import { useState, useEffect } from "react";
import { FiFilter, FiChevronDown, FiX, FiCheck } from "react-icons/fi";
import { RiPriceTag3Line } from "react-icons/ri";
import { TbArrowsSort } from "react-icons/tb";
import { BsGrid } from "react-icons/bs";

export default function ProductFilters({ 
  filters, 
  setFilters,
  availableCategories = ["MEN", "WOMEN"],
  menSubcategories = ["T-shirts", "Shirts", "Trousers", "Jeans", "Jackets"],
  womenSubcategories = ["Dresses", "Tops", "Skirts", "Jeans", "Jackets"],
  availableSizes = ["XS", "S", "M", "L", "XL", "XXL"],
  availablePriceRanges = [
    { label: "Under ₹500", min: 0, max: 500 },
    { label: "₹500 - ₹999", min: 500, max: 1000 },
    { label: "₹1000 - ₹1999", min: 1000, max: 2000 },
    { label: "₹2000 - ₹4999", min: 2000, max: 5000 },
    { label: "₹5000 & Above", min: 5000, max: null },
  ],
  sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
    { label: "Popular", value: "popular" },
  ],
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [openSections, setOpenSections] = useState({
    category: true,
    subcategory: false,
    size: true,
    price: true,
    sort: false,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryChange = (category) => {
    setFilters(prev => ({
      ...prev,
      category,
      subcategory: "", // Reset subcategory when category changes
    }));
  };

  const handleSubcategoryChange = (subcategory) => {
    setFilters(prev => ({
      ...prev,
      subcategory,
    }));
  };

  const handleSizeChange = (size) => {
    setFilters(prev => ({
      ...prev,
      size: prev.size === size ? "" : size, // Toggle size selection
    }));
  };

  // Add a useEffect to log filter changes for debugging
  useEffect(() => {
    console.log("Filter state updated:", filters);
    // Validate that the price filter is correctly set
    if (filters.minPrice === 5000 && filters.maxPrice === null) {
      console.log("₹5000 & Above filter is active");
    }
  }, [filters]);

  const handlePriceRangeChange = (min, max) => {
    console.log("Price range change requested:", { min, max });
    
    // If clicking the same range, toggle it off
    if (filters.minPrice === min && filters.maxPrice === max) {
      console.log("Toggling off price filter");
      setFilters(prev => ({
        ...prev,
        minPrice: null,
        maxPrice: null,
      }));
    } else {
      // For "₹5000 & Above", ensure max is null, not undefined
      if (min === 5000 && max === null) {
        console.log("Setting ₹5000 & Above filter");
      }
      
      setFilters(prev => ({
        ...prev,
        minPrice: min,
        maxPrice: max,
      }));
    }
  };

  const handleSortChange = (sortOption) => {
    setFilters(prev => ({
      ...prev,
      sort: sortOption,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      category: "",
      subcategory: "",
      size: "",
      minPrice: null,
      maxPrice: null,
      sort: "",
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.subcategory) count++;
    if (filters.size) count++;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    return count;
  };

  // Get subcategories based on selected category
  const subcategories = filters.category === "MEN" 
    ? menSubcategories 
    : filters.category === "WOMEN" 
      ? womenSubcategories 
      : [];

  return (
    <>
      {/* Mobile filter dialog - Conditionally render based on isClient to avoid hydration mismatch */}
      {isClient && (
        <div className={`fixed inset-0 z-40 ${mobileFiltersOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl">
            <div className="flex items-center justify-between px-4 pb-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
              <button
                type="button"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile filters */}
            <div className="mt-4 px-4">
              <div className="border-b pb-4">
                <button
                  onClick={() => toggleSection('category')}
                  className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
                >
                  <span className="font-medium">Category</span>
                  <FiChevronDown
                    className={`h-5 w-5 transform ${openSections.category ? 'rotate-180' : ''} transition-transform`}
                  />
                </button>
                {openSections.category && (
                  <div className="space-y-2 pt-2">
                    {availableCategories.map((category) => (
                      <div key={category} className="flex items-center">
                        <button
                          onClick={() => handleCategoryChange(category)}
                          className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md ${
                            filters.category === category ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          <span>{category}</span>
                          {filters.category === category && <FiCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {filters.category && (
                <div className="border-b pb-4">
                  <button
                    onClick={() => toggleSection('subcategory')}
                    className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
                  >
                    <span className="font-medium">Subcategory</span>
                    <FiChevronDown
                      className={`h-5 w-5 transform ${openSections.subcategory ? 'rotate-180' : ''} transition-transform`}
                    />
                  </button>
                  {openSections.subcategory && (
                    <div className="space-y-2 pt-2">
                      {subcategories.map((subcategory) => (
                        <div key={subcategory} className="flex items-center">
                          <button
                            onClick={() => handleSubcategoryChange(subcategory)}
                            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md ${
                              filters.subcategory === subcategory ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            <span>{subcategory}</span>
                            {filters.subcategory === subcategory && <FiCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-b pb-4">
                <button
                  onClick={() => toggleSection('size')}
                  className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
                >
                  <span className="font-medium">Size</span>
                  <FiChevronDown
                    className={`h-5 w-5 transform ${openSections.size ? 'rotate-180' : ''} transition-transform`}
                  />
                </button>
                {openSections.size && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => handleSizeChange(size)}
                        className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm ${
                          filters.size === size
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b pb-4">
                <button
                  onClick={() => toggleSection('price')}
                  className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
                >
                  <span className="font-medium">Price</span>
                  <FiChevronDown
                    className={`h-5 w-5 transform ${openSections.price ? 'rotate-180' : ''} transition-transform`}
                  />
                </button>
                {openSections.price && (
                  <div className="space-y-2 pt-2">
                    {availablePriceRanges.map((range, index) => (
                      <div key={index} className="flex items-center">
                        <button
                          onClick={() => handlePriceRangeChange(range.min, range.max)}
                          className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md ${
                            filters.minPrice === range.min && filters.maxPrice === range.max
                              ? 'bg-primary text-white font-semibold'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span>{range.label}</span>
                          {filters.minPrice === range.min && filters.maxPrice === range.max && <FiCheck className="h-4 w-4 text-white" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pb-4">
                <button
                  onClick={() => toggleSection('sort')}
                  className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
                >
                  <span className="font-medium">Sort By</span>
                  <FiChevronDown
                    className={`h-5 w-5 transform ${openSections.sort ? 'rotate-180' : ''} transition-transform`}
                  />
                </button>
                {openSections.sort && (
                  <div className="space-y-2 pt-2">
                    {sortOptions.map((option) => (
                      <div key={option.value} className="flex items-center">
                        <button
                          onClick={() => handleSortChange(option.value)}
                          className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md ${
                            filters.sort === option.value ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                          }`}
                        >
                          <span>{option.label}</span>
                          {filters.sort === option.value && <FiCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Clear All Button */}
            <div className="px-4 mt-auto pt-4 border-t">
              <button
                onClick={clearAllFilters}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop filters */}
      <div className="hidden lg:block border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-lg font-semibold text-primary">Filters</h3>
          <button 
            onClick={clearAllFilters} 
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            disabled={getActiveFiltersCount() === 0}
          >
            Clear All
          </button>
        </div>
        
        {/* Category Section - Always Open */}      
        <div className="border-b pb-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Category</h4>
          <div className="space-y-2 pt-2">
            {availableCategories.map((category) => (
              <div key={category} className="flex items-center">
                <button
                  onClick={() => handleCategoryChange(category)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm ${
                    filters.category === category ? 'bg-primary bg-opacity-10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{category}</span>
                  {filters.category === category && <FiCheck className="h-4 w-4 text-primary" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subcategory Section - Conditional & Collapsible */}
        {filters.category && (
          <div className="border-b pb-4 mb-4">
            <button
              onClick={() => toggleSection('subcategory')}
              className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
            >
              <span className="font-medium">Subcategory</span>
              <FiChevronDown
                className={`h-5 w-5 transform ${openSections.subcategory ? 'rotate-180' : ''} transition-transform`}
              />
            </button>
            {openSections.subcategory && (
              <div className="space-y-2 pt-2">
                {subcategories.map((subcategory) => (
                  <div key={subcategory} className="flex items-center">
                    <button
                      onClick={() => handleSubcategoryChange(subcategory)}
                      className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm ${
                        filters.subcategory === subcategory ? 'bg-primary bg-opacity-10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{subcategory}</span>
                      {filters.subcategory === subcategory && <FiCheck className="h-4 w-4 text-primary" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Size Section - Always Open */}      
        <div className="border-b pb-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Size</h4>
           <div className="grid grid-cols-3 gap-2 pt-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  filters.size === size
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Price Section - Always Open - Restore Correct Mapping */}      
        <div className="border-b pb-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Price</h4>
          <div className="space-y-2 pt-2">
            {/* Ensure we are mapping over the correct availablePriceRanges prop */} 
            {availablePriceRanges.map(({ label, min, max }) => (
              // Use label as key assuming labels are unique, or use index if necessary
              <div key={label} className="flex items-center">
                <button
                  onClick={() => handlePriceRangeChange(min, max)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors duration-150 ${
                    filters.minPrice === min && filters.maxPrice === max
                      ? 'bg-primary text-white font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{label}</span>
                  {filters.minPrice === min && filters.maxPrice === max && <FiCheck className="h-4 w-4 text-white" />}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sort Section - Collapsible */}
        <div className="pb-4">
          <button
            onClick={() => toggleSection('sort')}
            className="flex w-full items-center justify-between py-2 text-sm text-gray-900 hover:text-gray-600"
          >
            <span className="font-medium">Sort By</span>
            <FiChevronDown
              className={`h-5 w-5 transform ${openSections.sort ? 'rotate-180' : ''} transition-transform`}
            />
          </button>
          {openSections.sort && (
            <div className="space-y-2 pt-2">
              {sortOptions.map((option) => (
                <div key={option.value} className="flex items-center">
                  <button
                    onClick={() => handleSortChange(option.value)}
                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm ${
                      filters.sort === option.value
                        ? 'bg-primary bg-opacity-10 text-primary font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{option.label}</span>
                    {filters.sort === option.value && <FiCheck className="h-4 w-4 text-primary" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
} 