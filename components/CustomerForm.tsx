import React, { useState, useEffect, useCallback } from 'react';
import { Customer, CustomerStatus, Requirement, Interaction, InteractionType, TransactionType } from '../types';
import { parseCustomerNotes, generateTagsForNotes } from '../services/geminiService';
import Spinner from './common/Spinner';
import Tag from './common/Tag';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import HomeModernIcon from './icons/HomeModernIcon';
import PhoneIcon from './icons/PhoneIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import UsersIcon from './icons/UsersIcon';
import ChatBubbleLeftEllipsisIcon from './icons/ChatBubbleLeftEllipsisIcon';

interface CustomerFormProps {
    customer: Customer | null;
    onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'interactions'>) => void;
    onCancel: () => void;
    onDelete: (customerId: number) => void;
    onFindMatches: (customer: Customer) => void;
    isNew: boolean;
    apiKeys: string[];
    featureInsights: string[];
}

const emptyRequirement: Requirement = {
    transactionType: TransactionType.Sale,
    propertyType: '',
    neighborhoods: [],
    minArea: 0,
    maxArea: 0,
    bedrooms: 0,
    features: [],
    notes: '',
    tags: [],
    budget: 0,
    maxRahn: 0,
    maxRent: 0
};

const getInitialFormData = (customer: Customer | null): Omit<Customer, 'id' | 'createdAt'> => {
    if (customer) {
        const { id, createdAt, ...rest } = customer;
        return rest;
    }
    return {
        name: '',
        phoneNumber: '',
        status: CustomerStatus.Searching,
        requirements: { ...emptyRequirement },
        interactions: [],
    }
};

