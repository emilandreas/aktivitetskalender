"use client";
import "./page.css";
import Image from "next/image";
import Activities from "./activities"


export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="stravaConnect">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/api/auth/strava"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Bli med i Aktivitetskalenderen→
        </a>
      </div>
      <main className="flex flex-col gap-64px] row-start-2 items-center sm:items-start">
        <Activities clubId="teleplan_no"></Activities>
      </main>

    </div>
  );
}
