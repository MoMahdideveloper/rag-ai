import React, { useState, useCallback, useEffect } from 'react';
import { Customer, CustomerStatus, MatchResult, Property, PropertyMatchResult, Task, InteractionType, Interaction, TaskPriority, ChatMessage, TransactionType, Requirement } from './types';
import { findMatchingCustomers, findMatchingProperties, getAiCopilotResponse, getFeatureInsights, sanitizePropertyData, sanitizeCustomerData } from './services/geminiService';
import CustomerList from './components/CustomerList';
import CustomerForm from './components/CustomerForm';
import Dashboard from './components/Dashboard';
import SearchResults from './components/SearchResults';
import PropertyList from './components/PropertyList';
import PropertyForm from './components/PropertyForm';
import PropertyMatchResults from './components/PropertyMatchResults';
import TaskManager from './components/TaskManager';
import ListBulletIcon from './components/icons/ListBulletIcon';
import CalendarDaysIcon from './components/icons/CalendarDaysIcon';
import CalendarView from './components/CalendarView';
import BrainIcon from './components/icons/BrainIcon';
import AiCopilot from './components/AiCopilot';
import CogIcon from './components/icons/CogIcon';
import Settings from './components/Settings';
import LogoutIcon from './components/icons/LogoutIcon';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import { api } from './services/api';

const API_KEYS_STORAGE_KEY = 'smart-crm-api-keys-v1';

const emptyCustomerReq: Requirement = { transactionType: TransactionType.Sale, propertyType: '', neighborhoods: [], minArea: 0, maxArea: 0, bedrooms: 0, features: [], notes: '', tags: [] };
const emptyPropertyData: Omit<Property, 'id' | 'createdAt'> = { title: '', address: '', transactionType: TransactionType.Sale, propertyType: '', area: 0, bedrooms: 0, features: [], description: ''};


