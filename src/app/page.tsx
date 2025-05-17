'use client'

import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter()

  return (
    <div className="flex flex-col justify-between min-h-screen sm:p-20 font-[var(--font-geist-sans)]">
      <div id="main-cluster" className="flex flex-col flex-grow items-center justify-center sm:p-20 font-[var(--font-geist-sans)]">
        <main className="flex flex-col gap-8 items-center sm:items-start"> {/* border-b-2 border-red-400 */}
          <Image
            className=""
            src="/favicon.ico"
            alt="blip logo"
            width={180}
            height={38}
            priority
          />

          <p className="w-[50vw]">welcome to blip, your new companion for finding nearby cars and coffee events and meets from community leaders. this app came about as a result of the realization that we, as car enthusiasts, have no real central resource to find if there are any nearby/upcoming car enthusiast shows and meets, known to the community as "cars and coffee" events. looking through Reddit threads, Facebook forums, and Instagram pages can be tedious and community centers can be hard to find. we hope that this map can become this central resource for carspotters around the country(but california for now) to rely on to find cool events near them.</p>

        </main>

        <Link
          className="mt-5 rounded-full border border-solid border-white/[.145] transition-colors flex items-center justify-center hover:bg-red-400 text-base h-12 px-5 min-w-44"
          href="/map"
        >
          open blip
        </Link>
      </div>

      <footer className="flex py-5 gap-6 items-center justify-center mt-auto w-full">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/nndpznn/blip"
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
          documentation
        </a>
      </footer>
    </div>
  );
}
