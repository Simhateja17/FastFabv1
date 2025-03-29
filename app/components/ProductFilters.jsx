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
    { label: "₹500 - ₹1000", min: 500, max: 1000 },
    { label: "₹1000 - ₹2000", min: 1000, max: 2000 },
    { label: "₹2000 - ₹5000", min: 2000, max: 5000 },
    { label: "Above ₹5000", min: 5000, max: null },
  ],
  sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
    { label: "Popular", value: "popular" },
  ],
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    category: false,
    subcategory: false,
    size: false,
    price: false,
    sort: false,
  });

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

  const handlePriceRangeChange = (min, max) => {
    setFilters(prev => ({
      ...prev,
      minPrice: min,
      maxPrice: max,
    }));
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
      {/* Mobile filter dialog */}
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
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600'
                        }`}
                      >
                        <span>{range.label}</span>
                        {filters.minPrice === range.min && filters.maxPrice === range.max && (
                          <FiCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b pb-4">
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

            <div className="mt-4 flex justify-between">
              <button
                onClick={clearAllFilters}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                Clear all filters
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop filters */}
      <div className="bg-white">
        <div className="border-b border-gray-200">
          <div className="flex w-full items-center justify-between py-4">
            <div className="flex flex-1 items-center space-x-4">
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <FiFilter className="mr-2 h-5 w-5" />
                <span>Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              <div className="hidden md:flex md:items-center md:space-x-2">
                {/* Desktop filter items */}
                <div className="relative inline-block text-left">
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      onClick={() => toggleSection('category')}
                    >
                      <span>{filters.category || 'Category'}</span>
                      <FiChevronDown
                        className={`ml-2 h-4 w-4 transform ${openSections.category ? 'rotate-180' : ''} transition-transform`}
                      />
                    </button>
                  </div>

                  {openSections.category && (
                    <div className="absolute left-0 z-10 mt-2 w-40 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        {availableCategories.map((category) => (
                          <button
                            key={category}
                            onClick={() => handleCategoryChange(category)}
                            className={`block w-full px-4 py-2 text-left text-sm ${
                              filters.category === category ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {filters.category && (
                  <div className="relative inline-block text-left">
                    <div>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        onClick={() => toggleSection('subcategory')}
                      >
                        <span>{filters.subcategory || 'Subcategory'}</span>
                        <FiChevronDown
                          className={`ml-2 h-4 w-4 transform ${openSections.subcategory ? 'rotate-180' : ''} transition-transform`}
                        />
                      </button>
                    </div>

                    {openSections.subcategory && (
                      <div className="absolute left-0 z-10 mt-2 w-40 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                        <div className="py-1">
                          {subcategories.map((subcategory) => (
                            <button
                              key={subcategory}
                              onClick={() => handleSubcategoryChange(subcategory)}
                              className={`block w-full px-4 py-2 text-left text-sm ${
                                filters.subcategory === subcategory ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              }`}
                            >
                              {subcategory}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative inline-block text-left">
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      onClick={() => toggleSection('size')}
                    >
                      <span>{filters.size || 'Size'}</span>
                      <FiChevronDown
                        className={`ml-2 h-4 w-4 transform ${openSections.size ? 'rotate-180' : ''} transition-transform`}
                      />
                    </button>
                  </div>

                  {openSections.size && (
                    <div className="absolute left-0 z-10 mt-2 w-60 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="p-3 grid grid-cols-4 gap-2">
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
                    </div>
                  )}
                </div>

                <div className="relative inline-block text-left">
                  <div>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      onClick={() => toggleSection('price')}
                    >
                      <RiPriceTag3Line className="mr-2 h-4 w-4" />
                      <span>Price</span>
                      <FiChevronDown
                        className={`ml-2 h-4 w-4 transform ${openSections.price ? 'rotate-180' : ''} transition-transform`}
                      />
                    </button>
                  </div>

                  {openSections.price && (
                    <div className="absolute left-0 z-10 mt-2 w-48 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        {availablePriceRanges.map((range, index) => (
                          <button
                            key={index}
                            onClick={() => handlePriceRangeChange(range.min, range.max)}
                            className={`block w-full px-4 py-2 text-left text-sm ${
                              filters.minPrice === range.min && filters.maxPrice === range.max
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center space-x-4">
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="hidden md:block text-sm font-medium text-primary hover:text-primary-dark"
                >
                  Clear all
                </button>
              )}
              
              <div className="relative inline-block text-left">
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    onClick={() => toggleSection('sort')}
                  >
                    <TbArrowsSort className="mr-2 h-4 w-4" />
                    <span>Sort</span>
                    <FiChevronDown
                      className={`ml-2 h-4 w-4 transform ${openSections.sort ? 'rotate-180' : ''} transition-transform`}
                    />
                  </button>
                </div>

                {openSections.sort && (
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSortChange(option.value)}
                          className={`block w-full px-4 py-2 text-left text-sm ${
                            filters.sort === option.value ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active filter tags */}
          {getActiveFiltersCount() > 0 && (
            <div className="flex flex-wrap items-center gap-2 py-3">
              {filters.category && (
                <div className="inline-flex items-center rounded-full bg-gray-100 py-1 pl-3 pr-2 text-sm">
                  <span>{filters.category}</span>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("")}
                    className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.subcategory && (
                <div className="inline-flex items-center rounded-full bg-gray-100 py-1 pl-3 pr-2 text-sm">
                  <span>{filters.subcategory}</span>
                  <button
                    type="button"
                    onClick={() => handleSubcategoryChange("")}
                    className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.size && (
                <div className="inline-flex items-center rounded-full bg-gray-100 py-1 pl-3 pr-2 text-sm">
                  <span>Size: {filters.size}</span>
                  <button
                    type="button"
                    onClick={() => handleSizeChange("")}
                    className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {(filters.minPrice !== null || filters.maxPrice !== null) && (
                <div className="inline-flex items-center rounded-full bg-gray-100 py-1 pl-3 pr-2 text-sm">
                  <span>
                    {filters.minPrice === null
                      ? `Under ₹${filters.maxPrice}`
                      : filters.maxPrice === null
                      ? `Above ₹${filters.minPrice}`
                      : `₹${filters.minPrice} - ₹${filters.maxPrice}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePriceRangeChange(null, null)}
                    className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {filters.sort && (
                <div className="inline-flex items-center rounded-full bg-gray-100 py-1 pl-3 pr-2 text-sm">
                  <span>
                    Sort: {sortOptions.find(option => option.value === filters.sort)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSortChange("")}
                    className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 