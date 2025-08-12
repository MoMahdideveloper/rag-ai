import React from 'react';
import { Property, TransactionType } from '../types';
import BuildingLibraryIcon from './icons/BuildingLibraryIcon';

interface PropertyListProps {
    properties: Property[];
    onAddProperty: () => void;
    onSelectProperty: (id: number) => void;
    selectedPropertyId: number | null;
    onGeminiImport: () => void;
    onRawImport: () => void;
}

const transactionColorMap: { [key in TransactionType]: string } = {
    [TransactionType.Sale]: 'text-blue-700 bg-blue-100',
    [TransactionType.Rent]: 'text-green-700 bg-green-100',
};

const PropertyList: React.FC<PropertyListProps> = ({ properties, onAddProperty, onSelectProperty, selectedPropertyId, onGeminiImport, onRawImport }) => {
    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">املاک</h2>
                <div className="flex items-center gap-2">
                    <button onClick={onGeminiImport} className="text-sm font-medium text-indigo-600 hover:underline" title="وارد کردن فایل JSON املاک و تحلیل با Gemini">واردات هوشمند</button>
                    <button onClick={onRawImport} className="text-sm font-medium text-slate-500 hover:underline" title="وارد کردن فایل JSON املاک خام">واردات خام</button>
                    <button onClick={onAddProperty} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium" aria-label="افزودن ملک جدید">
                        <BuildingLibraryIcon className="w-5 h-5" />
                        <span>افزودن</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg overflow-y-auto p-2">
                {properties.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                        <p>هنوز ملکی ثبت نشده است.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {properties.map(property => (
                            <li key={property.id}>
                                <button
                                    onClick={() => onSelectProperty(property.id)}
                                    className={`w-full text-right p-3 rounded-md transition-colors flex items-center gap-3 ${
                                        selectedPropertyId === property.id
                                            ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                            : 'hover:bg-slate-200'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{property.title}</p>
                                        <p className={`text-sm ${selectedPropertyId === property.id ? 'text-emerald-700' : 'text-slate-600'}`}>{property.address}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${transactionColorMap[property.transactionType]}`}>
                                        {property.transactionType === TransactionType.Sale ? 'فروشی' : 'اجاره‌ای'}
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

export default PropertyList;