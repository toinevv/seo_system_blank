'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize PostHog on the client side and if not already initialized
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
        // Capture pageviews automatically
        capture_pageview: true,
        // Capture pageleaves to measure time on page
        capture_pageleave: true,
        // Enable session recording (if you have this feature)
        disable_session_recording: false,
        // Respect Do Not Track browser setting
        respect_dnt: true,
        // Only load in production or when explicitly enabled
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            // In development, you can see events in the console
            posthog.debug()
          }
        },
      })
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
