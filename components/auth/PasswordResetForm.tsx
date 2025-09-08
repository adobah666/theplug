'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { passwordResetSchema, type PasswordResetFormData } from '@/lib/auth/validation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface PasswordResetFormProps {
  onSubmit: (data: PasswordResetFormData) => Promise<void>
  onBackToLogin?: () => void
  className?: string
}

export function PasswordResetForm({ onSubmit, onBackToLogin, className }: PasswordResetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    getValues,
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    mode: 'onChange',
  })

  const handleFormSubmit = async (data: PasswordResetFormData) => {
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      await onSubmit(data)
      setSubmittedEmail(data.email)
      setIsSuccess(true)
      reset()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to send reset email. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setIsSuccess(false)
    setSubmitError(null)
    setSubmittedEmail('')
  }

  if (isSuccess) {
    return (
      <div className={`text-center space-y-6 ${className || ''}`}>
        <div className="space-y-2">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              data-testid="success-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
          <p className="text-sm text-gray-600">
            We've sent a password reset link to{' '}
            <span className="font-medium">{submittedEmail}</span>
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onBackToLogin}
          >
            Back to Sign In
          </Button>
          <button
            type="button"
            onClick={handleTryAgain}
            className="w-full text-sm text-blue-600 hover:text-blue-500 transition-colors"
          >
            Didn't receive the email? Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={`space-y-6 ${className || ''}`}
      noValidate
    >
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Reset your password</h3>
        <p className="text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          {...register('email')}
          error={!!errors.email}
          disabled={isSubmitting}
        />
        {errors.email && (
          <ErrorMessage message={errors.email.message} className="mt-1" />
        )}
      </div>

      {submitError && (
        <ErrorMessage message={submitError} className="text-center" />
      )}

      <div className="space-y-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        {onBackToLogin && (
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-sm text-blue-600 hover:text-blue-500 transition-colors"
            disabled={isSubmitting}
          >
            Back to Sign In
          </button>
        )}
      </div>
    </form>
  )
}