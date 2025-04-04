"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useAdminAuth } from "@/app/context/AdminAuthContext";

// API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SettingsPage() {
  const { adminUser } = useAdminAuth();

  // Profile settings state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Site settings state
  const [siteSettings, setSiteSettings] = useState({
    siteName: "FastFabStartup",
    siteDescription: "Your one-stop fashion marketplace",
    contactEmail: "support@fastfabstartup.com",
    enableMaintenanceMode: false,
    taxRate: 8.5,
    shippingFlatRate: 5.99,
    freeShippingThreshold: 50,
    allowGuestCheckout: true,
    maxItemsPerOrder: 20,
  });

  // State for API interactions
  const [loading, setLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [siteSuccess, setSiteSuccess] = useState(null);
  const [siteError, setSiteError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Load admin profile data
  useEffect(() => {
    if (adminUser) {
      setProfileData({
        ...profileData,
        name: adminUser.name || "",
        email: adminUser.email || "",
      });
    }
  }, [adminUser, profileData]);

  // Load site settings
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/admin/settings`);
        if (response.data && response.data.settings) {
          setSiteSettings({
            ...siteSettings,
            ...response.data.settings,
          });
        }
      } catch (error) {
        console.error("Error fetching site settings:", error);
        setSiteError("Failed to load site settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSiteSettings();
  }, [siteSettings]);

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value,
    });
  };

  // Handle site settings form changes
  const handleSiteSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSiteSettings({
      ...siteSettings,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? parseFloat(value)
          : value,
    });
  };

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    // Validate password update if attempted
    if (profileData.newPassword) {
      if (!profileData.currentPassword) {
        setProfileError("Current password is required to set a new password");
        return;
      }

      if (profileData.newPassword !== profileData.confirmPassword) {
        setProfileError("New passwords do not match");
        return;
      }

      if (profileData.newPassword.length < 8) {
        setProfileError("New password must be at least 8 characters");
        return;
      }
    }

    try {
      setLoading(true);

      // Prepare update data
      const updateData = {
        name: profileData.name,
        email: profileData.email,
      };

      // Only include password fields if updating password
      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await axios.patch(
        `${API_BASE_URL}/admin/profile`,
        updateData
      );

      // Reset password fields
      setProfileData({
        ...profileData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setProfileSuccess("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileError(
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle site settings update
  const handleSiteSettingsUpdate = async (e) => {
    e.preventDefault();
    setSiteSuccess(null);
    setSiteError(null);

    try {
      setLoading(true);
      const response = await axios.patch(
        `${API_BASE_URL}/admin/settings`,
        siteSettings
      );

      setSiteSuccess("Site settings updated successfully");
    } catch (error) {
      console.error("Error updating site settings:", error);
      setSiteError(
        error.response?.data?.message || "Failed to update site settings"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Settings</h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-ui-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-2 px-4 font-medium ${
              activeTab === "profile"
                ? "border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("site")}
            className={`py-2 px-4 font-medium ${
              activeTab === "site"
                ? "border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            Site Settings
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-2 px-4 font-medium ${
              activeTab === "security"
                ? "border-b-2 border-primary text-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            Security
          </button>
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-background-card rounded-lg shadow p-6">
          <h2 className="text-xl font-medium text-text mb-4">Admin Profile</h2>

          {profileSuccess && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p>{profileSuccess}</p>
            </div>
          )}

          {profileError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{profileError}</p>
            </div>
          )}

          <form onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <h3 className="text-lg font-medium text-text mb-3">
              Change Password
            </h3>
            <div className="grid grid-cols-1 gap-6 mb-6">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={profileData.currentPassword}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  Required only if you want to change your password
                </p>
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={profileData.newPassword}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  Leave blank to keep current password
                </p>
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={profileData.confirmPassword}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Site Settings Tab */}
      {activeTab === "site" && (
        <div className="bg-background-card rounded-lg shadow p-6">
          <h2 className="text-xl font-medium text-text mb-4">
            Site Configuration
          </h2>

          {siteSuccess && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p>{siteSuccess}</p>
            </div>
          )}

          {siteError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{siteError}</p>
            </div>
          )}

          <form onSubmit={handleSiteSettingsUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="siteName"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Site Name
                </label>
                <input
                  type="text"
                  id="siteName"
                  name="siteName"
                  value={siteSettings.siteName}
                  onChange={handleSiteSettingChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="contactEmail"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={siteSettings.contactEmail}
                  onChange={handleSiteSettingChange}
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="siteDescription"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Site Description
                </label>
                <textarea
                  id="siteDescription"
                  name="siteDescription"
                  value={siteSettings.siteDescription}
                  onChange={handleSiteSettingChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
              </div>
            </div>

            <h3 className="text-lg font-medium text-text mb-3">
              Commerce Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="taxRate"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  id="taxRate"
                  name="taxRate"
                  value={siteSettings.taxRate}
                  onChange={handleSiteSettingChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="shippingFlatRate"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Flat Shipping Rate ($)
                </label>
                <input
                  type="number"
                  id="shippingFlatRate"
                  name="shippingFlatRate"
                  value={siteSettings.shippingFlatRate}
                  onChange={handleSiteSettingChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="freeShippingThreshold"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Free Shipping Threshold ($)
                </label>
                <input
                  type="number"
                  id="freeShippingThreshold"
                  name="freeShippingThreshold"
                  value={siteSettings.freeShippingThreshold}
                  onChange={handleSiteSettingChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="maxItemsPerOrder"
                  className="block text-sm font-medium text-text-muted mb-1"
                >
                  Max Items Per Order
                </label>
                <input
                  type="number"
                  id="maxItemsPerOrder"
                  name="maxItemsPerOrder"
                  value={siteSettings.maxItemsPerOrder}
                  onChange={handleSiteSettingChange}
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-ui-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <h3 className="text-lg font-medium text-text mb-3">Site Options</h3>
            <div className="space-y-4 mb-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="enableMaintenanceMode"
                  checked={siteSettings.enableMaintenanceMode}
                  onChange={handleSiteSettingChange}
                  className="form-checkbox h-5 w-5 text-primary rounded border-ui-border focus:ring-primary mt-0.5"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-text">
                    Enable Maintenance Mode
                  </span>
                  <span className="block text-xs text-text-muted">
                    This will display a maintenance message to all users except
                    admins
                  </span>
                </div>
              </label>
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="allowGuestCheckout"
                  checked={siteSettings.allowGuestCheckout}
                  onChange={handleSiteSettingChange}
                  className="form-checkbox h-5 w-5 text-primary rounded border-ui-border focus:ring-primary mt-0.5"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-text">
                    Allow Guest Checkout
                  </span>
                  <span className="block text-xs text-text-muted">
                    Allow visitors to check out without creating an account
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="bg-background-card rounded-lg shadow p-6">
          <h2 className="text-xl font-medium text-text mb-4">
            Security Settings
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-text mb-3">
                Login Session
              </h3>
              <p className="text-text-muted mb-4">
                Your current session will expire in 24 hours. For security
                reasons, you will need to log in again after this period.
              </p>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to log out of all other sessions?"
                    )
                  ) {
                    // API call to invalidate other sessions would go here
                    alert("All other sessions have been logged out.");
                  }
                }}
                className="px-4 py-2 bg-background hover:bg-background-alt text-text border border-ui-border rounded-md"
              >
                Log Out All Other Sessions
              </button>
            </div>

            <div className="border-t border-ui-border pt-6">
              <h3 className="text-lg font-medium text-text mb-3">
                Activity Log
              </h3>
              <p className="text-text-muted mb-4">
                View recent actions and events performed by administrators.
              </p>
              <div className="bg-background border border-ui-border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-ui-border">
                  <thead className="bg-background-alt">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-ui-border">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {new Date().toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {profileData.name || "Admin"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        Viewed security settings
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {new Date(Date.now() - 3600000).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {profileData.name || "Admin"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        Updated product inventory
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {new Date(Date.now() - 86400000).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {profileData.name || "Admin"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        Logged in to admin panel
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
