"use client";
import "./activities.css";

import React, { useEffect, useState } from "react";
import { AthleteDisplay, CompetitionDetails, ResponseObject } from "./interfaces";

export default function Activities(props: any) {
  const [scoreboard, setScoreboard] = useState<Array<AthleteDisplay>>([]);
  const [details, setDetails] = useState<CompetitionDetails>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch(`/api/activities`);
        const data: ResponseObject = await response.json();

        const scores = data.athleteDisplays.sort(
          (a: any, b: any) => b.score - a.score
        );

        setDetails(data.details);
        setScoreboard(scores);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  function progress() {
    const total_score = details?.total_score ?? 0;
    return total_score / 15000;
  }

  if (loading) {
    return (
      <div className="activities-container">
        <h1 className="header">Leaderboard</h1>
        <div className="skeleton-podium" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    );
  }

  const topThree = scoreboard.slice(0, 3);
  const rest = scoreboard.slice(3);

  return (
    <div className="activities-container">
      <h1 className="header">Leaderboard</h1>

      <div className="progress-container">
        <span>Premieprogresjon [kr]</span>
        <progress value={progress()} max={1} />
        <div>
          Total premiesum: {(progress() * 7500).toFixed(2)}/15000
        </div>
      </div>

    {/* 🏆 TOP 3 */}
    <div className="card-list">
      {topThree.map((athlete, index) => (
        <div
          key={index}
          className={`athlete-card podium-card place-${index + 1}`}
        >
          <div className="rank">#{index + 1}</div>

          <img src={athlete.img} className="profile-pic" />

          <div className="athlete-info">
            <div className="name">
              {athlete.firstname} {athlete.lastname}
            </div>
            <div className="stats">
              <span>{athlete.number_of_activities} activities</span>
              <span>{athlete.score.toFixed(2)} pts</span>
              <span>{athlete.km_score.toFixed(2)} km</span>
            </div>
          </div>
        </div>
      ))}


      {/* 🏃 Remaining Athletes */}
        {rest.map((athlete, index) => (
          <div key={index} className="athlete-card">
            <div className="rank">#{index + 4}</div>

            <img src={athlete.img} className="profile-pic" />

            <div className="athlete-info">
              <div className="name">
                {athlete.firstname} {athlete.lastname}
              </div>
              <div className="stats">
                <span>{athlete.number_of_activities} activities</span>
                <span>{athlete.score.toFixed(2)} pts</span>
                <span>{athlete.km_score.toFixed(2)} km</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}