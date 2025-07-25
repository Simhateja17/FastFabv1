"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getAdminApiClient } from "@/app/utils/apiClient";
import Link from "next/link";

// Main component wrapper with Suspense
export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}

// Content component that handles data fetching and rendering
function UsersContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Get API client with admin authorization
        const apiClient = getAdminApiClient();

        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("limit", 10);

        if (searchQuery) {
          params.append("search", searchQuery);
        }

        console.log("Fetching users with params:", params.toString());

        const response = await apiClient.get(
          `/api/admin/users?${params.toString()}`
        );

        // Log the exact response for debugging
        console.log("Raw users API response:", response.data);

        // Handle different response formats with more flexibility
        if (response.data) {
          let usersData = [];
          let paginationData = null;

          // Case 1: Direct array of users
          if (Array.isArray(response.data)) {
            console.log("Response is a direct array");
            usersData = response.data;
          }
          // Case 2: Object with users array
          else if (response.data.users && Array.isArray(response.data.users)) {
            console.log("Response has users array property");
            usersData = response.data.users;
            paginationData = response.data.pagination;
          }
          // Case 3: Object with data that contains users
          else if (response.data.data && Array.isArray(response.data.data)) {
            console.log("Response has data array property");
            usersData = response.data.data;
            paginationData =
              response.data.pagination || response.data.meta?.pagination;
          }
          // Case 4: Object is itself convertible to array of users
          else if (
            typeof response.data === "object" &&
            Object.keys(response.data).length
          ) {
            console.log("Attempting to extract data from object");
            // Try to find an array property
            const arrayProps = Object.keys(response.data).filter((key) =>
              Array.isArray(response.data[key])
            );

            if (arrayProps.length > 0) {
              console.log("Found array property:", arrayProps[0]);
              usersData = response.data[arrayProps[0]];
            } else {
              console.error("No array property found in response data");
              setError("Invalid response format: no array property found");
              setLoading(false);
              return;
            }
          } else {
            console.error("Invalid response format:", response.data);
            setError("Invalid response format from API");
            setLoading(false);
            return;
          }

          console.log("Processed users data:", usersData.length, "items");
          setUsers(usersData);
          setTotalPages(paginationData?.totalPages || 1);
        } else {
          console.error("Empty response data");
          setError("Empty response from API");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setError(error.response?.data?.message || "Failed to load users data");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, searchQuery]);

  // Retry function for errors
  const retryFetchUsers = () => {
    setError(null);
    setLoading(true);
    // Reset current state
    const fetchUsersAgain = async () => {
      try {
        const apiClient = getAdminApiClient();
        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("limit", 10);
        if (searchQuery) {
          params.append("search", searchQuery);
        }

        const response = await apiClient.get(
          `/api/admin/users?${params.toString()}`
        );
        console.log("Retry response:", response.data);

        if (response.data && Array.isArray(response.data.users)) {
          setUsers(response.data.users);
          setTotalPages(response.data.pagination?.totalPages || 1);
        } else if (Array.isArray(response.data)) {
          setUsers(response.data);
          setTotalPages(1);
        } else {
          setError("Could not process response data");
        }
      } catch (error) {
        console.error("Retry failed:", error);
        setError(
          "Retry failed: " + (error.response?.data?.message || error.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAgain();
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      // Get API client with admin authorization
      const apiClient = getAdminApiClient();

      await apiClient.delete(`/api/admin/users/${selectedUser.id}`);

      setUsers(users.filter((user) => user.id !== selectedUser.id));
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  // View user details
  const viewUserDetails = (userId) => {
    router.push(`/superadmin/users/${userId}`);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Get user status label and color
  const getUserStatusInfo = (user) => {
    if (user.isBlocked) {
      return { label: "Blocked", color: "bg-red-100 text-red-800" };
    } else if (user.isEmailVerified) {
      return { label: "Verified", color: "bg-green-100 text-green-800" };
    } else {
      return { label: "Unverified", color: "bg-yellow-100 text-yellow-800" };
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded mb-6">
        <div className="flex items-center">
          <svg
            className="w-6 h-6 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <p className="font-bold">Error Loading Users</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={retryFetchUsers}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text">Users</h1>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 rounded-lg border border-ui-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-text-muted"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>
      </div>

      <div className="bg-background-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ui-border">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-background-card divide-y divide-ui-border">
              {users.length > 0 ? (
                users.map((user) => {
                  const statusInfo = getUserStatusInfo(user);
                  return (
                    <tr key={user.id} className="hover:bg-background-alt">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                            {user.name
                              ? user.name.charAt(0).toUpperCase()
                              : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-text">
                              {user.name || "No Name"}
                            </div>
                            <div className="text-sm text-text-muted">
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text">{user.email}</div>
                        {user.isEmailVerified ? (
                          <div className="text-xs text-green-600">Verified</div>
                        ) : (
                          <div className="text-xs text-yellow-600">
                            Not verified
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                        {user.phone || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => viewUserDetails(user.id)}
                          className="text-primary hover:text-primary-dark mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-sm text-text-muted"
                  >
                    {searchQuery
                      ? "No users found matching your search"
                      : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="text-text">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-medium text-text mb-4">
              Confirm Deletion
            </h3>
            <p className="text-text-muted mb-6">
              Are you sure you want to delete the user &quot;
              {selectedUser.name || selectedUser.email}&quot;? This action
              cannot be undone and will delete all their data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-ui-border rounded-md text-text hover:bg-background-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
