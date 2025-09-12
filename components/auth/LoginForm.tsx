'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/auth/validation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>
  onForgotPassword?: () => void
  className?: string
}

export function LoginForm({ onSubmit, onForgotPassword, className }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true)
      setSubmitError(null)
      await onSubmit(data)
      reset()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Login failed. Please try again.'
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
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            {...register('email')}
            error={errors.email?.message ?? ''}
            disabled={isSubmitting}
          />

          {errors.email && (
            <ErrorMessage message={errors.email?.message ?? 'Invalid email'} className="mt-1" />
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            {...register('password')}
            error={errors.password?.message ?? ''}
            disabled={isSubmitting}
          />

          {errors.password && (
            <ErrorMessage message={errors.password?.message ?? 'Invalid password'} className="mt-1" />
          )}
        </div>
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
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-sm text-blue-600 hover:text-blue-500 transition-colors"
            disabled={isSubmitting}
          >
            Forgot your password?
          </button>
        )}
      </div>
    </form>
  )
}