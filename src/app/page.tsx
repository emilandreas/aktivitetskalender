"use client";
import "./page.css";
import Image from "next/image";
import Activities from "./activities";

export default function Home() {
  return (
    <div className="page-container">
      
      <div className="top-section">
        <div className="stravaConnect">
          <a
            className="stravaLink"
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
            Connect With Strava
          </a>
        </div>

        {/* <div className="infoBox">
          <strong>Double score dates:</strong><br />
          1. april<br />
          2. april<br />
          8. april<br />
          26. april<br />
          10. mai<br />
          <br />
          <strong>Limited longest activity challenge:</strong><br />
          Lengste aktivitet fullført<br />
          helgen 18.-19. april og 2.-4. mai
        </div> */}
      </div>

      <main className="main-content">
        <Activities />
      </main>
    </div>
  );
}

