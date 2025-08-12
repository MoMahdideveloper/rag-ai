import React from 'react';
import { Customer, CustomerStatus, TransactionType } from '../types';
import UserPlusIcon from './icons/UserPlusIcon';

interface CustomerListProps {
    customers: Customer[];
    onAddCustomer: () => void;
    onSelectCustomer: (id: number) => void;
    selectedCustomerId: number | null;
    onGeminiImport: () => void;
    onRawImport: () => void;
}

const statusColorMap: { [key in CustomerStatus]: string } = {
    [CustomerStatus.Active]: 'bg-blue-500',
    [CustomerStatus.Searching]: 'bg-yellow-500',
    [CustomerStatus.Contracted]: 'bg-green-500',
    [CustomerStatus.Cancelled]: 'bg-slate-400',
};

const transactionColorMap: { [key in TransactionType]: string } = {
    [TransactionType.Sale]: 'text-blue-700 bg-blue-100',
    [TransactionType.Rent]: 'text-green-700 bg-green-100',
};

const CustomerList: React.FC<CustomerListProps> = ({ customers, onAddCustomer, onSelectCustomer, selectedCustomerId, onGeminiImport, onRawImport }) => {
    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">مشتریان</h2>
                 <div className="flex items-center gap-2">
                    <button onClick={onGeminiImport} className="text-sm font-medium text-indigo-600 hover:underline" title="وارد کردن فایل JSON مشتریان و تحلیل با Gemini">واردات هوشمند</button>
                    <button onClick={onRawImport} className="text-sm font-medium text-slate-500 hover:underline" title="وارد کردن فایل JSON مشتریان خام">واردات خام</button>
                    <button onClick={onAddCustomer} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium" aria-label="افزودن مشتری جدید">
                        <UserPlusIcon className="w-5 h-5" />
                        <span>افزودن</span>
                    </button>
                 </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg overflow-y-auto p-2">
                {customers.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                        <p>هنوز مشتری ثبت نشده است.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {customers.map(customer => (
                            <li key={customer.id}>
                                <button
                                    onClick={() => onSelectCustomer(customer.id)}
                                    className={`w-full text-right p-3 rounded-md transition-colors flex items-center gap-3 ${
                                        selectedCustomerId === customer.id
                                            ? 'bg-indigo-100 text-indigo-800 font-semibold'
                                            : 'hover:bg-slate-200'
                                    }`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${statusColorMap[customer.status]}`} title={`وضعیت: ${customer.status}`}></span>
                                    <div className="flex-1">
                                        <p className="font-medium">{customer.name}</p>
                                        <p className={`text-sm ${selectedCustomerId === customer.id ? 'text-indigo-700' : 'text-slate-600'}`}>{customer.phoneNumber}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${transactionColorMap[customer.requirements.transactionType]}`}>
                                        {customer.requirements.transactionType === TransactionType.Sale ? 'فروشی' : 'اجاره'}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CustomerList;