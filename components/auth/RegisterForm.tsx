'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/auth/validation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>
  className?: string
}

export function RegisterForm({ onSubmit, className }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  const password = watch('password')

  const handleFormSubmit = async (data: RegisterFormData) => {
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      await onSubmit(data)
      reset()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={`space-y-6 ${className || ''}`}
      noValidate
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            {...register('name')}
            error={!!errors.name}
            disabled={isSubmitting}
          />
          {errors.name && (
            <ErrorMessage message={errors.name.message} className="mt-1" />
          )}
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

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Enter your phone number"
            {...register('phone')}
            error={!!errors.phone}
            disabled={isSubmitting}
          />
          {errors.phone && (
            <ErrorMessage message={errors.phone.message} className="mt-1" />
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            {...register('password')}
            error={!!errors.password}
            disabled={isSubmitting}
          />
          {errors.password && (
            <ErrorMessage message={errors.password.message} className="mt-1" />
          )}
          <div className="mt-1 text-xs text-gray-500">
            Password must contain at least one uppercase letter, lowercase letter, and number
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <ErrorMessage message={errors.confirmPassword.message} className="mt-1" />
          )}
        </div>
      </div>

      {submitError && (
        <ErrorMessage message={submitError} className="text-center" />
      )}

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
            Creating Account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <div className="text-xs text-gray-500 text-center">
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </div>
    </form>
  )
}