const InteractionIcon: React.FC<{type: InteractionType, className?: string}> = ({ type, className="w-6 h-6"}) => {
    switch (type) {
        case InteractionType.Call: return <PhoneIcon className={className} />;
        case InteractionType.Email: return <EnvelopeIcon className={className} />;
        case InteractionType.Meeting: return <UsersIcon className={className} />;
        case InteractionType.Note: return <ChatBubbleLeftEllipsisIcon className={className} />;
        default: return null;
    }
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onSave, onCancel, onDelete, onFindMatches, isNew, apiKeys, featureInsights }) => {
    const [formData, setFormData] = useState(getInitialFormData(customer));
    const [isLoading, setIsLoading] = useState({ parse: false, tag: false });
    const [newInteraction, setNewInteraction] = useState({ type: InteractionType.Note, notes: '' });

    useEffect(() => {
        setFormData(getInitialFormData(customer));
    }, [customer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['budget', 'maxRahn', 'maxRent', 'bedrooms', 'minArea', 'maxArea'];
        const parsedValue = numericFields.includes(name) ? Number(value) || 0 : value;

        if (name in formData.requirements) {
            setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, [name]: parsedValue } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: parsedValue }));
        }
    };

    const handleRequirementChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['budget', 'maxRahn', 'maxRent', 'bedrooms', 'minArea', 'maxArea'];
        const parsedValue = numericFields.includes(name) ? Number(value) || 0 : value;
        setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, [name]: parsedValue } }));
    };

    const handleTransactionTypeChange = (type: TransactionType) => {
        setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, transactionType: type }}));
    };

    const handleArrayChange = (name: 'neighborhoods' | 'features' | 'tags', value: string) => {
         const values = value.split(',').map(s => s.trim()).filter(Boolean);
         setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, [name]: values } }));
    };

    const handleParseNotes = useCallback(async () => {
        if (!formData.requirements.notes || apiKeys.length === 0) {
            if (apiKeys.length === 0) alert("لطفا ابتدا یک کلید API در بخش تنظیمات اضافه کنید.");
            return;
        }
        setIsLoading(prev => ({ ...prev, parse: true }));
        try {
            const parsedData = await parseCustomerNotes(apiKeys, formData.requirements.notes);
            setFormData(prev => ({
                ...prev,
                name: parsedData.name || prev.name,
                phoneNumber: parsedData.phoneNumber || prev.phoneNumber,
                requirements: {
                    ...prev.requirements,
                    transactionType: parsedData.requirements?.transactionType || prev.requirements.transactionType,
                    propertyType: parsedData.requirements?.propertyType || prev.requirements.propertyType,
                    neighborhoods: parsedData.requirements?.neighborhoods || prev.requirements.neighborhoods,
                    minArea: parsedData.requirements?.minArea || prev.requirements.minArea,
                    maxArea: parsedData.requirements?.maxArea || prev.requirements.maxArea,
                    bedrooms: parsedData.requirements?.bedrooms || prev.requirements.bedrooms,
                    features: parsedData.requirements?.features || prev.requirements.features,
                    budget: parsedData.requirements?.budget || prev.requirements.budget,
                    maxRahn: parsedData.requirements?.maxRahn || prev.requirements.maxRahn,
                    maxRent: parsedData.requirements?.maxRent || prev.requirements.maxRent,
                }
            }));
        } catch(e) {
            alert(`خطا در تحلیل یادداشت‌ها: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsLoading(prev => ({ ...prev, parse: false }));
        }
    }, [formData.requirements.notes, apiKeys]);

    const handleGenerateTags = useCallback(async () => {
        if (!formData.requirements.notes || apiKeys.length === 0) return;
        setIsLoading(prev => ({ ...prev, tag: true }));
        try {
            const tags = await generateTagsForNotes(apiKeys, formData.requirements.notes);
            setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, tags } }));
        } catch(e) {
             alert(`خطا در تولید برچسب‌ها: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsLoading(prev => ({ ...prev, tag: false }));
        }
    }, [formData.requirements.notes, apiKeys]);

    const handleAddInteraction = () => {
        if (!newInteraction.notes.trim()) return;
        setFormData(prev => ({ ...prev, interactions: [{ id: Date.now(), date: new Date().toISOString(), ...newInteraction }, ...prev.interactions] }));
        setNewInteraction({ type: InteractionType.Note, notes: '' });
    };

    const handleAddFeature = (feature: string) => {
        if (!formData.requirements.features.includes(feature)) {
            setFormData(prev => ({ ...prev, requirements: { ...prev.requirements, features: [...prev.requirements.features, feature] } }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...customer, ...formData }); };
    const handleDelete = () => { if(customer && window.confirm(`آیا از حذف مشتری "${formData.name}" مطمئن هستید؟`)) { onDelete(customer.id); } };
    const handleFindMatchesClick = () => { if (customer) onFindMatches(customer); };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold">{isNew ? 'افزودن مشتری جدید' : `ویرایش: ${formData.name}`}</h2>
                    {!isNew && customer && ( <button type="button" onClick={handleFindMatchesClick} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"><HomeModernIcon className="w-5 h-5"/><span>پیدا کردن املاک مناسب</span></button> )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">توضیحات مشتری (زبان طبیعی)</label>
                    <textarea name="notes" value={formData.requirements.notes} onChange={handleRequirementChange} rows={6} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" placeholder="مثال: آقای احمدی با شماره ۰۹۱۲... دنبال آپارتمان ۳ خوابه در فرمانیه برای خرید..."></textarea>
                    <button type="button" onClick={handleParseNotes} disabled={isLoading.parse || !formData.requirements.notes} className="mt-2 flex items-center gap-2 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading.parse ? <Spinner /> : <SparklesIcon className="w-4 h-4" />} تحلیل و تکمیل خودکار فرم
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">نام و نام خانوادگی</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" required />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700">شماره تماس</label>
                        <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                </div>

                {/* Transaction Type */}
                <div className="border-t pt-6">
                     <label className="block text-sm font-medium text-slate-700 mb-2">نوع معامله</label>
                     <div className="flex gap-4">
                        <button type="button" onClick={() => handleTransactionTypeChange(TransactionType.Sale)} className={`flex-1 p-3 rounded-lg text-center font-semibold border-2 ${formData.requirements.transactionType === TransactionType.Sale ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 hover:border-slate-400'}`}>خرید</button>
                        <button type="button" onClick={() => handleTransactionTypeChange(TransactionType.Rent)} className={`flex-1 p-3 rounded-lg text-center font-semibold border-2 ${formData.requirements.transactionType === TransactionType.Rent ? 'bg-green-50 border-green-500 text-green-700' : 'bg-slate-50 border-slate-200 hover:border-slate-400'}`}>رهن و اجاره</button>
                     </div>
                </div>

                {/* Financial Fields */}
                {formData.requirements.transactionType === TransactionType.Sale ? (
                    <div>
                        <label htmlFor="budget" className="block text-sm font-medium text-slate-700">بودجه خرید (تومان)</label>
                        <input type="number" step="1000000" id="budget" name="budget" value={formData.requirements.budget || ''} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="maxRahn" className="block text-sm font-medium text-slate-700">حداکثر رهن (تومان)</label>
                            <input type="number" step="1000000" id="maxRahn" name="maxRahn" value={formData.requirements.maxRahn || ''} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                        </div>
                        <div>
                            <label htmlFor="maxRent" className="block text-sm font-medium text-slate-700">حداکثر اجاره (تومان)</label>
                            <input type="number" step="100000" id="maxRent" name="maxRent" value={formData.requirements.maxRent || ''} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                        </div>
                    </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label htmlFor="propertyType" className="block text-sm font-medium text-slate-700">نوع ملک</label>
                        <input type="text" id="propertyType" name="propertyType" value={formData.requirements.propertyType} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="bedrooms" className="block text-sm font-medium text-slate-700">تعداد خواب</label>
                        <input type="number" id="bedrooms" name="bedrooms" value={formData.requirements.bedrooms || ''} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="minArea" className="block text-sm font-medium text-slate-700">حداقل متراژ (متر)</label>
                        <input type="number" id="minArea" name="minArea" value={formData.requirements.minArea || ''} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                    <div>
                        <label htmlFor="maxArea" className="block text-sm font-medium text-slate-700">حداکثر متراژ (متر)</label>
                        <input type="number" id="maxArea" name="maxArea" value={formData.requirements.maxArea || ''} onChange={handleRequirementChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">مناطق مورد نظر (با کاما جدا کنید)</label>
                    <input type="text" name="neighborhoods" value={formData.requirements.neighborhoods.join(', ')} onChange={e => handleArrayChange('neighborhoods', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">ویژگی‌های خاص (با کاما جدا کنید)</label>
                    <input type="text" name="features" value={formData.requirements.features.join(', ')} onChange={e => handleArrayChange('features', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                    {featureInsights.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2"><p className="text-sm text-slate-500 my-auto">پیشنهادها:</p>
                            {featureInsights.map(insight => ( <button type="button" key={insight} onClick={() => handleAddFeature(insight)} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm hover:bg-teal-100">+ {insight}</button>))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">برچسب‌های هوشمند</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 mt-1 flex flex-wrap gap-2 p-2 border border-slate-300 rounded-md bg-slate-50 min-h-[42px]">
                            {formData.requirements.tags.length > 0 ? formData.requirements.tags.map((tag, index) => <Tag key={index} text={tag} />) : <span className="text-slate-400 text-sm p-1">برچسبی تولید نشده است.</span>}
                        </div>
                        <button type="button" onClick={handleGenerateTags} disabled={isLoading.tag || !formData.requirements.notes} className="flex items-center gap-2 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading.tag ? <Spinner /> : <SparklesIcon className="w-4 h-4" />} تولید برچسب
                        </button>
                    </div>
                </div>
            </div>

            {!isNew && customer && (
                <div className="bg-white p-8 rounded-xl shadow-sm space-y-6">
                    <h3 className="text-xl font-bold">تاریخچه فعالیت و یادداشت‌ها</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-4 mb-2">
                             <label className="text-sm font-medium text-slate-700">نوع فعالیت:</label>
                             <div className="flex items-center gap-3">
                                {Object.values(InteractionType).map(type => (<button key={type} type="button" onClick={() => setNewInteraction(prev => ({...prev, type}))} className={`p-2 rounded-full transition-colors ${newInteraction.type === type ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`} title={type}><InteractionIcon type={type} className="w-5 h-5"/></button>))}
                             </div>
                        </div>
                        <textarea value={newInteraction.notes} onChange={(e) => setNewInteraction(prev => ({...prev, notes: e.target.value}))} rows={3} className="w-full rounded-md border-slate-300 shadow-sm p-2" placeholder={`یادداشتی درباره این ${newInteraction.type} بنویسید...`} />
                        <button type="button" onClick={handleAddInteraction} disabled={!newInteraction.notes.trim()} className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:bg-indigo-300">ثبت فعالیت</button>
                    </div>
                    <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {formData.interactions.map(interaction => (
                            <li key={interaction.id} className="flex items-start gap-4">
                                <div className="bg-slate-100 p-3 rounded-full text-slate-500"><InteractionIcon type={interaction.type} /></div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <p className="font-semibold text-slate-800">{interaction.type}</p>
                                        <p className="text-xs text-slate-500">{new Date(interaction.date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric'})}</p>
                                    </div>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{interaction.notes}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-between items-center gap-4 pt-4 sticky bottom-0 bg-slate-100 py-4 z-10">
                <div>
                {!isNew && (<button type="button" onClick={handleDelete} className="flex items-center gap-2 bg-red-100 text-red-700 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-red-200"><TrashIcon className="w-4 h-4" />حذف مشتری</button>)}
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">{isNew ? 'انصراف' : 'بازگشت'}</button>
                    <button type="submit" className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700">ذخیره تغییرات</button>
                </div>
            </div>
        </form>
    );
};

export default CustomerForm;