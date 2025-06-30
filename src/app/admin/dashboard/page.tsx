'use server';

import { getDashboardStats, getChartData, getTopBettors, getRecentUsers } from "@/actions/admin-actions";
import { getRichestUsers, getTopLevelUsers, getTopInviters } from "@/actions/user-actions";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default async function Dashboard() {
    const [stats, chartData, topBettors, recentUsers, richestUsers, topLevelUsers, topInviters] = await Promise.all([
        getDashboardStats(),
        getChartData('weekly'),
        getTopBettors(),
        getRecentUsers(),
        getRichestUsers(),
        getTopLevelUsers(),
        getTopInviters(),
    ]);

    return (
        <AdminDashboardClient
            stats={stats}
            initialChartData={chartData}
            topBettors={topBettors.slice(0, 5)}
            recentUsers={recentUsers}
            richestUsers={richestUsers.slice(0, 5)}
            topLevelUsers={topLevelUsers.slice(0, 5)}
            topInviters={topInviters.slice(0, 5)}
        />
    );
}
