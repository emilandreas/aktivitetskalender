export type Streak = {
    start: Date;
    end: Date;
};

export function findBestActivitiesForStreaks(
    listOfActivitiyLists: any[],
    streaks: any[],
    scoreFn: (activity: any) => number, 
    users: any[]
): ({period: Streak, user: string, activity: any} | null)[] {
    const allActivities = listOfActivitiyLists.flat();
    // Sort activities by date once
    const sortedActivities = allActivities.sort(
        (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );
    console.log("Activities sorted")
    return streaks.map(streak => {
        let bestActivity: any | null = null;
        let bestScore = -Infinity;
        for (const activity of sortedActivities) {
            if(!activity) continue;
            const date = new Date(activity.start_date_local)
            if (date > streak.end) break;
            if (date < streak.start) continue;

            const score = scoreFn(activity);

            if (score > bestScore) {
                bestScore = score;
                bestActivity = activity;
            }
        }
        console.log(bestActivity)
        if(!bestActivity) return {period: streak, user: null, activity: null};
        const bestActivityUser = users.find(u => u.id == bestActivity.athlete.id)
        return {period: streak, user: bestActivityUser, activity: bestActivity}
    });
}