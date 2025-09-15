'use client'

import React from 'react'
import { CheckoutStep } from '@/types/checkout'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: CheckoutStep
  completedSteps: CheckoutStep[]
}

const steps: { key: CheckoutStep; label: string; number: number }[] = [
  { key: 'shipping', label: 'Shipping', number: 1 },
  { key: 'payment', label: 'Payment', number: 2 },
  { key: 'review', label: 'Review', number: 3 }
]

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  completedSteps
}) => {
  const getStepStatus = (stepKey: CheckoutStep) => {
    if (completedSteps.includes(stepKey)) return 'completed'
    if (stepKey === currentStep) return 'current'
    return 'upcoming'
  }

  return (
    <nav aria-label="Checkout progress" className="mb-6 sm:mb-8">
      <ol className="flex items-center w-full justify-between sm:justify-center sm:space-x-8">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key)
          const isLast = index === steps.length - 1

          return (
            <li key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full border-2 font-medium h-8 w-8 text-xs sm:h-10 sm:w-10 sm:text-sm',
                    {
                      'border-green-500 bg-green-500 text-white': status === 'completed',
                      'border-blue-500 bg-blue-500 text-white': status === 'current',
                      'border-gray-300 bg-white text-gray-500': status === 'upcoming'
                    }
                  )}
                >
                  {status === 'completed' ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    'mt-1 sm:mt-2 text-[11px] sm:text-sm font-medium',
                    {
                      'text-green-600': status === 'completed',
                      'text-blue-600': status === 'current',
                      'text-gray-500': status === 'upcoming'
                    }
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 min-w-[24px] sm:ml-8 sm:w-16 sm:flex-none',
                    {
                      'bg-green-500': completedSteps.includes(step.key),
                      'bg-gray-300': !completedSteps.includes(step.key)
                    }
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { ProgressIndicator }