
import React, { useState, useMemo } from 'react';
import { Task, Customer, TaskPriority } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface CalendarViewProps {
    tasks: Task[];
    customers: Customer[];
    onSaveTask: (task: Task) => void;
    onSelectCustomer: (customerId: number) => void;
}

const priorityConfig: { [key in TaskPriority]: { bg: string, text: string, border: string, label: string } } = {
    [TaskPriority.High]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', label: 'بالا' },
    [TaskPriority.Medium]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500', label: 'متوسط' },
    [TaskPriority.Low]: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500', label: 'پایین' },
};

const emptyTask: Omit<Task, 'id' | 'createdAt' | 'dueDate' > = {
    title: '',
    priority: TaskPriority.Medium,
    isCompleted: false,
    customerId: undefined,
};

const AddTaskModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSave: (task: Task) => void,
    date: string,
    customers: Customer[],
}> = ({ isOpen, onClose, onSave, date, customers }) => {
    const [formData, setFormData] = useState(emptyTask);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return;
        onSave({
            id: Date.now(),
            createdAt: new Date().toISOString(),
            dueDate: date,
            ...formData,
        });
        setFormData(emptyTask);
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'customerId' ? (value ? Number(value) : undefined) : value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">افزودن وظیفه برای {new Date(date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">عنوان وظیفه</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" required />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">اولویت</label>
                            <select name="priority" id="priority" value={formData.priority} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2">
                                {Object.entries(priorityConfig).map(([key, {label}]) => (
                                   <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                             <label htmlFor="customerId" className="block text-sm font-medium text-slate-700">مشتری مرتبط</label>
                             <select name="customerId" id="customerId" value={formData.customerId || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2">
                                <option value="">هیچکدام</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">انصراف</button>
                        <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700">ذخیره</button>
                     </div>
                </form>
            </div>
        </div>
    )
}


const CalendarView: React.FC<CalendarViewProps> = ({ tasks, customers, onSaveTask, onSelectCustomer }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modalInfo, setModalInfo] = useState({ isOpen: false, date: '' });

    const tasksByDate = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            const dateKey = task.dueDate;
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)?.push(task);
        });
        return map;
    }, [tasks]);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const handleAddTask = (date: string) => {
       setModalInfo({ isOpen: true, date });
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const shamsiFirstDayOffset = (firstDayOfMonth + 1) % 7; // Sat=0, Sun=1, ...

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0,0,0,0);

    const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
            <AddTaskModal
                isOpen={modalInfo.isOpen}
                onClose={() => setModalInfo({isOpen: false, date: ''})}
                onSave={onSaveTask}
                date={modalInfo.date}
                customers={customers}
            />

            <header className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100">
                    <ChevronRightIcon className="w-6 h-6 text-slate-500" />
                </button>
                <h2 className="text-xl font-bold text-slate-800">
                    {currentDate.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100">
                    <ChevronLeftIcon className="w-6 h-6 text-slate-500" />
                </button>
            </header>

            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-slate-600 border-b pb-2 mb-2">
                {weekDays.map(day => <div key={day}>{day}</div>)}
            </div>

            <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1">
                {Array.from({ length: shamsiFirstDayOffset }).map((_, index) => (
                    <div key={`empty-start-${index}`} className="border rounded-lg border-slate-100"></div>
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const thisDate = new Date(year, month, day);
                    const dateKey = thisDate.toISOString().split('T')[0];
                    const dayTasks = tasksByDate.get(dateKey) || [];
                    const isToday = today.getTime() === thisDate.getTime();

                    return (
                        <div key={day} className="border rounded-lg border-slate-200 bg-slate-50 p-2 flex flex-col relative">
                            <div className="flex justify-between items-center">
                                <span className={`text-sm font-bold ${isToday ? 'bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-slate-600'}`}>{thisDate.toLocaleDateString('fa-IR', { day: 'numeric'})}</span>
                                <button onClick={() => handleAddTask(dateKey)} className="text-indigo-400 hover:text-indigo-600 text-xl font-light rounded-full w-6 h-6 flex items-center justify-center hover:bg-indigo-100 transition-colors" title="افزودن وظیفه جدید">+</button>
                            </div>
                            <ul className="mt-2 space-y-1 overflow-y-auto flex-1">
                                {dayTasks.map(task => {
                                    const priority = priorityConfig[task.priority];
                                    return (
                                        <li key={task.id}>
                                            <button
                                                onClick={() => task.customerId && onSelectCustomer(task.customerId)}
                                                className={`w-full text-right text-xs font-medium p-1.5 rounded-md ${priority.bg} ${priority.text} border-r-4 ${priority.border} ${task.isCompleted ? 'opacity-50 line-through' : ''} ${task.customerId ? 'cursor-pointer' : 'cursor-default'}`}
                                                title={task.title}
                                            >
                                                {task.title}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;