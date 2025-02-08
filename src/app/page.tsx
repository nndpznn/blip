'use client'

import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center justify-center sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="p-5 flex flex-col gap-8 items-center sm:items-start"> {/* border-b-2 border-red-400 */}
          <Image
            className=""
            src="/favicon.ico"
            alt="blip logo"
            width={180}
            height={38}
            priority
          />

          <p className="w-[50vw]">welcome to blip, your new companion for finding nearby cars and coffee events and meets from community leaders. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>

        </main>

        <Link
          className="mt-10 rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-red-400 hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
          href="/map"
        >
          open blip
        </Link>
      </div>

      <footer className="flex gap-6 flex-wrap items-center justify-center mt-auto w-full">
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
