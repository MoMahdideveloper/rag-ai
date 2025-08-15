
import React from 'react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-6">
            <div className="bg-slate-100 p-3 rounded-full">
                {icon}
            </div>
            <div>
                <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
                <p className="text-3xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;
