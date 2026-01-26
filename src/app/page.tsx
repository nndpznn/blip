'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CredentialResponse, GoogleLogin } from '@react-oauth/google'
import { supabase } from '../clients/supabaseClient';

export default function Home() {
  const router = useRouter()

  return (
    <div className="flex flex-col justify-between min-h-screen sm:p-20 font-(--font-geist-sans)">
      <Image alt="blip-bg" src="/assets/blip-bg.png" className="w-screen h-screen fixed top-0 left-0 z-0" width={1} height={1}></Image>
      
      <div id="main-cluster" className="z-1 flex flex-col grow items-center justify-center sm:p-20 font-(--font-geist-sans)">
        <main className="flex flex-col gap-8 items-center sm:items-start"> {/* border-b-2 border-red-400 */}
          <Image
            className=""
            src="/favicon.ico"
            alt="blip logo"
            width={180}
            height={38}
            priority
          />

          <p className="w-[50vw]">welcome to blip, your new companion for finding nearby cars and coffee events and meets from community leaders. this app came about as a result of the realization that we, as car enthusiasts, have no real central resource to find if there are any nearby/upcoming car enthusiast shows and meets. looking through Tiktok, Reddit threads, Facebook forums, and Instagram pages can be tedious and community centers can be hard to find. we hope that this map can become this central resource for carspotters around the country(but california for now) to rely on to find cool events near them.</p>

        </main>

        {/* <Link
          className="mt-5 rounded-full border border-solid border-white/[.145] transition-colors flex items-center justify-center hover:bg-red-400 text-base h-12 px-5 min-w-44"
          href="/map"
        >
          open blip
        </Link> */}
        <div>
          {/* <LoginWithGoogle /> */}
          {/* <Button onPress={() => router.push("/map")}>open blip</Button> */}
          <GoogleLogin
            useOneTap={false}
            size="large"
            type="standard"
            // style={{ width: '300px', height: '50px' }}
            onSuccess={async (credentialResponse: CredentialResponse) => {
              console.info('CREDENTIAL RESPONSE JWT TOKEN: ', JSON.stringify(credentialResponse, null, 2))

              if (!credentialResponse.credential) throw new Error('No credential found in response')

              // Sign in to Supabase with the Google credential
              // https://supabase.com/docs/guides/auth/social-login/auth-google#using-personalized-sign-in-buttons-one-tap-or-automatic-signin
              const supabaseResponse = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: credentialResponse.credential,
              })

              console.info('SUPABASE signInWithIdToken RESPONSE: ', supabaseResponse)
              console.info('routing to map...')

              router.push('/map')
            }}
            onError={() => {
              console.info('Login Failed')
            }}
          />
        </div>

      </div>

      <footer className="flex py-5 gap-6 items-center justify-center mt-auto w-full z-1">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://ko-fi.com/blip"
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          /> */}
          support us
        </a>
      </footer>
    </div>
  );
}
