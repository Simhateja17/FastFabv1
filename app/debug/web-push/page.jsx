"use client";

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/app/hooks/usePushNotifications';

export default function WebPushDebugPage() {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState(null);
  const [testingSubscriptionId, setTestingSubscriptionId] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  // Get push notification hook
  const { 
    isSupported, 
    permissionStatus, 
    isSubscribed, 
    subscribeUser, 
    unsubscribeUser, 
    isLoading: hookLoading 
  } = usePushNotifications();

  // Fetch diagnostics on page load
  useEffect(() => {
    async function fetchDiagnostics() {
      try {
        setLoading(true);
        const response = await fetch('/api/debug/vapid-test');
        const data = await response.json();
        setDiagnostics(data);
        
        // Set the first subscription ID if available
        if (data.database?.sampleSubscription?.id) {
          setTestingSubscriptionId(data.database.sampleSubscription.id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDiagnostics();
  }, []);

  // Function to send a test notification
  async function sendTestNotification() {
    if (!testingSubscriptionId) {
      alert('Please enter a subscription ID');
      return;
    }

    try {
      setTestResult({ loading: true });
      const response = await fetch('/api/debug/vapid-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId: testingSubscriptionId }),
      });
      const data = await response.json();
      setTestResult({ ...data, loading: false });
    } catch (err) {
      setTestResult({ success: false, error: err.message, loading: false });
    }
  }

  // Function to generate new VAPID keys
  async function generateVapidKeys() {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/vapid-test?generate=true');
      const data = await response.json();
      setDiagnostics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Helper to render status indicators
  const StatusIndicator = ({ status, label }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
      status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {status ? '✓' : '✗'} {label}
    </span>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg">
          <h2 className="text-lg font-semibold">Error</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Web Push Notification Diagnostics</h1>

      {/* Environment Info */}
      <div className="bg-white shadow-md rounded-lg mb-6 p-4">
        <h2 className="text-xl font-semibold mb-4">Environment</h2>
        <p><span className="font-semibold">Environment:</span> {diagnostics.env}</p>
        <p><span className="font-semibold">Timestamp:</span> {diagnostics.timestamp}</p>
      </div>

      {/* VAPID Keys Status */}
      <div className="bg-white shadow-md rounded-lg mb-6 p-4">
        <h2 className="text-xl font-semibold mb-4">VAPID Keys Configuration</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <StatusIndicator status={diagnostics.vapidKeys.publicKeyAvailable} label="Public Key" />
          <StatusIndicator status={diagnostics.vapidKeys.privateKeyAvailable} label="Private Key" />
          <StatusIndicator status={diagnostics.vapidKeys.subjectAvailable} label="Subject" />
          <StatusIndicator status={diagnostics.vapidKeys.validConfiguration} label="Valid Config" />
        </div>

        {diagnostics.vapidKeys.missingKeys && diagnostics.vapidKeys.missingKeys.length > 0 && (
          <div className="p-3 mb-4 bg-yellow-50 text-yellow-800 rounded">
            <h3 className="font-semibold">Missing Keys:</h3>
            <ul className="list-disc list-inside">
              {diagnostics.vapidKeys.missingKeys.map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}

        {diagnostics.vapidKeys.configError && (
          <div className="p-3 mb-4 bg-red-50 text-red-800 rounded">
            <h3 className="font-semibold">Configuration Error:</h3>
            <p>{diagnostics.vapidKeys.configError}</p>
          </div>
        )}

        <div className="mt-4">
          <button 
            onClick={generateVapidKeys}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Generate New VAPID Keys
          </button>
        </div>
      </div>

      {/* Generated Keys (if any) */}
      {diagnostics.generatedKeys && (
        <div className="bg-white shadow-md rounded-lg mb-6 p-4">
          <h2 className="text-xl font-semibold mb-4">Generated VAPID Keys</h2>
          <div className="p-3 bg-gray-50 rounded font-mono text-sm mb-4 whitespace-pre-wrap">
            {diagnostics.instructions}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <p><span className="font-semibold">Public Key:</span> {diagnostics.generatedKeys.publicKey}</p>
            <p><span className="font-semibold">Private Key:</span> {diagnostics.generatedKeys.privateKey}</p>
            <p><span className="font-semibold">Subject:</span> {diagnostics.generatedKeys.subject}</p>
          </div>
        </div>
      )}

      {/* Database Status */}
      <div className="bg-white shadow-md rounded-lg mb-6 p-4">
        <h2 className="text-xl font-semibold mb-4">Database Status</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <StatusIndicator status={diagnostics.database.connectionString} label="Connection String" />
          <StatusIndicator status={diagnostics.database.connected} label="Connected" />
        </div>
        
        {diagnostics.database.subscriptionCount !== undefined && (
          <p className="mb-2"><span className="font-semibold">Push Subscriptions Count:</span> {diagnostics.database.subscriptionCount}</p>
        )}

        {diagnostics.database.sampleSubscription && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Sample Subscription:</h3>
            <p><span className="font-semibold">ID:</span> {diagnostics.database.sampleSubscription.id}</p>
            <p><span className="font-semibold">Endpoint:</span> {diagnostics.database.sampleSubscription.endpoint}</p>
            <p><span className="font-semibold">Created:</span> {new Date(diagnostics.database.sampleSubscription.createdAt).toLocaleString()}</p>
            <p><span className="font-semibold">Seller:</span> {diagnostics.database.sampleSubscription.sellerName || 'Unknown'} ({diagnostics.database.sampleSubscription.sellerId})</p>
          </div>
        )}
      </div>

      {/* Browser Push API Status */}
      <div className="bg-white shadow-md rounded-lg mb-6 p-4">
        <h2 className="text-xl font-semibold mb-4">Browser Push API Status</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <StatusIndicator status={isSupported} label="Push API Supported" />
          <StatusIndicator status={permissionStatus === 'granted'} label="Permission Granted" />
          <StatusIndicator status={isSubscribed} label="Browser Subscribed" />
        </div>
        
        <p className="mb-2"><span className="font-semibold">Permission Status:</span> {permissionStatus}</p>
        
        <div className="mt-4 flex gap-2">
          <button 
            onClick={subscribeUser}
            disabled={hookLoading || isSubscribed}
            className={`px-4 py-2 rounded-md ${
              hookLoading || isSubscribed 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-primary text-white'
            }`}
          >
            {hookLoading ? 'Processing...' : isSubscribed ? 'Already Subscribed' : 'Subscribe This Browser'}
          </button>
          
          <button 
            onClick={unsubscribeUser}
            disabled={hookLoading || !isSubscribed}
            className={`px-4 py-2 rounded-md ${
              hookLoading || !isSubscribed 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-red-500 text-white'
            }`}
          >
            Unsubscribe
          </button>
        </div>
      </div>

      {/* Test Notification */}
      <div className="bg-white shadow-md rounded-lg mb-6 p-4">
        <h2 className="text-xl font-semibold mb-4">Send Test Notification</h2>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">Subscription ID:</label>
          <input 
            type="text" 
            value={testingSubscriptionId} 
            onChange={(e) => setTestingSubscriptionId(e.target.value)}
            placeholder="Enter subscription ID"
            className="w-full p-2 border rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">Use the sample subscription ID from above if available</p>
        </div>
        
        <button 
          onClick={sendTestNotification}
          disabled={!testingSubscriptionId || testResult?.loading}
          className={`px-4 py-2 rounded-md ${
            !testingSubscriptionId || testResult?.loading
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-primary text-white'
          }`}
        >
          {testResult?.loading ? 'Sending...' : 'Send Test Notification'}
        </button>
        
        {testResult && !testResult.loading && (
          <div className={`mt-4 p-3 rounded ${
            testResult.success 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            <h3 className="font-semibold mb-2">{testResult.success ? 'Success!' : 'Error'}</h3>
            {testResult.success ? (
              <p>{testResult.message}</p>
            ) : (
              <p>{testResult.error}</p>
            )}
            {testResult.statusCode && (
              <p className="mt-2 text-sm"><span className="font-semibold">Status Code:</span> {testResult.statusCode}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 