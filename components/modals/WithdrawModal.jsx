'use client';

import React, { useState, useContext, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Tab } from '@headlessui/react';
import { 
  BanknotesIcon, 
  CreditCardIcon, 
  QrCodeIcon, 
  WalletIcon, 
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Field masking utilities
const maskField = {
  accountNumber: (value) => {
    if (!value) return '';
    const visibleDigits = 4;
    const maskedPart = value.slice(0, -visibleDigits).replace(/./g, '*');
    const visiblePart = value.slice(-visibleDigits);
    return `${maskedPart}${visiblePart}`;
  },
  cardNumber: (value) => {
    if (!value || value.length !== 4) return value;
    return `****${value}`;
  },
  formatIFSC: (value) => {
    if (!value) return '';
    return value.toUpperCase().replace(/\s+/g, '');
  },
  formatUPI: (value) => {
    if (!value) return '';
    // Add @ if user hasn't included it and is typing
    if (value.length > 3 && !value.includes('@')) {
      return value;
    }
    return value;
  }
};

// Dynamic form field configuration by payment method
const formFieldConfigs = {
  BANK_TRANSFER: [
    {
      id: 'accountHolderName',
      label: 'Account Holder Name',
      type: 'text',
      required: true,
      placeholder: 'Enter account holder name',
      autoComplete: 'name'
    },
    {
      id: 'bankName',
      label: 'Bank Name',
      type: 'text',
      required: true,
      placeholder: 'Enter bank name',
      autoComplete: 'off'
    },
    {
      id: 'accountNumber',
      label: 'Account Number',
      type: 'text',
      required: true,
      placeholder: 'Enter account number',
      autoComplete: 'off',
      inputMode: 'numeric',
      mask: true,
      pattern: '[0-9]{9,18}'
    },
    {
      id: 'ifscCode',
      label: 'IFSC Code',
      type: 'text',
      required: true,
      placeholder: 'e.g., SBIN0123456',
      autoComplete: 'off',
      transform: 'uppercase'
    }
  ],
  UPI: [
    {
      id: 'upiId',
      label: 'UPI ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., mobilenumber@upi',
      autoComplete: 'off',
      hint: 'Enter your UPI ID in the format username@provider'
    },
    {
      id: 'holderName',
      label: 'Account Holder Name (Optional)',
      type: 'text',
      required: false,
      placeholder: 'Enter account holder name',
      autoComplete: 'name'
    }
  ],
  WALLET: [
    {
      id: 'walletProvider',
      label: 'Wallet Provider',
      type: 'select',
      required: true,
      options: [
        { id: 'paytm', name: 'Paytm' },
        { id: 'phonepe', name: 'PhonePe' },
        { id: 'amazon_pay', name: 'Amazon Pay' },
        { id: 'mobikwik', name: 'MobiKwik' },
        { id: 'freecharge', name: 'FreeCharge' },
        { id: 'ola_money', name: 'Ola Money' }
      ],
      placeholder: 'Select wallet provider'
    },
    {
      id: 'walletId',
      label: 'Mobile Number/ID',
      type: 'text',
      required: true,
      placeholder: 'Enter mobile number or wallet ID',
      autoComplete: 'tel',
      inputMode: 'tel',
      hint: 'For most wallets, use your registered mobile number'
    },
    {
      id: 'walletName',
      label: 'Name on Wallet (Optional)',
      type: 'text',
      required: false,
      placeholder: 'Enter name on wallet',
      autoComplete: 'name'
    }
  ],
  CARD: [
    {
      id: 'cardHolderName',
      label: 'Card Holder Name',
      type: 'text',
      required: true,
      placeholder: 'Enter card holder name',
      autoComplete: 'cc-name'
    },
    {
      id: 'cardNetwork',
      label: 'Card Network',
      type: 'select',
      required: true,
      options: [
        { id: 'visa', name: 'Visa' },
        { id: 'mastercard', name: 'Mastercard' },
        { id: 'rupay', name: 'RuPay' },
        { id: 'amex', name: 'American Express' }
      ],
      placeholder: 'Select card network'
    },
    {
      id: 'cardLastFour',
      label: 'Last 4 Digits of Card',
      type: 'text',
      required: true,
      placeholder: 'Enter last 4 digits',
      autoComplete: 'cc-number',
      inputMode: 'numeric',
      maxLength: 4,
      pattern: '[0-9]{4}',
      hint: 'For security, we only need the last 4 digits'
    },
    {
      id: 'cardType',
      label: 'Card Type',
      type: 'radio',
      required: true,
      options: [
        { value: 'debit', label: 'Debit Card' },
        { value: 'credit', label: 'Credit Card' }
      ]
    }
  ]
};

// Enhanced payment method validation schemas with more detailed validation
const paymentMethodValidators = {
  BANK_TRANSFER: (data) => {
    const errors = {};
    if (!data.accountHolderName || data.accountHolderName.trim() === '')
      errors.accountHolderName = 'Account holder name is required';
    
    if (!data.bankName || data.bankName.trim() === '')
      errors.bankName = 'Bank name is required';
    
    if (!data.accountNumber || data.accountNumber.trim() === '')
      errors.accountNumber = 'Account number is required';
    else if (!/^\d{9,18}$/.test(data.accountNumber.replace(/\s/g, '')))
      errors.accountNumber = 'Account number must be 9-18 digits';
    
    if (!data.ifscCode || data.ifscCode.trim() === '')
      errors.ifscCode = 'IFSC code is required';
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.replace(/\s/g, '')))
      errors.ifscCode = 'IFSC code must be in the format XXXX0XXXXXX';
    
    return { isValid: Object.keys(errors).length === 0, errors };
  },
  UPI: (data) => {
    const errors = {};
    if (!data.upiId || data.upiId.trim() === '')
      errors.upiId = 'UPI ID is required';
    else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(data.upiId))
      errors.upiId = 'UPI ID must be in the format username@provider';
    
    return { isValid: Object.keys(errors).length === 0, errors };
  },
  WALLET: (data) => {
    const errors = {};
    if (!data.walletProvider || data.walletProvider === '')
      errors.walletProvider = 'Wallet provider is required';
    
    if (!data.walletId || data.walletId.trim() === '')
      errors.walletId = 'Wallet ID is required';
    else if (!/^\d{10}$/.test(data.walletId.replace(/\s/g, '')) && !/^[a-zA-Z0-9.\-_@]{3,64}$/.test(data.walletId))
      errors.walletId = 'Please enter a valid wallet ID or phone number';
    
    return { isValid: Object.keys(errors).length === 0, errors };
  },
  CARD: (data) => {
    const errors = {};
    if (!data.cardHolderName || data.cardHolderName.trim() === '')
      errors.cardHolderName = 'Card holder name is required';
    
    if (!data.cardNetwork || data.cardNetwork === '')
      errors.cardNetwork = 'Card network is required';
    
    if (!data.cardLastFour || data.cardLastFour.trim() === '')
      errors.cardLastFour = 'Last 4 digits of card is required';
    else if (!/^\d{4}$/.test(data.cardLastFour))
      errors.cardLastFour = 'Last 4 digits must be numeric';
    
    return { isValid: Object.keys(errors).length === 0, errors };
  }
};

