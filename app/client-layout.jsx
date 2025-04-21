"use client";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Providers } from "./providers";
import { LocationProvider } from "./context/LocationContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import dynamic from 'next/dynamic';

const LocationPermissionHandler = dynamic(
  () => import('./components/LocationPermissionHandler'),
  { ssr: false }
);

const AuthProvider = dynamic(
  () => import('./context/AuthContext').then((mod) => mod.AuthProvider),
  { ssr: false }
);

export default function ClientLayout({ children }) {
  return (
    <Providers>
      <AuthProvider>
        <UserAuthProvider>
          <LocationProvider>
            <Navbar />
            <main className="flex-grow">
              <LocationPermissionHandler>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary border-solid rounded-full border-t-transparent animate-spin"></div>
                  </div>
                }>
                  {children}
                </Suspense>
              </LocationPermissionHandler>
            </main>
            <Footer />
          </LocationProvider>
        </UserAuthProvider>
      </AuthProvider>
      <Analytics />
    </Providers>
  );
} 