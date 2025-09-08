'use client'

import React from 'react'

interface Step {
  id: string
  title: string
  description: string
  completed: boolean
  current: boolean
}

interface MobileCheckoutStepperProps {
  steps: Step[]
  currentStep: number
}

const MobileCheckoutStepper: React.FC<MobileCheckoutStepperProps> = ({ 
  steps, 
  currentStep 
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step Info */}
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {currentStep + 1}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {steps[currentStep]?.title}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {steps[currentStep]?.description}
          </p>
        </div>
      </div>

      {/* Step Navigation Dots */}
      <div className="flex items-center justify-center space-x-2 mt-3">
        {steps.map((step, index) => (
          <button
            key={step.id}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index <= currentStep
                ? 'bg-blue-600'
                : 'bg-gray-300'
            }`}
            aria-label={`Go to step ${index + 1}: ${step.title}`}
          />
        ))}
      </div>
    </div>
  )
}

export { MobileCheckoutStepper }