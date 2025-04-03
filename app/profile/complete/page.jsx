import { Suspense } from 'react';
import CompleteProfileClient from './CompleteProfileClient';

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <CompleteProfileClient />
    </Suspense>
  );
}
