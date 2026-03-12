"use client";
import "./activities.css";

import React, { useEffect, useState } from "react";
import { AthleteDisplay, CompetitionDetails, ResponseObject } from "./interfaces";
import { Streak } from "./api/activities/helpers";
import dayjs from "dayjs"

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
        console.log("data.details.best_streak_activities: ")
        console.log(data.details.best_overall_activity)
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
  function printPeriod(p:Streak){
    console.log("p: ", p)
    const d1 = dayjs(p.start);
    const d2 = dayjs(p.end);
    return d1.format("DD.MM") + " to " + d2.format("DD.MM");
  }
  return (
    
    
    <div className="activities-container">
      <div className="highlights">

      <h2 className="section-title">Period highscores</h2>

      <div className="highlight-scroll">

      {details?.best_streak_activities.map((item: any, index: any) => item == null ? null : (
          <div key={index} className="highlight-card">
            <div className="period">{printPeriod(item.period)}</div>

            <div className="km">
              {((item.activity?.distance ?? 0)/1000).toFixed?.(2)} km 
            </div>

            <div className="athlete">
              {item.user?.firstname} {item.user?.lastname}
            </div>
            <div className="date">{item.activity?.type}</div>

          </div>
        ))}
      </div>
      <div className="longest-card">
        <div className="period">Overall highscore</div>
        <div className="km">{(((details?.best_overall_activity?.activity?.distance)?? 0)/1000).toFixed(2)} km</div>
        <div className="athlete">{details?.best_overall_activity?.user?.firstname + " " + details?.best_overall_activity?.user?.lastname}</div>
        <div className="date">{dayjs(details?.best_overall_activity?.activity?.start_date_local).format("DD.MM")}</div>
        <div className="date">{details?.best_overall_activity?.activity?.type}</div>
      </div>

    </div>
      <h2 className="section-title">Leaderboard</h2>
{/* 
      <div className="progress-container">
        <span>Premieprogresjon [kr]</span>
        <progress value={progress()} max={1} />
        <div>
          Total premiesum: {(progress() * 7500).toFixed(2)}/15000
        </div>
      </div> */}

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