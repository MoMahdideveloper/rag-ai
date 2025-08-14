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
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface CustomerFormProps {
    customer: Customer | null;
    onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'Interactions'>) => void;
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

const getInitialFormData = (customer: Customer | null): Omit<Customer, 'id' | 'createdAt' | 'Interactions'> => {
    if (customer) {
        const { id, createdAt, Interactions, ...rest } = customer;
        return rest;
    }
    return {
        name: '',
        email: '',
        phoneNumber: '',
        status: CustomerStatus.Searching,
        requirements: { ...emptyRequirement },
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
    const { token } = useAuth();
    const [formData, setFormData] = useState(getInitialFormData(customer));
    const [isLoading, setIsLoading] = useState({ parse: false, tag: false, email: false });
    const [interactions, setInteractions] = useState<Interaction[]>(customer?.Interactions || []);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailContent, setEmailContent] = useState({ subject: '', body: '' });

    useEffect(() => {
        setFormData(getInitialFormData(customer));
        setInteractions(customer?.Interactions || []);
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

    // ... other handlers ...

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer || !emailContent.subject || !emailContent.body) return;

        setIsLoading(prev => ({ ...prev, email: true }));
        try {
            const newInteraction = await api.post(`/api/customers/${customer.id}/send-email`, emailContent, token);
            setInteractions(prev => [newInteraction, ...prev]);
            setShowEmailModal(false);
            setEmailContent({ subject: '', body: '' });
        } catch (error) {
            console.error("Failed to send email", error);
            alert("Failed to send email.");
        } finally {
            setIsLoading(prev => ({ ...prev, email: false }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...customer, ...formData }); };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... form fields ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ... name, phone number ... */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2" />
                </div>
            </div>

            {/* ... other form fields ... */}

            {!isNew && customer && (
                <div className="bg-white p-8 rounded-xl shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">Interactions</h3>
                        <button type="button" onClick={() => setShowEmailModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <EnvelopeIcon className="w-5 h-5" /> Send Email
                        </button>
                    </div>

                    <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {interactions.map(interaction => (
                            <li key={interaction.id} className="flex items-start gap-4">
                                <div className="bg-slate-100 p-3 rounded-full text-slate-500"><InteractionIcon type={interaction.type} /></div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <p className="font-semibold text-slate-800">{interaction.type}</p>
                                        <p className="text-xs text-slate-500">{new Date(interaction.date).toLocaleDateString('fa-IR')}</p>
                                    </div>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{interaction.notes}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {showEmailModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                        <h2 className="text-2xl font-bold mb-4">Send Email to {customer?.name}</h2>
                        <form onSubmit={handleSendEmail} className="space-y-4">
                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium">Subject</label>
                                <input type="text" id="subject" value={emailContent.subject} onChange={e => setEmailContent(p => ({...p, subject: e.target.value}))} className="w-full p-2 border rounded-md" required />
                            </div>
                            <div>
                                <label htmlFor="body" className="block text-sm font-medium">Body</label>
                                <textarea id="body" value={emailContent.body} onChange={e => setEmailContent(p => ({...p, body: e.target.value}))} rows={8} className="w-full p-2 border rounded-md" required />
                            </div>
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setShowEmailModal(false)} className="px-4 py-2 bg-slate-200 rounded-md">Cancel</button>
                                <button type="submit" disabled={isLoading.email} className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-indigo-300">
                                    {isLoading.email ? 'Sending...' : 'Send Email'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ... submit buttons ... */}
        </form>
    );
};

export default CustomerForm;