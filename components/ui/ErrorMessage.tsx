import React from 'react'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
  'data-testid'?: string
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  className,
  'data-testid': dataTestId
}) => {
  return (
    <div className={cn('rounded-lg border border-red-200 bg-red-50 p-4', className)} data-testid={dataTestId}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { ErrorMessage }