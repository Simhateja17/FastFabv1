import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-800">Page Not Found</h2>
        <p className="mt-3 text-gray-600">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8">
          <Link href="/" className="inline-flex items-center px-6 py-3 text-white bg-primary rounded-md hover:bg-primary-dark transition duration-300">
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
} 