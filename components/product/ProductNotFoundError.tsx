'use client';

import { useRouter } from 'next/navigation';

interface ProductNotFoundErrorProps {
  fetchError?: string | null;
}

export function ProductNotFoundError({ fetchError }: ProductNotFoundErrorProps) {
  const router = useRouter();

  const handleRetry = () => {
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-center">
        <div className="text-gray-700 text-lg mb-4">Product not found</div>
        {fetchError && process.env.NODE_ENV === 'development' && (
          <div className="text-sm text-gray-500 max-w-md mb-4">
            Debug info: {fetchError}
          </div>
        )}
        <button 
          onClick={handleRetry}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