const App: React.FC = () => {
    const { token, login, logout, isAuthenticated } = useAuth();
    const [showRegister, setShowRegister] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [apiKeys, setApiKeys] = useState<string[]>(() => JSON.parse(window.localStorage.getItem(API_KEYS_STORAGE_KEY) || 'null') || []);

    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [view, setView] = useState<'dashboard' | 'customer_form' | 'property_form' | 'search_results' | 'property_match_results' | 'task_manager' | 'calendar' | 'ai_copilot' | 'settings'>('dashboard');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<MatchResult[]>([]);
    const [propertyMatchResults, setPropertyMatchResults] = useState<PropertyMatchResult[]>([]);
    const [searchFallbackUsed, setSearchFallbackUsed] = useState(false);
    const [isCopilotLoading, setIsCopilotLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: 'model', content: 'سلام! من «هوشمند»، دستیار CRM شما هستم. چطور می‌توانم امروز به شما کمک کنم؟' }]);
    const [aiConfig, setAiConfig] = useState({
        featureInsightPromptTemplate: `You are a senior real estate data analyst. Your job is to analyze the requirements and notes from a list of clients to find emerging trends and popular features that are NOT already in the provided list of known features. Look at all the client notes and feature lists provided below. Identify 3-5 of the most common or important features that clients are asking for which ARE NOT in the list below. Focus on specific, actionable features (e.g., "تراس قابل چیدمان", "نورگیر از جنوب", "محیط دنج و آرام", "دسترسی به مترو"). Do not include generic terms like "قیمت مناسب". Respond ONLY with a single, valid JSON array of strings, with each string being a suggested feature in Persian. If no new features are found, return an empty array. Known features to ignore: {keywords}`,
        learnedKeywords: ["پارکینگ", "آسانسور", "بالکن", "انباری", "نوساز", "دسترسی به مترو", "ویو خوب", "استخر"]
    });
    const [featureInsights, setFeatureInsights] = useState<string[]>([]);

    useEffect(() => {
        const initializeApp = async () => {
            if (!isAuthenticated) return;
            try {
                const [customersData, propertiesData, tasksData] = await Promise.all([
                    api.get('/api/customers', token),
                    api.get('/api/properties', token),
                    api.get('/api/tasks', token),
                ]);

                setCustomers(customersData);
                setProperties(propertiesData);
                setTasks(tasksData);

            } catch (error) {
                console.error("Failed to initialize the application:", error);
                logout();
            }
        };

        initializeApp();
    }, [isAuthenticated, token]);

    const handleLogout = () => {
        logout();
        setCustomers([]);
        setProperties([]);
        setTasks([]);
        setView('dashboard');
    };

    if (!isAuthenticated) {
        return showRegister ? (
            <Register onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
            <Login onLogin={login} onSwitchToRegister={() => setShowRegister(true)} />
        );
    }

    useEffect(() => { window.localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys)); }, [apiKeys]);

    useEffect(() => {
        const fetchInsights = async () => {
            if (customers.length > 1 && apiKeys.length > 0) {
                const newInsights = await getFeatureInsights(apiKeys, customers, aiConfig.featureInsightPromptTemplate, aiConfig.learnedKeywords);
                if (newInsights && newInsights.length > 0) {
                    setFeatureInsights(newInsights);
                    const uniqueNewKeywords = newInsights.filter(insight => !aiConfig.learnedKeywords.includes(insight));
                    if (uniqueNewKeywords.length > 0) {
                        setAiConfig(prev => ({ ...prev, learnedKeywords: [...new Set([...prev.learnedKeywords, ...uniqueNewKeywords])] }));
                    }
                } else {
                   setFeatureInsights([]);
                }
            }
        };
        const timer = setTimeout(fetchInsights, 1500);
        return () => clearTimeout(timer);
    }, [customers, apiKeys, aiConfig.featureInsightPromptTemplate, aiConfig.learnedKeywords]);

    const handleBackToDashboard = () => {
        setSelectedCustomerId(null);
        setSelectedPropertyId(null);
        setView('dashboard');
    };

    // Customer Handlers
    const handleSelectCustomer = (id: number) => { setSelectedCustomerId(id); setSelectedPropertyId(null); setView('customer_form'); };
    const handleAddCustomerClick = () => { setSelectedCustomerId(null); setSelectedPropertyId(null); setView('customer_form'); };
    const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
        try {
            const savedCustomer = customerData.id
                ? await api.put(`/api/customers/${customerData.id}`, customerData, token)
                : await api.post('/api/customers', customerData, token);

            setCustomers(prev =>
                customerData.id ? prev.map(c => c.id === savedCustomer.id ? savedCustomer : c) : [...prev, savedCustomer]
            );
            setView('customer_form');
            setSelectedCustomerId(savedCustomer.id);
        } catch (error) {
            console.error("Failed to save customer:", error);
        }
    };
    const handleDeleteCustomer = async (customerId: number) => {
        try {
            await api.delete(`/api/customers/${customerId}`, token);
            setCustomers(prev => prev.filter(c => c.id !== customerId));
            handleBackToDashboard();
        } catch (error) {
            console.error("Failed to delete customer:", error);
        }
    };

    // Property Handlers
    const handleSelectProperty = (id: number) => { setSelectedPropertyId(id); setSelectedCustomerId(null); setView('property_form'); };
    const handleAddPropertyClick = () => { setSelectedPropertyId(null); setSelectedCustomerId(null); setView('property_form'); };
    const handleSaveProperty = async (propertyData: Omit<Property, 'id' | 'createdAt'>) => {
        try {
            const savedProperty = propertyData.id
                ? await api.put(`/api/properties/${propertyData.id}`, propertyData, token)
                : await api.post('/api/properties', propertyData, token);

            setProperties(prev =>
                propertyData.id ? prev.map(p => p.id === savedProperty.id ? savedProperty : p) : [...prev, savedProperty]
            );
            setView('property_form');
            setSelectedPropertyId(savedProperty.id);
        } catch (error) {
            console.error("Failed to save property:", error);
        }
    };
    const handleDeleteProperty = async (propertyId: number) => {
        try {
            await api.delete(`/api/properties/${propertyId}`, token);
            setProperties(prev => prev.filter(p => p.id !== propertyId));
            handleBackToDashboard();
        } catch (error) {
            console.error("Failed to delete property:", error);
        }
    };

    // Task & Calendar Handlers
    const handleViewTasks = () => setView('task_manager');
    const handleViewCalendar = () => setView('calendar');
    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
        try {
            const savedTask = taskData.id
                ? await api.put(`/api/tasks/${taskData.id}`, taskData, token)
                : await api.post('/api/tasks', taskData, token);

            setTasks(prev =>
                taskData.id ? prev.map(t => t.id === savedTask.id ? savedTask : t) : [...prev, savedTask]
            );
        } catch (error) {
            console.error("Failed to save task:", error);
        }
    };
    const handleDeleteTask = async (taskId: number) => {
        try {
            await api.delete(`/api/tasks/${taskId}`, token);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };
    const handleToggleTask = async (taskId: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = { ...task, isCompleted: !task.isCompleted };
        try {
            const savedTask = await api.put(`/api/tasks/${taskId}`, updatedTask, token);
            setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
        } catch (error) {
            console.error("Failed to toggle task:", error);
        }
    };

    // AI Copilot Handler, etc. (rest of the functions remain largely the same)
    const handleSendMessageToCopilot = useCallback(async (message: string) => {
        if (!message.trim()) return;
        if (apiKeys.length === 0) {
            setChatMessages(prev => [...prev, { role: 'model', content: 'برای استفاده از دستیار هوشمند، لطفاً ابتدا یک یا چند کلید API Gemini را در بخش تنظیمات اضافه کنید.' }]);
            return;
        }
        const newUserMessage: ChatMessage = { role: 'user', content: message };
        setChatMessages(prev => [...prev, newUserMessage]);
        setIsCopilotLoading(true);
        try {
            const responseText = await getAiCopilotResponse(apiKeys, [...chatMessages, newUserMessage], message, token);
            setChatMessages(prev => [...prev, { role: 'model', content: responseText }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', content: `متاسفانه خطایی رخ داد: ${error}` }]);
        } finally {
            setIsCopilotLoading(false);
        }
    }, [chatMessages, apiKeys, token]);

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;
    const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;

    const renderMainContent = () => {
        switch (view) {
            case 'customer_form': return <CustomerForm customer={selectedCustomer} onSave={handleSaveCustomer} onCancel={handleBackToDashboard} onDelete={handleDeleteCustomer} onFindMatches={() => {}} isNew={!selectedCustomer} apiKeys={apiKeys} featureInsights={featureInsights} />;
            case 'property_form': return <PropertyForm property={selectedProperty} onSave={handleSaveProperty} onCancel={handleBackToDashboard} onDelete={handleDeleteProperty} onFindMatches={() => {}} isNew={!selectedProperty} />;
            case 'search_results': return <SearchResults results={searchResults} customers={customers} isLoading={isSearching} onBack={handleBackToDashboard} onSelectCustomer={handleSelectCustomer} isFallback={searchFallbackUsed} />;
            case 'property_match_results': return <PropertyMatchResults results={propertyMatchResults} properties={properties} isLoading={isSearching} onBack={handleBackToDashboard} onSelectProperty={handleSelectProperty} isFallback={searchFallbackUsed} />;
            case 'task_manager': return <TaskManager tasks={tasks} customers={customers} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onToggleTask={handleToggleTask} onSelectCustomer={handleSelectCustomer} />;
            case 'calendar': return <CalendarView tasks={tasks} customers={customers} onSaveTask={handleSaveTask} onSelectCustomer={handleSelectCustomer} />;
            case 'ai_copilot': return <AiCopilot messages={chatMessages} isLoading={isCopilotLoading} onSendMessage={handleSendMessageToCopilot} />;
            case 'settings': return <Settings apiKeys={apiKeys} onSave={setApiKeys} onExport={() => {}} />;
            case 'dashboard': default: return <Dashboard customers={customers} properties={properties} tasks={tasks} onAddCustomer={handleAddCustomerClick} onAddProperty={handleAddPropertyClick} onViewTasks={handleViewTasks} onViewCalendar={handleViewCalendar} onSelectCustomer={handleSelectCustomer} onToggleTask={handleToggleTask} />;
        }
    };

    return (
        <div className="bg-slate-100 min-h-screen text-slate-800 flex" style={{ direction: 'rtl' }}>
            <aside className="w-1/3 max-w-sm bg-white border-l border-slate-200 p-6 flex flex-col">
                 <div className="shrink-0">
                    <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer" onClick={handleBackToDashboard}>هوشمند اِملاک</h1>
                    <p className="text-sm text-slate-500 mt-1">CRM هوشمند املاک شما</p>
                 </div>
                <nav className="mt-6 flex flex-col gap-2">
                    <button onClick={() => setView('ai_copilot')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${view === 'ai_copilot' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><BrainIcon className="w-6 h-6" /><span>دستیار هوشمند</span></button>
                    <button onClick={handleViewTasks} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${view === 'task_manager' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><ListBulletIcon className="w-6 h-6" /><span>مدیریت وظایف</span></button>
                    <button onClick={handleViewCalendar} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${view === 'calendar' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><CalendarDaysIcon className="w-6 h-6" /><span>تقویم</span></button>
                    <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${view === 'settings' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><CogIcon className="w-6 h-6" /><span>تنظیمات</span></button>
                    <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors text-slate-600 hover:bg-slate-100`}><LogoutIcon className="w-6 h-6" /><span>خروج</span></button>
                </nav>
                <div className="flex-1 flex flex-col space-y-6 mt-6 -mr-2 -ml-2 pr-2 pl-2 overflow-y-auto border-t border-slate-200 pt-6">
                    <CustomerList customers={customers} onAddCustomer={handleAddCustomerClick} onSelectCustomer={handleSelectCustomer} selectedCustomerId={view === 'customer_form' ? selectedCustomerId : null} onGeminiImport={() => {}} onRawImport={() => {}} />
                    <PropertyList properties={properties} onAddProperty={handleAddPropertyClick} onSelectProperty={handleSelectProperty} selectedPropertyId={view === 'property_form' ? selectedPropertyId : null} onGeminiImport={() => {}} onRawImport={() => {}} />
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto h-screen max-h-screen">
                {renderMainContent()}
            </main>
        </div>
    );
};

export default App;