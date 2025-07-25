"use client";

import React, { useEffect, useState, Suspense } from "react";
import { getAdminApiClient } from "@/app/lib/api";
import { ADMIN_ENDPOINTS } from "@/app/lib/endpoints";
import { useParams } from "next/navigation";

const UserDetailsContent = () => {
  const { id, userId } = useParams();
  const [userDetails, setUserDetails] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      try {
        const apiClient = getAdminApiClient();
        console.log("Fetching user details:", ADMIN_ENDPOINTS.USER_DETAIL(userId));

        const userResponse = await apiClient.get(
          ADMIN_ENDPOINTS.USER_DETAIL(userId)
        );
        console.log("User details API response:", userResponse.data);

        if (userResponse.data) {
          // Extract user data from response based on shape
          const userData = userResponse.data.user || userResponse.data;

          setUserDetails({
            id: userData.id,
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            isBlocked: userData.isActive === false,
            isEmailVerified: true, // Assume email is verified
            createdAt: userData.createdAt,
          });
        } else {
          console.error("Empty user details response:", userResponse);
          setError("Received empty response from the server");
        }

        // Fetch user orders
        const ordersResponse = await apiClient.get(
          ADMIN_ENDPOINTS.USER_ORDERS(userId)
        );
        console.log("User orders API response:", ordersResponse.data);

        if (
          ordersResponse.data &&
          Array.isArray(ordersResponse.data.orders || ordersResponse.data)
        ) {
          const ordersData = ordersResponse.data.orders || ordersResponse.data;
          setOrders(ordersData);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        setError(
          error.response?.data?.message || "Failed to load user details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  return <div>{/* Render your component content here */}</div>;
};

const UserDetailsPage = () => {
  return (
    <Suspense fallback={<div>Loading user details...</div>}>
      <UserDetailsContent />
    </Suspense>
  );
};

export default UserDetailsPage;
