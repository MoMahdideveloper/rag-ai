import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatCard from './common/StatCard';
import UsersIcon from './icons/UsersIcon';
import HomeModernIcon from './icons/HomeModernIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

interface SummaryData {
    totalCustomers: number;
    totalProperties: number;
    propertiesForSale: number;
    propertiesForRent: number;
    tasksCompleted: number;
    tasksPending: number;
}

interface TimeSeriesData {
    month: string;
    count: number;
}

const AnalyticsDashboard: React.FC<{ activeTeamId: number | null }> = ({ activeTeamId }) => {
    const { token } = useAuth();
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [customerSeries, setCustomerSeries] = useState<TimeSeriesData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!activeTeamId) {
            setLoading(false);
            return;
        };

        const fetchData = async () => {
            setLoading(true);
            try {
                const [summaryData, seriesData] = await Promise.all([
                    api.get(`/api/analytics/summary?teamId=${activeTeamId}`, token),
                    api.get(`/api/analytics/timeseries?teamId=${activeTeamId}`, token)
                ]);
                setSummary(summaryData);
                setCustomerSeries(seriesData.customerSeries);
            } catch (error) {
                console.error("Failed to fetch analytics data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTeamId, token]);

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    if (!activeTeamId) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-sm">Please select a team to view analytics.</div>;
    }

    if (!summary) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-sm">Could not load analytics data.</div>;
    }

    const propertyTypeData = {
        labels: ['For Sale', 'For Rent'],
        datasets: [{
            data: [summary.propertiesForSale, summary.propertiesForRent],
            backgroundColor: ['#3b82f6', '#10b981'],
        }]
    };

    const taskStatusData = {
        labels: ['Completed', 'Pending'],
        datasets: [{
            data: [summary.tasksCompleted, summary.tasksPending],
            backgroundColor: ['#84cc16', '#f97316'],
        }]
    };

    const customerChartData = {
        labels: customerSeries.map(d => d.month),
        datasets: [{
            label: 'New Customers per Month',
            data: customerSeries.map(d => d.count),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            fill: true,
        }]
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold">Analytics Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<UsersIcon />} title="Total Customers" value={summary.totalCustomers} />
                <StatCard icon={<HomeModernIcon />} title="Total Properties" value={summary.totalProperties} />
                <StatCard icon={<ClipboardCheckIcon />} title="Tasks Completed" value={summary.tasksCompleted} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-semibold mb-4">New Customers Over Time</h3>
                    <Line data={customerChartData} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-semibold mb-4">Property Types</h3>
                    <Pie data={propertyTypeData} />
                </div>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-semibold mb-4">Task Status</h3>
                    <Pie data={taskStatusData} />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
