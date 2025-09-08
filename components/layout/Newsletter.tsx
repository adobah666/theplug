'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface NewsletterProps {
  title?: string
  subtitle?: string
  placeholder?: string
  buttonText?: string
  benefits?: string[]
  className?: string
}

const Newsletter: React.FC<NewsletterProps> = ({
  title = "Stay in the Loop",
  subtitle = "Subscribe to our newsletter for the latest fashion trends, exclusive offers, and style tips delivered straight to your inbox.",
  placeholder = "Enter your email address",
  buttonText = "Subscribe",
  benefits = [
    "Exclusive early access to sales",
    "Weekly style inspiration",
    "New arrival notifications",
    "Special subscriber-only discounts"
  ],
  className = ""
}) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Here you would typically make an API call to subscribe the user
      // const response = await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email })
      // })

      setIsSubscribed(true)
      setEmail('')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubscribed) {
    return (
      <section className={`py-16 bg-gradient-to-r from-green-50 to-blue-50 ${className}`}>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to the ThePlug Family!
          </h3>
          <p className="text-gray-600 mb-6">
            Thank you for subscribing! You'll receive your first newsletter with exclusive offers and style tips soon.
          </p>
          <Button 
            variant="outline" 
            onClick={() => setIsSubscribed(false)}
            className="text-sm"
          >
            Subscribe Another Email
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className={`py-16 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            {title}
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Benefits */}
          <div className="space-y-4">
            <h4 className="text-xl font-semibold text-gray-900 mb-6">
              What you'll get:
            </h4>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 mr-3">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Subscription Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder={placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  disabled={isLoading}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Subscribing...
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </form>

            <p className="mt-4 text-xs text-gray-500 text-center">
              By subscribing, you agree to our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
              . You can unsubscribe at any time.
            </p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Join over 50,000 fashion enthusiasts who trust ThePlug
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="text-xs text-gray-400">Trusted by</div>
            <div className="flex space-x-4">
              {/* Placeholder for customer logos or testimonials */}
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Newsletter }