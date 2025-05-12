"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/context/AdminAuthContext';
import LoadingSpinner from '@/app/components/LoadingSpinner';

export default function PromoCodesPage() {
  const router = useRouter();
  const { adminUser, loading: authLoading, isAuthenticated } = useAdminAuth();
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [userUsageLimit, setUserUsageLimit] = useState('1');
  const [isActive, setIsActive] = useState(true);
  
  // Check if user is admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      toast.error('Admin access required');
      router.push('/admin-login');
    }
  }, [authLoading, isAuthenticated, router]);
  
  // Fetch promo codes
  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      
      // Get the admin token from context
      const token = adminUser?.token;
      
      const response = await fetch('/api/admin/promo-codes', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPromoCodes(data.promoCodes);
      } else {
        toast.error(data.error || 'Failed to fetch promo codes');
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast.error('An error occurred while fetching promo codes');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      fetchPromoCodes();
    }
  }, [authLoading, isAuthenticated]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || !discountValue) {
      toast.error('Code and discount value are required');
      return;
    }
    
    try {
      setIsCreating(true);
      
      // Get the admin token from context
      const token = adminUser?.token;
      
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          code,
          discountType,
          discountValue,
          minOrderValue,
          maxDiscountAmount: maxDiscountAmount || null,
          startDate: startDate || null,
          endDate: endDate || null,
          usageLimit: usageLimit || null,
          userUsageLimit,
          isActive
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Promo code created successfully');
        resetForm();
        fetchPromoCodes();
      } else {
        toast.error(data.error || 'Failed to create promo code');
      }
    } catch (error) {
      console.error('Error creating promo code:', error);
      toast.error('An error occurred while creating the promo code');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMinOrderValue('0');
    setMaxDiscountAmount('');
    setStartDate('');
    setEndDate('');
    setUsageLimit('');
    setUserUsageLimit('1');
    setIsActive(true);
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" color="primary" />
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Promo Code Management</h1>
      
      {/* Create Promo Code Form */}
      <div className="bg-background-card p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Promo Code</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Code*
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. WELCOME20"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Discount Type*
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                required
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Discount Value*
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                  placeholder={discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 100'}
                  min="0"
                  step="any"
                  required
                />
                <span className="absolute right-3 top-2 text-text-muted">
                  {discountType === 'PERCENTAGE' ? '%' : '₹'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Min Order Value
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                  placeholder="e.g. 500"
                  min="0"
                  step="any"
                />
                <span className="absolute right-3 top-2 text-text-muted">₹</span>
              </div>
            </div>
            
            {discountType === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Max Discount Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                    placeholder="e.g. 200"
                    min="0"
                    step="any"
                  />
                  <span className="absolute right-3 top-2 text-text-muted">₹</span>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Total Usage Limit
              </label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                placeholder="Leave blank for unlimited"
                min="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                User Usage Limit
              </label>
              <input
                type="number"
                value={userUsageLimit}
                onChange={(e) => setUserUsageLimit(e.target.value)}
                className="w-full border border-ui-border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. 1"
                min="1"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-ui-border rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-text">
                Active
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400"
            >
              {isCreating ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Promo Codes List */}
      <div className="bg-background-card p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Existing Promo Codes</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="medium" color="primary" />
          </div>
        ) : promoCodes.length === 0 ? (
          <p className="text-text-muted text-center py-8">No promo codes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ui-border">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Min Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Validity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-card divide-y divide-ui-border">
                {promoCodes.map((promo) => (
                  <tr key={promo.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text">{promo.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        {promo.discountType === 'PERCENTAGE' 
                          ? `${promo.discountValue}%` 
                          : `₹${promo.discountValue}`}
                        {promo.maxDiscountAmount && promo.discountType === 'PERCENTAGE' && 
                          ` (max ₹${promo.maxDiscountAmount})`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">₹{promo.minOrderValue}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        {promo.usageCount} / {promo.usageLimit || '∞'}
                        <div className="text-xs text-text-muted">
                          {promo.userUsageLimit} per user
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        {new Date(promo.startDate).toLocaleDateString()}
                        {promo.endDate && 
                          ` - ${new Date(promo.endDate).toLocaleDateString()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        promo.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 