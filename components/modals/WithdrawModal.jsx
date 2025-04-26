'use client';

import React, { useState, useContext } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const WithdrawModal = ({ isOpen, onClose, maxAmount = 0, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { authFetch } = useAuth();

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: 'Seller Name Placeholder',
    bankName: 'Bank Name Placeholder',
    accountNumber: '************1234',
    ifscCode: 'ABCD0123456',
  });

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
      setSuccessMessage('');
      if (value !== '' && parseFloat(value) > maxAmount) {
        setError('Amount cannot exceed available balance.');
      } else if (value !== '' && parseFloat(value) <= 0) {
          setError('Amount must be greater than zero.')
      }
    }
  };

  const handleWithdraw = async () => {
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount to withdraw.');
      return;
    }
    if (numericAmount > maxAmount) {
      setError('Amount cannot exceed available balance.');
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setIsWithdrawing(true);

    try {
        console.log('Attempting withdrawal with amount:', numericAmount);
        const response = await authFetch('/api/seller/payouts/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount: numericAmount }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Withdrawal failed: ${response.statusText}`);
        }

        console.log('Withdrawal successful:', data);
        setSuccessMessage(data.message || 'Withdrawal request submitted successfully!');

        if (onSubmit) {
            onSubmit(numericAmount);
        }

        setTimeout(() => {
            onClose(); 
        }, 2000);

    } catch (err) {
        console.error('Withdrawal API Error:', err);
        const errorMessage = err.message || 'An unexpected error occurred.';
        setError(errorMessage);
    } finally {
        setIsWithdrawing(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setRemarks('');
      setError('');
      setSuccessMessage('');
      setIsWithdrawing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Withdraw Your Earnings</h2>

        {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded text-center">
                {successMessage}
            </div>
        )}
        
        {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded text-center">
                {error}
            </div>
        )}

        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p>💰 Available Balance: <span className="font-medium">₹{maxAmount.toFixed(2)}</span></p>
        </div>

        <div className="mb-4 border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Withdraw To Bank Account</h3>
            <p><span className="font-semibold">Account Holder:</span> {bankDetails.accountHolderName}</p>
            <p><span className="font-semibold">Bank Name:</span> {bankDetails.bankName}</p>
            <p><span className="font-semibold">Account Number:</span> {bankDetails.accountNumber}</p>
            <p><span className="font-semibold">IFSC Code:</span> {bankDetails.ifscCode}</p>
             <p className="text-xs text-gray-500 mt-2">Ensure your bank details are up-to-date in your profile for successful payouts.</p>
        </div>

        <div className="mb-4 border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Withdrawal Details</h3>
             <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700 mb-1">
                 Amount to Withdraw (₹)
             </label>
             <input
                 type="text"
                 id="withdrawAmount"
                 value={amount}
                 onChange={handleAmountChange}
                 className={`w-full px-3 py-2 border rounded-md ${(error && !successMessage) ? 'border-red-500' : 'border-gray-300'}`}
                 placeholder="Enter amount"
                 inputMode="decimal"
                 disabled={isWithdrawing || !!successMessage}
             />
             <p className="text-xs text-gray-500 mt-1">Cannot exceed available balance: ₹{maxAmount.toFixed(2)}</p>


            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                Remarks (Optional)
            </label>
            <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="2"
                placeholder="Add a note for this withdrawal"
                disabled={isWithdrawing || !!successMessage}
            ></textarea>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 disabled:opacity-50"
            disabled={isWithdrawing}
          >
            Cancel
          </button>
          <button
            onClick={handleWithdraw}
            disabled={!!error || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount || isWithdrawing || !!successMessage}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isWithdrawing ? 'Processing...' : successMessage ? 'Submitted!' : 'Withdraw Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal; 