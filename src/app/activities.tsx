"use client";
import "./activities.css";

import React, { useEffect, useState } from 'react';
import { AthleteDisplay, CompetitionDetails, ResponseObject } from './interfaces';


export default function Activities( props:any){
    const [scoreboard, setScoreboard] = useState<Array<AthleteDisplay>>([]);
    const [details, setDetails] = useState<CompetitionDetails>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchActivities = async () => {
        try {
          const response = await fetch(
            `/api/activities`
          );
          const data: ResponseObject = await response.json();

          // Filter running activities and sort by distance in descending order
          const scores = data.athleteDisplays
            .sort((a:any , b:any) => b.score - a.score);
          setDetails(data.details);
          setScoreboard(scores);
        } catch (error) {
          console.error('Error fetching activities:', error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchActivities();
    }, []);
  
    if (loading) {
      return <div>Loading...</div>;
    }

    function progress(){
      const total_score = details?.total_score ?? 0; 
      return total_score/15000
    }
  
    return (
      <div>
        <h1 className="header"><b>Leaderboard</b></h1>
        <br></br>
        <div>
        Premieprogresjon [kr]: 0 <progress value={progress()}/> 7500  &nbsp;&nbsp;    
        Total poengsum: {details?.total_score.toFixed(2)}/15000
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Athlete</th>
              <th>Number of activities</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((activity:AthleteDisplay) => (
              <tr key={activity.firstname+activity.lastname}>
                <td className="nopad"><img src={activity.img} className="profile-pic"/></td>
                <td>{activity.firstname} {activity.lastname}</td>
                <td>{activity.number_of_activities} </td>
                <td>{(activity.score).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };