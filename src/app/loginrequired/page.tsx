'use client'

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabase } from '@/clients/supabaseClient';
import { Button } from "@heroui/button";
import { safeNextPath } from '@/util/safeNextPath';

function LoginRequiredContent() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      console.log(error)
      return
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--nav-height,4rem))] items-center justify-center font-(--font-geist-sans) px-6">
	  <Image alt="blip-bg" src="/assets/blip-bg.png" className="w-screen fixed top-0 left-0 z-0" width={1} height={1}></Image>
	  
      <div className="z-1 flex flex-col gap-8 items-center text-center max-w-md">
        <Image
          src="/favicon.ico"
          alt="blip logo"
          width={180}
          height={38}
          priority
        />

        <p className="text-white/90">
          This page is only available when you&apos;re signed in. Sign in with your account to continue, or head back to the home page.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            as={Link}
            href="/"
            variant="bordered"
            className="min-w-40"
          >
            Go to home
          </Button>
          <Button
            onPress={signInWithGoogle}
            className="min-w-40"
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function LoginRequired() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-var(--nav-height,4rem))] items-center justify-center">
        Loading…
      </div>
    }>
      <LoginRequiredContent />
    </Suspense>
  )
}
