'use client'

import {HeroUIProvider} from '@heroui/react'
import { GoogleOAuthProvider } from '@react-oauth/google'

export function Providers({children}: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
    </GoogleOAuthProvider>
  )
}