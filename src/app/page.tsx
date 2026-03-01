'use client'

import Image from "next/image";
import { supabase } from '../clients/supabaseClient';
import { Button } from "@heroui/button";

export default function Home() {

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/map`, // Or just /map
      },
    })
  }

  return (
    <div className="flex flex-col justify-between min-h-screen sm:p-10 font-(--font-geist-sans)">
      <Image alt="blip-bg" src="/assets/blip-bg.png" className="fixed top-0 left-0 w-full h-full object-cover z-0" fill={true} sizes="100vw" style={{objectFit: 'cover'}}></Image>
      
      <div id="main-cluster" className="z-1 flex flex-1 flex-col items-center justify-center sm:p-20 font-(--font-geist-sans)">
        <main className="flex flex-col gap-8 items-center justify-center sm:items-start"> {/* border-b-2 border-red-400 */}
          <Image
            className=""
            src="/favicon.ico"
            alt="blip logo"
            width={180}
            height={38}
            priority
          />

          <p className="w-[50vw]">welcome to blip, your new companion for finding nearby cars and coffee events and meets from community leaders. this app came about as a result of the realization that we, as car enthusiasts, have no real central resource to find if there are any nearby/upcoming car enthusiast shows and meets. looking through Tiktok, Reddit threads, Facebook forums, and Instagram pages can be tedious and community centers can be hard to find. we hope that this map can become this central resource for carspotters around the country(but california for now) to rely on to find cool events near them.</p>

          <Button className="self-center p-6" onPress={signInWithGoogle}>Sign in with Google</Button>
        </main>
      </div>

      <footer className="flex py-5 gap-6 items-center justify-center mt-auto w-full z-1">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://ko-fi.com/blip"
          target="_blank"
          rel="noopener noreferrer"
        >
          support us
        </a>
      </footer>
    </div>
  );
}
