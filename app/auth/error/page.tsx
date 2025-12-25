'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const description = searchParams.get('description');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4v2m0 0H9m3 0h3m-5-8a9 9 0 110 18 9 9 0 010-18z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          </div>

          <div className="space-y-4 mb-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold text-sm">
                  {error.replace(/_/g, ' ').charAt(0).toUpperCase() +
                    error.slice(1).replace(/_/g, ' ')}
                </p>
              </div>
            )}

            {description && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm">{description}</p>
              </div>
            )}

            {!error && !description && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm">
                  An error occurred during authentication. Please try again.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </Link>
            <Link
              href="/"
              className="w-full block text-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Go Home
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          If this issue persists, please contact support.
        </p>
      </div>
    </div>
  );
}
