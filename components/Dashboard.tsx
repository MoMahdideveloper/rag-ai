import React, { useMemo } from 'react';
import { Customer, CustomerStatus, Property, Task, TransactionType } from '../types';
import UserPlusIcon from './icons/UserPlusIcon';
import StatCard from './common/StatCard';
import UsersIcon from './icons/UsersIcon';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon';
import BuildingLibraryIcon from './icons/BuildingLibraryIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface DashboardProps {
    customers: Customer[];
    properties: Property[];
    tasks: Task[];
    onAddCustomer: () => void;
    onAddProperty: () => void;
    onViewTasks: () => void;
    onViewCalendar: () => void;
    onSelectCustomer: (id: number) => void;
    onToggleTask: (id: number) => void;
}

const statusTextMap: { [key in CustomerStatus]: string } = {
    [CustomerStatus.Active]: "فعال",
    [CustomerStatus.Searching]: "در جستجو",
    [CustomerStatus.Contracted]: "قرارداد بسته",
    [CustomerStatus.Cancelled]: "منصرف شده",
};

const statusColorMap: { [key in CustomerStatus]: string } = {
    [CustomerStatus.Active]: 'bg-blue-500',
    [CustomerStatus.Searching]: 'bg-yellow-500',
    [CustomerStatus.Contracted]: 'bg-green-500',
    [CustomerStatus.Cancelled]: 'bg-slate-400',
};

const Dashboard: React.FC<DashboardProps> = ({ customers, properties, tasks, onAddCustomer, onAddProperty, onViewTasks, onViewCalendar, onSelectCustomer, onToggleTask }) => {
    const stats = useMemo(() => {
        const openTasks = tasks.filter(t => !t.isCompleted).length;
        const buyers = customers.filter(c => c.requirements.transactionType === TransactionType.Sale).length;
        const renters = customers.filter(c => c.requirements.transactionType === TransactionType.Rent).length;
        const contractedCount = customers.filter(c => c.status === CustomerStatus.Contracted).length;
        return { openTasks, buyers, renters, contracted: contractedCount };
    }, [customers, tasks]);

    const statusCounts = useMemo(() => {
        const counts = {
            [CustomerStatus.Active]: 0,
            [CustomerStatus.Searching]: 0,
            [CustomerStatus.Contracted]: 0,
            [CustomerStatus.Cancelled]: 0,
        };
        customers.forEach(c => {
            if (c.status in counts) {
                counts[c.status]++;
            }
        });
        return Object.entries(counts) as [CustomerStatus, number][];
    }, [customers]);

    const upcomingTasks = useMemo(() => {
        return tasks
            .filter(t => !t.isCompleted)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
    }, [tasks]);

    const maxCount = Math.max(...statusCounts.map(([, count]) => count), 1);

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">داشبورد</h1>
                <p className="text-md text-slate-600 mt-1">نمای کلی از مشتریان و فعالیت‌های شما.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="متقاضیان خرید" value={stats.buyers} icon={<UsersIcon className="w-8 h-8 text-blue-500"/>} />
                <StatCard title="متقاضیان اجاره" value={stats.renters} icon={<UsersIcon className="w-8 h-8 text-green-500"/>} />
                <StatCard title="وظایف باز" value={stats.openTasks} icon={<CalendarDaysIcon className="w-8 h-8 text-rose-500"/>} />
                <StatCard title="قراردادهای بسته شده" value={stats.contracted} icon={<ClipboardCheckIcon className="w-8 h-8 text-violet-500"/>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">وظایف پیش رو</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={onViewCalendar} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">نمایش در تقویم</button>
                            <button onClick={onViewTasks} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">مشاهده همه &larr;</button>
                        </div>
                    </div>
                    {upcomingTasks.length > 0 ? (
                        <ul className="space-y-3">
                            {upcomingTasks.map(task => {
                                const customer = customers.find(c => c.id === task.customerId);
                                const isOverdue = !task.isCompleted && (new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)));
                                return (
                                <li key={task.id} className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                                     <button onClick={() => onToggleTask(task.id)} className="text-slate-300 hover:text-green-500 transition-colors p-1" title="اتمام وظیفه"><CheckCircleIcon className="w-7 h-7"/></button>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800">{task.title}</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>{new Date(task.dueDate).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                                            {customer && (<><span className="text-slate-300">|</span><button onClick={() => onSelectCustomer(customer.id)} className="text-indigo-600 font-medium hover:underline">{customer.name}</button></>)}
                                        </div>
                                    </div>
                                </li>
                                )
                            })}
                        </ul>
                    ) : ( <p className="text-center text-slate-500 py-8">هیچ وظیفه بازی ندارید. عالیه!</p> )}
                 </div>
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center h-full">
                        <h3 className="text-xl font-semibold mb-2">مشتری جدیدی دارید؟</h3>
                        <p className="text-slate-600 text-sm mb-4">مشتری جدید را اضافه کرده و اجازه دهید Gemini اطلاعات را استخراج کند.</p>
                        <button onClick={onAddCustomer} className="flex items-center gap-2 w-full justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"><UserPlusIcon className="w-5 h-5"/>افزودن مشتری جدید</button>
                    </div>
                    <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-center h-full">
                        <h3 className="text-xl font-semibold mb-2">ملک جدیدی ثبت می‌کنید؟</h3>
                        <p className="text-slate-600 text-sm mb-4">ملک جدید را ثبت کرده و مشتریان مناسب آن را پیدا کنید.</p>
                        <button onClick={onAddProperty} className="flex items-center gap-2 w-full justify-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"><BuildingLibraryIcon className="w-5 h-5"/>افزودن ملک جدید</button>
                    </div>
                 </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
                 <h2 className="text-2xl font-bold mb-6">تفکیک مشتریان بر اساس وضعیت</h2>
                 <div className="space-y-4">
                    {statusCounts.map(([status, count]) => (
                        <div key={status} className="flex items-center gap-4">
                            <div className="w-32 text-sm font-medium text-slate-600 text-left">{statusTextMap[status]} ({count})</div>
                            <div className="flex-1 bg-slate-200 rounded-full h-6">
                                <div className={`h-6 rounded-full ${statusColorMap[status]} transition-all duration-500`} style={{ width: `${(count / maxCount) * 100}%` }} title={`${count} مشتری`}></div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default Dashboard;