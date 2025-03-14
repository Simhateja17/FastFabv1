"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";

// The actual earnings content
function EarningsContent() {
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("30days");

  // Mock earnings data
  const mockEarnings = [
    {
      id: "TXN-1001",
      orderId: "ORD-1001",
      date: "2024-03-15",
      amount: 1169,
      type: "sale",
      status: "completed",
      commission: 130,
    },
    {
      id: "TXN-1002",
      orderId: "ORD-1002",
      date: "2024-03-14",
      amount: 809,
      type: "sale",
      status: "completed",
      commission: 90,
    },
    {
      id: "TXN-1003",
      orderId: "ORD-1003",
      date: "2024-03-13",
      amount: 2249,
      type: "sale",
      status: "completed",
      commission: 250,
    },
    {
      id: "TXN-1004",
      orderId: "ORD-1004",
      date: "2024-03-12",
      amount: 1439,
      type: "sale",
      status: "completed",
      commission: 160,
    },
    {
      id: "TXN-1005",
      orderId: "ORD-1005",
      date: "2024-03-11",
      amount: -3299,
      type: "refund",
      status: "completed",
      commission: -330,
    },
    {
      id: "TXN-1006",
      orderId: "PAYOUT-102",
      date: "2024-03-10",
      amount: -5000,
      type: "payout",
      status: "completed",
      commission: 0,
    },
    {
      id: "TXN-1007",
      orderId: "ORD-960",
      date: "2024-03-01",
      amount: 1619,
      type: "sale",
      status: "completed",
      commission: 180,
    },
  ];

  // Filter transactions based on active tab
  const filteredTransactions = mockEarnings.filter((transaction) => {
    if (activeTab === "all") return true;
    return transaction.type === activeTab;
  });

  // Calculate summary statistics
  const calculateSummary = () => {
    let totalSales = 0;
    let totalCommission = 0;
    let totalRefunds = 0;
    let totalPayouts = 0;

    // Filter transactions based on date range
    const now = new Date();
    const startDate = new Date();

    if (dateRange === "7days") {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === "30days") {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === "90days") {
      startDate.setDate(now.getDate() - 90);
    }

    mockEarnings.forEach((transaction) => {
      const txnDate = new Date(transaction.date);
      if (txnDate >= startDate) {
        if (transaction.type === "sale") {
          totalSales += transaction.amount;
          totalCommission += transaction.commission;
        } else if (transaction.type === "refund") {
          totalRefunds += Math.abs(transaction.amount);
        } else if (transaction.type === "payout") {
          totalPayouts += Math.abs(transaction.amount);
        }
      }
    });

    const netEarnings = totalSales - totalRefunds - totalCommission;
    const availableBalance = netEarnings - totalPayouts;

    return {
      totalSales,
      totalCommission,
      totalRefunds,
      netEarnings,
      availableBalance,
    };
  };

  const summary = calculateSummary();

  // Get transaction type badge color
  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "sale":
        return "bg-success bg-opacity-10 text-success";
      case "refund":
        return "bg-error bg-opacity-10 text-error";
      case "payout":
        return "bg-accent-light text-accent-dark";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-primary">
          Earnings Dashboard
        </h1>

        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              dateRange === "7days"
                ? "bg-primary text-white border-primary"
                : "bg-white text-text border-ui-border hover:bg-background-alt"
            }`}
            onClick={() => setDateRange("7days")}
          >
            7 Days
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b ${
              dateRange === "30days"
                ? "bg-primary text-white border-primary"
                : "bg-white text-text border-ui-border hover:bg-background-alt"
            }`}
            onClick={() => setDateRange("30days")}
          >
            30 Days
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
              dateRange === "90days"
                ? "bg-primary text-white border-primary"
                : "bg-white text-text border-ui-border hover:bg-background-alt"
            }`}
            onClick={() => setDateRange("90days")}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Total Sales</p>
              <h3 className="text-2xl font-semibold text-text-dark mt-1">
                ₹{summary.totalSales.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="p-3 bg-success bg-opacity-10 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Platform Fees</p>
              <h3 className="text-2xl font-semibold text-text-dark mt-1">
                ₹{summary.totalCommission.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="p-3 bg-secondary bg-opacity-10 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Net Earnings</p>
              <h3 className="text-2xl font-semibold text-text-dark mt-1">
                ₹{summary.netEarnings.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="p-3 bg-primary bg-opacity-10 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-background-card p-6 rounded-lg shadow-sm border border-ui-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Available Balance</p>
              <h3 className="text-2xl font-semibold text-text-dark mt-1">
                ₹{summary.availableBalance.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="p-3 bg-accent bg-opacity-10 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-accent-dark"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <button className="text-sm text-white bg-primary hover:bg-primary-dark px-3 py-1 rounded">
              Request Payout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto mb-6 border-b border-ui-border">
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Transactions
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "sale"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("sale")}
        >
          Sales
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "refund"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("refund")}
        >
          Refunds
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "payout"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-primary"
          }`}
          onClick={() => setActiveTab("payout")}
        >
          Payouts
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-background-card rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ui-border">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Net
                </th>
              </tr>
            </thead>
            <tbody className="bg-background-card divide-y divide-ui-border">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-background-alt">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {transaction.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {transaction.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {new Date(transaction.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeClass(
                          transaction.type
                        )}`}
                      >
                        {transaction.type.charAt(0).toUpperCase() +
                          transaction.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {transaction.type === "refund" ||
                      transaction.type === "payout" ? (
                        <span className="text-error">
                          -₹
                          {Math.abs(transaction.amount).toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span>
                          ₹{transaction.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                      {transaction.commission !== 0 ? (
                        transaction.commission < 0 ? (
                          <span className="text-success">
                            +₹
                            {Math.abs(transaction.commission).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        ) : (
                          <span className="text-error">
                            -₹{transaction.commission.toLocaleString("en-IN")}
                          </span>
                        )
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {transaction.type === "sale" ? (
                        <span className="text-success">
                          +₹
                          {(
                            transaction.amount - transaction.commission
                          ).toLocaleString("en-IN")}
                        </span>
                      ) : transaction.type === "refund" ? (
                        <span className="text-error">
                          -₹
                          {(
                            Math.abs(transaction.amount) -
                            Math.abs(transaction.commission)
                          ).toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-error">
                          -₹
                          {Math.abs(transaction.amount).toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-text-muted"
                  >
                    No transactions found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Wrap the earnings content with the ProtectedRoute component
export default function SellerEarnings() {
  return (
    <ProtectedRoute requireOnboarding={true}>
      <EarningsContent />
    </ProtectedRoute>
  );
}
