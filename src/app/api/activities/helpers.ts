export type Streak = {
    start: Date;
    end: Date;
};

export function findBestActivitiesForStreaks(
    activities: any[],
    streaks: any[],
    scoreFn: (activity: any) => number
): (any | null)[] {

    // Sort activities by date once
    const sortedActivities = activities.sort(
        (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );
    // console.log(sortedActivities)
    return streaks.map(streak => {
        let bestActivity: any | null = null;
        let bestScore = -Infinity;
        for (const activity of sortedActivities) {
            const date = new Date(activity.start_date_local)
            if (date > streak.end) break;
            if (date < streak.start) continue;

            const score = scoreFn(activity);

            if (score > bestScore) {
                bestScore = score;
                bestActivity = activity;
            }
        }
        
        return bestActivity;
    });
}