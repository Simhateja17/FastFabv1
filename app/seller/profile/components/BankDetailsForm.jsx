'use client';

import React, { useState, useEffect, useContext } from 'react';
// import { AuthContext } from '@/app/context/AuthContext'; // Incorrect import
import { useAuth } from '@/app/context/AuthContext'; // Correct: Import the custom hook

// Helper function to display status nicely
const formatStatus = (status) => {
    if (!status) return <span className="text-gray-500">Not Added</span>;
    switch (status) {
        case 'VERIFIED': return <span className="text-green-600 font-semibold">Verified</span>;
        case 'INITIATED': return <span className="text-blue-600 font-semibold">Verification Initiated</span>;
        case 'FAILED': return <span className="text-red-600 font-semibold">Verification Failed</span>;
        case 'INVALID': return <span className="text-red-600 font-semibold">Invalid Details</span>;
        default: return <span className="text-yellow-600 font-semibold">{status}</span>;
    }
};

const BankDetailsForm = () => {
    // const { authFetch } = useContext(AuthContext); // Don't use useContext directly
    const { authFetch } = useAuth(); // Correct: Use the custom hook
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false); // State to toggle form visibility
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [formData, setFormData] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
    });

    const fetchBankDetails = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await authFetch('/api/seller/bank-details');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch bank details');
            }
            console.log('Fetched bank details:', data);
            if (data.registered && data.details) {
                setDetails(data.details);
                // Pre-fill form if editing existing (though inputs are separate)
                setFormData({
                    accountHolderName: data.details.name || '',
                    accountNumber: '', // Don't pre-fill account number for security
                    ifscCode: data.details.ifsc || '',
                });
                 // Automatically show form if details are not verified or missing critical info
                 if(data.details.status !== 'VERIFIED') {
                     setIsEditing(true);
                 }
            } else {
                setDetails(null);
                setIsEditing(true); // Show form if no details registered
            }
        } catch (err) {
            console.error('Fetch Bank Details Error:', err);
            setError(err.message);
            setDetails(null); // Ensure no stale details are shown on error
            setIsEditing(true); // Allow user to try adding details
        } finally {
            setIsLoading(false);
        }
    }, [authFetch]);

    // Fetch current bank details on load
    useEffect(() => {
        fetchBankDetails();
    }, [fetchBankDetails]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null); // Clear errors on input change
        setSuccessMessage(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        // Basic frontend validation (more robust validation is in backend)
        if (!formData.accountHolderName || !formData.accountNumber || !formData.ifscCode) {
            setError('All fields are required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await authFetch('/api/seller/bank-details', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to save bank details');
            }
            setSuccessMessage(data.message || 'Bank details submitted successfully!');
            setDetails(data); // Update displayed details with response
            setIsEditing(false); // Hide form on success
            // Optionally clear form fields or refetch details
             fetchBankDetails(); // Refetch details to get latest status and masked number

        } catch (err) {
            console.error('Save Bank Details Error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Bank Account Details for Payouts</h3>

            {isLoading && <p>Loading bank details...</p>}

            {/* Display Existing Details (if any) */}
            {!isLoading && details && !isEditing && (
                <div className="mb-4 space-y-2">
                    <p><strong>Account Holder:</strong> {details.name}</p>
                    <p><strong>Account Number:</strong> {details.accountNumber || '************'}</p> {/* Show masked number from API */} 
                    <p><strong>IFSC Code:</strong> {details.ifsc}</p>
                    <p><strong>Status:</strong> {formatStatus(details.status)}</p>
                    {details.status !== 'VERIFIED' && (
                         <p className="text-sm text-orange-600">Payouts will be enabled once your account is verified.</p>
                    )}
                    <button
                        onClick={() => setIsEditing(true)}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                        Update Bank Details
                    </button>
                </div>
            )}
            
             {/* Display Message if No Details Added Yet and not editing */} 
             {!isLoading && !details && !isEditing && (
                 <div className="mb-4 text-center p-4 border border-gray-200 rounded">
                     <p className="text-gray-600 mb-2">You haven&apos;t added your bank account details yet.</p>
                      <button
                         onClick={() => setIsEditing(true)}
                         className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                     >
                         Add Bank Details
                     </button>
                 </div>
             )}

            {/* Edit/Add Form */} 
            {isEditing && (
                <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4 mt-4">
                    {successMessage && <p className="text-green-600 mb-2">{successMessage}</p>}
                    {error && <p className="text-red-500 mb-2">Error: {error}</p>}
                    
                    <div>
                        <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">Account Holder Name</label>
                        <input
                            type="text"
                            name="accountHolderName"
                            id="accountHolderName"
                            value={formData.accountHolderName}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">Bank Account Number</label>
                        <input
                            type="text" // Keep as text for flexibility, backend validates
                            name="accountNumber"
                            id="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter account number"
                        />
                    </div>
                    <div>
                        <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700">IFSC Code</label>
                        <input
                            type="text"
                            name="ifscCode"
                            id="ifscCode"
                            value={formData.ifscCode}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
                            placeholder="Enter IFSC code"
                            maxLength="11"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                         <button
                             type="button"
                             onClick={() => {
                                 setIsEditing(false);
                                 setError(null); // Clear error when cancelling
                                 // Reset form only if details were previously loaded
                                 if (details) {
                                      setFormData({
                                         accountHolderName: details.name || '',
                                         accountNumber: '',
                                         ifscCode: details.ifsc || '',
                                     });
                                 } else {
                                     setFormData({ accountHolderName: '', accountNumber: '', ifscCode: '' });
                                 }
                             }}
                             className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                             disabled={isLoading}
                         >
                             Cancel
                         </button>
                         <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Save Bank Details'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default BankDetailsForm; 