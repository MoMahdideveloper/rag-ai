
import React, { useState, useMemo } from 'react';
import { Task, Customer, TaskPriority } from '../types';
import FlagIcon from './icons/FlagIcon';
import TrashIcon from './icons/TrashIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface TaskManagerProps {
    tasks: Task[];
    customers: Customer[];
    onSaveTask: (task: Task) => void;
    onDeleteTask: (taskId: number) => void;
    onToggleTask: (taskId: number) => void;
    onSelectCustomer: (customerId: number) => void;
}

const emptyTask: Omit<Task, 'id' | 'createdAt'> = {
    title: '',
    dueDate: '',
    priority: TaskPriority.Medium,
    isCompleted: false,
    customerId: undefined,
};

const priorityConfig: { [key in TaskPriority]: { color: string, label: string } } = {
    [TaskPriority.High]: { color: 'text-red-500', label: 'بالا' },
    [TaskPriority.Medium]: { color: 'text-yellow-500', label: 'متوسط' },
    [TaskPriority.Low]: { color: 'text-gray-500', label: 'پایین' },
};


const TaskManager: React.FC<TaskManagerProps> = ({ tasks, customers, onSaveTask, onDeleteTask, onToggleTask, onSelectCustomer }) => {
    const [formData, setFormData] = useState(emptyTask);
    const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('todo');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'customerId' ? (value ? Number(value) : undefined) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.dueDate) {
            alert('لطفاً عنوان و تاریخ سررسید را وارد کنید.');
            return;
        }
        onSaveTask({
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...formData,
        });
        setFormData(emptyTask); // Reset form
    };

    const filteredTasks = useMemo(() => {
        const sorted = [...tasks].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        if (filter === 'todo') return sorted.filter(t => !t.isCompleted);
        if (filter === 'done') return sorted.filter(t => t.isCompleted);
        return sorted;
    }, [tasks, filter]);

    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold text-slate-800">مدیریت وظایف</h1>

            {/* Add Task Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-semibold mb-4">افزودن وظیفه جدید</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">عنوان وظیفه</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" required placeholder="مثال: پیگیری مشتری محمدی" />
                    </div>
                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">تاریخ سررسید</label>
                        <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" required />
                    </div>
                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-slate-700">اولویت</label>
                        <select name="priority" id="priority" value={formData.priority} onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2">
                            {Object.entries(priorityConfig).map(([key, {label}]) => (
                               <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit"
                        className="bg-indigo-600 text-white py-2 px-4 rounded-md shadow-sm hover:bg-indigo-700 h-10">
                        افزودن
                    </button>
                    <div className="md:col-span-2">
                         <label htmlFor="customerId" className="block text-sm font-medium text-slate-700">مشتری مرتبط (اختیاری)</label>
                         <select name="customerId" id="customerId" value={formData.customerId || ''} onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2">
                            <option value="">هیچکدام</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </form>
            </div>

            {/* Task List */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">لیست وظایف</h2>
                    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-md ${filter === 'all' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>همه</button>
                        <button onClick={() => setFilter('todo')} className={`px-3 py-1 text-sm font-medium rounded-md ${filter === 'todo' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>برای انجام</button>
                        <button onClick={() => setFilter('done')} className={`px-3 py-1 text-sm font-medium rounded-md ${filter === 'done' ? 'bg-white shadow-sm' : 'text-slate-600'}`}>انجام شده</button>
                    </div>
                 </div>

                 <ul className="space-y-3">
                    {filteredTasks.length > 0 ? filteredTasks.map(task => {
                        const customer = customers.find(c => c.id === task.customerId);
                        const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
                        return (
                            <li key={task.id} className={`p-3 rounded-lg flex items-center gap-4 transition-colors ${task.isCompleted ? 'bg-slate-100 text-slate-500' : 'bg-white border'}`}>
                                <button onClick={() => onToggleTask(task.id)} className={`transition-colors ${task.isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}>
                                    <CheckCircleIcon className="w-7 h-7" />
                                </button>
                                <div className="flex-1">
                                    <p className={`font-medium ${task.isCompleted ? 'line-through' : 'text-slate-800'}`}>{task.title}</p>
                                    {customer && <button onClick={() => onSelectCustomer(customer.id)} className="text-sm text-indigo-600 font-medium hover:underline">{customer.name}</button>}
                                </div>
                                <div className="text-sm font-medium whitespace-nowrap" >
                                    <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                    {new Date(task.dueDate).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-1.5 p-1 rounded-md text-sm ${priorityConfig[task.priority].color}`} title={`اولویت: ${priorityConfig[task.priority].label}`}>
                                    <FlagIcon className="w-5 h-5" />
                                    <span>{priorityConfig[task.priority].label}</span>
                                </div>
                                <button onClick={() => onDeleteTask(task.id)} className="text-slate-400 hover:text-red-600 p-1" title="حذف وظیفه">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </li>
                        )
                    }) : <p className="text-center text-slate-500 py-8">هیچ وظیفه‌ای در این دسته‌بندی وجود ندارد.</p>}
                 </ul>
            </div>
        </div>
    );
};

export default TaskManager;