// Tooltip content for different payment methods
const tooltipContent = {
  BANK_TRANSFER: {
    title: "Bank Transfer",
    content: "Money will be transferred directly to your bank account. Processing typically takes 24-48 hours on business days."
  },
  UPI: {
    title: "UPI Payment",
    content: "Instant transfer to your UPI ID. Make sure your UPI ID is active and linked to your bank account."
  },
  WALLET: {
    title: "Digital Wallet",
    content: "Transfer to popular digital wallets. Typically processed within 24 hours."
  },
  CARD: {
    title: "Card Transfer",
    content: "Send money back to your debit or credit card. Only cards that were used for adding funds are eligible."
  }
};

// Dynamic form field component for rendering different input types
const DynamicFormField = ({ 
  field, 
  method, 
  value, 
  onChange, 
  error, 
  disabled = false,
  onBlur = null
}) => {
  const hasError = !!error;
  const isRequired = field.required;
  
  // Handle input change with optional transformations
  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Apply transformations if needed
    if (field.transform === 'uppercase') {
      newValue = newValue.toUpperCase();
    } else if (field.id === 'cardLastFour' && field.maxLength) {
      newValue = newValue.replace(/\D/g, '').slice(0, field.maxLength);
    } else if (field.id === 'accountNumber') {
      newValue = newValue.replace(/\D/g, '');
    } else if (field.id === 'upiId') {
      // Helper to ensure proper UPI format
      if (newValue.length > 0 && !newValue.includes('@') && newValue.endsWith(' ')) {
        newValue = newValue.trim() + '@';
      }
    }
    
    onChange(method, field.id, newValue);
  };
  
  const fieldProps = {
    id: `${method}_${field.id}`,
    name: `${method}_${field.id}`,
    value: value || '',
    onChange: handleChange,
    onBlur: onBlur ? () => onBlur(method, field.id) : undefined,
    disabled,
    placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
    className: `w-full px-3 py-2 border rounded-md ${hasError ? 'border-red-500' : 'border-gray-300'} ${field.className || ''}`,
    autoComplete: field.autoComplete || 'off',
    ...(field.inputMode && { inputMode: field.inputMode }),
    ...(field.pattern && { pattern: field.pattern }),
    ...(field.maxLength && { maxLength: field.maxLength }),
    "aria-required": isRequired,
    "aria-invalid": hasError
  };
  
  // Render appropriate input type
  switch (field.type) {
    case 'select':
      return (
        <select {...fieldProps}>
          <option value="">{field.placeholder || `Select ${field.label}`}</option>
          {field.options.map(option => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      );
      
    case 'radio':
      return (
        <div className="flex flex-wrap space-x-4 mt-1">
          {field.options.map(option => (
            <label key={option.value} className="inline-flex items-center mb-1">
              <input
                type="radio"
                name={fieldProps.name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(method, field.id, option.value)}
                className="form-radio h-4 w-4 text-blue-600"
                disabled={disabled}
              />
              <span className="ml-2 text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      );
      
    case 'textarea':
      return <textarea {...fieldProps} rows={field.rows || 3} />;
      
    default: // text, number, email, etc.
      return <input type={field.type} {...fieldProps} />;
  }
};

// Form field wrapper component with label and error display
const FormField = ({ 
  field, 
  method, 
  value, 
  onChange, 
  error, 
  disabled = false,
  onBlur = null
}) => {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={`${method}_${field.id}`} className="block text-sm font-medium text-gray-700">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        
        {/* Show validation status icons */}
        {!disabled && value && (
          error ? (
            <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
          ) : (
            field.required && <CheckCircleIcon className="h-4 w-4 text-green-500" />
          )
        )}
      </div>
      
      <DynamicFormField
        field={field}
        method={method}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        onBlur={onBlur}
      />
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-start">
          <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
      
      {/* Field hint */}
      {field.hint && !error && (
        <p className="mt-1 text-xs text-gray-500 flex items-start">
          <InformationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          {field.hint}
        </p>
      )}
    </div>
  );
};

// Payment method form component
const PaymentMethodForm = ({
  method,
  paymentDetails,
  validationErrors,
  onChange,
  onBlur,
  disabled
}) => {
  const { title, content } = tooltipContent[method];
  
  return (
    <div className="rounded-lg p-3 border">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium">{title || `${method} Details`}</h4>
        <div className="relative group">
          <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400 cursor-help" />
          <div className="absolute right-0 w-64 p-2 bg-gray-800 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
            {content}
          </div>
        </div>
      </div>
      
      {formFieldConfigs[method].map(field => (
        <FormField
          key={field.id}
          field={field}
          method={method}
          value={paymentDetails[method][field.id]}
          onChange={onChange}
          error={validationErrors[method] && validationErrors[method][field.id]}
          disabled={disabled}
          onBlur={onBlur}
        />
      ))}
      
      <div className="text-xs text-gray-500 mt-2 flex items-start">
        <InformationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
        {tooltipContent[method].content}
      </div>
    </div>
  );
};

const WithdrawModal = ({ isOpen, onClose, maxAmount = 0, onSubmit, savedBankDetails }) => {
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [fieldFocused, setFieldFocused] = useState({ method: null, field: null });
  
  // Define payment methods
  const paymentMethods = [
    { id: 'BANK_TRANSFER', name: 'Bank Account', icon: BanknotesIcon },
    { id: 'UPI', name: 'UPI', icon: QrCodeIcon },
    { id: 'WALLET', name: 'Wallet', icon: WalletIcon },
    { id: 'CARD', name: 'Card', icon: CreditCardIcon }
  ];
  
  // Payment details state for each method
  const [paymentDetails, setPaymentDetails] = useState({
    BANK_TRANSFER: {
      accountHolderName: savedBankDetails?.accountHolderName || '',
      bankName: savedBankDetails?.bankName || '',
      accountNumber: savedBankDetails?.accountNumber || '',
      ifscCode: savedBankDetails?.ifscCode || ''
    },
    UPI: {
      upiId: '',
      holderName: savedBankDetails?.accountHolderName || ''
    },
    WALLET: {
      walletProvider: '',
      walletId: '',
      walletName: ''
    },
    CARD: {
      cardHolderName: savedBankDetails?.accountHolderName || '',
      cardNetwork: '',
      cardLastFour: '',
      cardType: 'debit'
    }
  });
  
  // Form validation errors
  const [validationErrors, setValidationErrors] = useState({
    BANK_TRANSFER: {},
    UPI: {},
    WALLET: {},
    CARD: {}
  });
  
  // Touch state to track which fields have been interacted with
  const [touchedFields, setTouchedFields] = useState({
    BANK_TRANSFER: {},
    UPI: {},
    WALLET: {},
    CARD: {}
  });
  
  // Get current payment method
  const currentPaymentMethod = paymentMethods[selectedTabIndex].id;

  const { authFetch } = useAuth();

  // Validate a specific field
  const validateField = (method, field, value) => {
    // Skip validation for non-required empty fields
    const fieldConfig = formFieldConfigs[method].find(f => f.id === field);
    if (!fieldConfig.required && (!value || value === '')) {
      return null;
    }
    
    let error = null;
    
    switch (field) {
      case 'accountNumber':
        if (!value) error = 'Account number is required';
        else if (!/^\d{9,18}$/.test(value.replace(/\s/g, '')))
          error = 'Account number must be 9-18 digits';
        break;
        
      case 'ifscCode':
        if (!value) error = 'IFSC code is required';
        else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.replace(/\s/g, '')))
          error = 'IFSC code must be in the format XXXX0XXXXXX';
        break;
        
      case 'upiId':
        if (!value) error = 'UPI ID is required';
        else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(value))
          error = 'UPI ID must be in the format username@provider';
        break;
        
      case 'walletId':
        if (!value) error = 'Wallet ID is required';
        else if (!/^\d{10}$/.test(value.replace(/\s/g, '')) && !/^[a-zA-Z0-9.\-_@]{3,64}$/.test(value))
          error = 'Please enter a valid wallet ID or phone number';
        break;
        
      case 'cardLastFour':
        if (!value) error = 'Last 4 digits of card is required';
        else if (!/^\d{4}$/.test(value))
          error = 'Last 4 digits must be numeric';
        break;
        
      default:
        // Default validation for required fields
        if (fieldConfig.required && (!value || value.trim() === '')) {
          error = `${fieldConfig.label} is required`;
        }
    }
    
    return error;
  };

  // Handle changes to payment details fields
  const handlePaymentDetailChange = (method, field, value) => {
    setPaymentDetails(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: value
      }
    }));
    
    // Mark field as touched on change
    if (!touchedFields[method][field]) {
      setTouchedFields(prev => ({
        ...prev,
        [method]: {
          ...prev[method],
          [field]: true
        }
      }));
    }
    
    // Validate field as user types
    const error = validateField(method, field, value);
    
    // Update validation errors
    setValidationErrors(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: error
      }
    }));
  };
  
  // Handle field blur for validation
  const handleFieldBlur = (method, field) => {
    const value = paymentDetails[method][field];
    
    // Mark field as touched
    setTouchedFields(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: true
      }
    }));
    
    // Validate on blur
    const error = validateField(method, field, value);
    
    // Update validation errors
    setValidationErrors(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: error
      }
    }));
    
    // Clear focus state
    setFieldFocused({ method: null, field: null });
  };
  
  // Handle field focus
  const handleFieldFocus = (method, field) => {
    setFieldFocused({ method, field });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
      setSuccessMessage('');
      if (value !== '' && parseFloat(value) > maxAmount) {
        setError('Amount cannot exceed available balance.');
      } else if (value !== '' && parseFloat(value) <= 0) {
          setError('Amount must be greater than zero.');
      }
    }
  };

  // Validate the current payment method details
  const validateCurrentPaymentMethod = () => {
    const method = paymentMethods[selectedTabIndex].id;
    const methodDetails = paymentDetails[method];
    
    // Mark all fields as touched for this method
    const updatedTouched = { ...touchedFields };
    formFieldConfigs[method].forEach(field => {
      updatedTouched[method][field.id] = true;
    });
    setTouchedFields(updatedTouched);
    
    // Validate all fields
    const updatedErrors = { ...validationErrors };
    updatedErrors[method] = {};
    
    let isValid = true;
    
    formFieldConfigs[method].forEach(field => {
      const error = validateField(method, field.id, methodDetails[field.id]);
      if (error) {
        isValid = false;
        updatedErrors[method][field.id] = error;
      }
    });
    
    setValidationErrors(updatedErrors);
    
    return isValid;
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
    
    // Validate payment details
    const isPaymentDetailsValid = validateCurrentPaymentMethod();
    if (!isPaymentDetailsValid) {
      setError('Please fill in all required payment details correctly.');
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setIsWithdrawing(true);

    const paymentMethod = paymentMethods[selectedTabIndex].id;
    const methodDetails = paymentDetails[paymentMethod];

    try {
        console.log('Attempting withdrawal with:', { 
          amount: numericAmount, 
          paymentMethod,
          paymentDetails: methodDetails,
          remarks
        });
        
        const response = await authFetch('/api/seller/payouts/withdraw', {
            method: 'POST',
            body: JSON.stringify({ 
              amount: numericAmount,
              paymentMethod,
              paymentDetails: methodDetails,
              remarks: remarks || undefined
            }),
        });

        // The authFetch helper already parses JSON if applicable
        // Remove the redundant .json() call
        const data = response; // Use the already parsed data from authFetch

        // Check the structure returned by authFetch for success
        // Assuming authFetch throws an error if !response.ok
        // If authFetch returns { success: false, ... } on error, adjust check:
        // if (!data || data.success === false) {
        //    throw new Error(data.message || 'Withdrawal failed');
        // }

        console.log('Withdrawal successful:', data);
        setSuccessMessage(data.message || 'Withdrawal request submitted successfully!');

        if (onSubmit) {
            onSubmit(numericAmount, paymentMethod);
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setRemarks('');
      setError('');
      setSuccessMessage('');
      setIsWithdrawing(false);
      setSelectedTabIndex(0);
      setTouchedFields({
        BANK_TRANSFER: {},
        UPI: {},
        WALLET: {},
        CARD: {}
      });
      setValidationErrors({
        BANK_TRANSFER: {},
        UPI: {},
        WALLET: {},
        CARD: {}
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

        <div className="mb-4 p-3 bg-gray-100 rounded flex justify-between items-center">
          <p className="flex items-center">
            <span className="mr-1">💰</span> 
            <span>Available Balance:</span>
          </p>
          <span className="font-medium text-lg">₹{maxAmount.toFixed(2)}</span>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Payment Method</h3>
          
          <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
            <Tab.List className="flex space-x-2 rounded-lg bg-gray-100 p-1 mb-4">
              {paymentMethods.map((method) => (
                <Tab
                  key={method.id}
                  className={({ selected }) =>
                    `w-full rounded-lg py-2 text-sm font-medium leading-5 flex flex-col items-center
                    ${selected
                      ? 'bg-white shadow text-blue-600'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`
                  }
                  disabled={isWithdrawing || !!successMessage}
                >
                  <method.icon className="h-5 w-5 mb-1" />
                  {method.name}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-2">
              {/* Dynamically render payment method forms */}
              {paymentMethods.map((method) => (
                <Tab.Panel key={method.id}>
                  <PaymentMethodForm
                    method={method.id}
                    paymentDetails={paymentDetails}
                    validationErrors={validationErrors}
                    onChange={handlePaymentDetailChange}
                    onBlur={handleFieldBlur}
                    disabled={isWithdrawing || !!successMessage}
                  />
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>

        <div className="mb-4 border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Withdrawal Details</h3>
             <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700 mb-1">
                 Amount to Withdraw (₹) <span className="text-red-500">*</span>
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