import React, { useState, useEffect } from 'react';
import { Property, TransactionType } from '../types';
import TrashIcon from './icons/TrashIcon';
import SearchIcon from './icons/SearchIcon';

interface PropertyFormProps {
    property: Property | null;
    onSave: (property: Property) => void;
    onCancel: () => void;
    onDelete: (propertyId: number) => void;
    onFindMatches: (property: Property) => void;
    isNew: boolean;
}

const emptyProperty: Omit<Property, 'id' | 'createdAt'> = {
    title: '',
    address: '',
    transactionType: TransactionType.Sale,
    propertyType: 'آپارتمان',
    area: 0,
    bedrooms: 0,
    price: undefined,
    rahn: undefined,
    rent: undefined,
    features: [],
    description: '',
};

const PropertyForm: React.FC<PropertyFormProps> = ({ property, onSave, onCancel, onDelete, onFindMatches, isNew }) => {
    const [formData, setFormData] = useState<Property>(
        property || {
            ...emptyProperty,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        }
    );

    useEffect(() => {
        if (property) {
            setFormData(property);
        } else {
             setFormData({
                ...emptyProperty,
                id: Date.now(),
                createdAt: new Date().toISOString(),
            });
        }
    }, [property]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const numericFields = ['price', 'rahn', 'rent', 'bedrooms', 'area'];
        const parsedValue = type === 'number' ? Number(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleFeaturesChange = (value: string) => {
         const values = value.split(',').map(s => s.trim()).filter(Boolean);
         setFormData(prev => ({ ...prev, features: values }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleDelete = () => {
        if(window.confirm(`آیا از حذف ملک "${formData.title}" مطمئن هستید؟`)) {
            onDelete(formData.id);
        }
    }

    const handleFindMatchesClick = () => {
        onFindMatches(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
                 <h2 className="text-2xl font-bold">{isNew ? 'افزودن ملک جدید' : 'ویرایش اطلاعات ملک'}</h2>
                 {!isNew && (
                     <button type="button" onClick={handleFindMatchesClick} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                         <SearchIcon className="w-5 h-5"/><span>پیدا کردن مشتریان مناسب</span>
                     </button>
                 )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700">عنوان آگهی</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" required placeholder="مثال: آپارتمان ۳ خوابه در سعادت آباد"/>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700">آدرس</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" required/>
                </div>
            </div>

            <div>
                 <label htmlFor="transactionType" className="block text-sm font-medium text-slate-700">نوع معامله</label>
                 <select id="transactionType" name="transactionType" value={formData.transactionType} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2">
                    <option value={TransactionType.Sale}>فروش</option>
                    <option value={TransactionType.Rent}>رهن و اجاره</option>
                 </select>
            </div>

            {formData.transactionType === TransactionType.Sale ? (
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-700">قیمت کل (تومان)</label>
                    <input type="number" step="1000000" id="price" name="price" value={formData.price || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="rahn" className="block text-sm font-medium text-slate-700">مبلغ رهن (تومان)</label>
                        <input type="number" step="1000000" id="rahn" name="rahn" value={formData.rahn || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="rent" className="block text-sm font-medium text-slate-700">مبلغ اجاره (تومان)</label>
                        <input type="number" step="100000" id="rent" name="rent" value={formData.rent || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label htmlFor="propertyType" className="block text-sm font-medium text-slate-700">نوع ملک</label>
                    <input type="text" id="propertyType" name="propertyType" value={formData.propertyType} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" placeholder="آپارتمان، ویلایی..."/>
                </div>
                <div>
                    <label htmlFor="area" className="block text-sm font-medium text-slate-700">متراژ (متر مربع)</label>
                    <input type="number" id="area" name="area" value={formData.area} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                </div>
                <div>
                    <label htmlFor="bedrooms" className="block text-sm font-medium text-slate-700">تعداد خواب</label>
                    <input type="number" id="bedrooms" name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">توضیحات ملک</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" placeholder="جزئیات بیشتر در مورد ملک..."></textarea>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700">ویژگی‌ها (با کاما جدا کنید)</label>
                <input type="text" name="features" value={formData.features.join(', ')} onChange={e => handleFeaturesChange(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" placeholder="پارکینگ, آسانسور..."/>
            </div>

            <div className="flex justify-between items-center gap-4 pt-4">
                <div>
                {!isNew && (
                    <button type="button" onClick={handleDelete} className="flex items-center gap-2 bg-red-100 text-red-700 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-red-200">
                       <TrashIcon className="w-4 h-4" />حذف ملک
                    </button>
                )}
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">انصراف</button>
                    <button type="submit" className="bg-emerald-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-emerald-700">ذخیره</button>
                </div>
            </div>
        </form>
    );
};

export default PropertyForm;
