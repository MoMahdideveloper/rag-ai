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
import { initDB, addDocument, customerToDocument, propertyToDocument, deleteDocument } from './services/ragService';

const initialCustomers: Customer[] = [
    {
        id: 1, name: 'سارا و علی محمدی', phoneNumber: '09121234567', status: CustomerStatus.Searching, createdAt: '2023-10-01T10:00:00Z',
        requirements: {
            transactionType: TransactionType.Sale, propertyType: 'آپارتمان', neighborhoods: ['پونک', 'جنت‌آباد'], minArea: 80, maxArea: 100, bedrooms: 2, budget: 5000000000,
            features: ['نورگیر', 'دسترسی به مترو'], notes: "زوج جوان، به دنبال اولین خانه. آپارتمان دو خوابه در پونک یا جنت‌آباد. محیط آرام و دسترسی به مترو مهم است. بودجه حداکثر ۵ میلیارد.",
            tags: ["زوج جوان", "خونه اولی", "محیط آرام"],
        },
        interactions: [ { id: 1, type: InteractionType.Call, date: '2023-10-01T10:00:00Z', notes: 'تماس اولیه جهت آشنایی.' } ],
    },
    {
        id: 6, name: 'مریم حسینی', phoneNumber: '09129876543', status: CustomerStatus.Active, createdAt: '2023-10-10T11:00:00Z',
        requirements: {
            transactionType: TransactionType.Rent, propertyType: 'آپارتمان', neighborhoods: ['مرزداران', 'ستارخان'], minArea: 70, maxArea: 90, bedrooms: 2, maxRahn: 500000000, maxRent: 15000000,
            features: ['آسانسور', 'پارکینگ'], notes: "به دنبال یک واحد آپارتمان برای رهن و اجاره در منطقه مرزداران. دو خوابه با پارکینگ و آسانسور ضروری است. حداکثر رهن ۵۰۰ میلیون و اجاره ۱۵ میلیون.",
            tags: ["اجاره", "کارمند", "دسترسی خوب"],
        },
        interactions: [],
    },
];

const initialProperties: Property[] = [
    {
        id: 101, title: "پنت‌هاوس رویایی با ویو ۳۶۰ درجه در جردن", address: "جردن، برج آفتاب، طبقه ۲۰", transactionType: TransactionType.Sale,
        propertyType: "پنت‌هاوس", area: 350, bedrooms: 4, price: 85000000000, features: ["استخر خصوصی", "سونا", "ویو ابدی", "لابی مجلل"],
        description: "واحد پنت‌هاوس بی‌نظیر مناسب برای افراد خاص.", createdAt: '2023-09-25T10:00:00Z',
    },
    {
        id: 106, title: "۸۰ متر خوش‌نقشه اجاره‌ای در ستارخان", address: "ستارخان، خیابان شادمان", transactionType: TransactionType.Rent,
        propertyType: "آپارتمان", area: 80, bedrooms: 2, rahn: 450000000, rent: 12000000, features: ["آسانسور", "پارکینگ", "انباری", "نورگیر"],
        description: "واحدی تمیز و بازسازی شده در محله‌ای آرام با دسترسی عالی. مناسب برای زوج‌ها یا خانواده‌های کوچک.", createdAt: '2023-10-08T18:00:00Z',
    },
];

const initialTasks: Task[] = [
    { id: 201, title: "تماس با خانواده رضایی جهت معرفی پنت‌هاوس جردن", dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], priority: TaskPriority.High, isCompleted: false, customerId: 2, createdAt: new Date().toISOString() },
    { id: 202, title: "پیگیری اجاره خانم حسینی", dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], priority: TaskPriority.Medium, isCompleted: false, customerId: 6, createdAt: new Date().toISOString() },
];

const CUSTOMER_STORAGE_KEY = 'smart-crm-customers-v3';
const PROPERTY_STORAGE_KEY = 'smart-crm-properties-v3';
const TASK_STORAGE_KEY = 'smart-crm-tasks-v3';
const API_KEYS_STORAGE_KEY = 'smart-crm-api-keys-v1';

const emptyCustomerReq: Requirement = { transactionType: TransactionType.Sale, propertyType: '', neighborhoods: [], minArea: 0, maxArea: 0, bedrooms: 0, features: [], notes: '', tags: [] };
const emptyPropertyData: Omit<Property, 'id' | 'createdAt'> = { title: '', address: '', transactionType: TransactionType.Sale, propertyType: '', area: 0, bedrooms: 0, features: [], description: ''};


const App: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>(() => JSON.parse(window.localStorage.getItem(CUSTOMER_STORAGE_KEY) || 'null') || initialCustomers);
    const [properties, setProperties] = useState<Property[]>(() => JSON.parse(window.localStorage.getItem(PROPERTY_STORAGE_KEY) || 'null') || initialProperties);
    const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(window.localStorage.getItem(TASK_STORAGE_KEY) || 'null') || initialTasks);
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
    const [isRagInitialized, setIsRagInitialized] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            await initDB();
            setIsRagInitialized(true);
        };
        initialize();
    }, []);

    useEffect(() => {
        if (isRagInitialized) {
            const indexData = async () => {
                console.log('Indexing existing data...');
                for (const customer of customers) {
                    await addDocument(customerToDocument(customer));
                }
                for (const property of properties) {
                    await addDocument(propertyToDocument(property));
                }
                console.log('Finished indexing existing data.');
            };
            indexData();
        }
    }, [isRagInitialized]);

    useEffect(() => { window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers)); }, [customers]);
    useEffect(() => { window.localStorage.setItem(PROPERTY_STORAGE_KEY, JSON.stringify(properties)); }, [properties]);
    useEffect(() => { window.localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks)); }, [tasks]);
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
    const handleSaveCustomer = (customerData: Customer) => {
        setCustomers(prev => {
            const existingIndex = prev.findIndex(c => c.id === customerData.id);
            const newCustomers = existingIndex > -1 ? Object.assign([], prev, {[existingIndex]: customerData}) : [...prev, customerData];
            if (isRagInitialized) addDocument(customerToDocument(customerData));
            return newCustomers;
        });
        setView('customer_form');
    };
    const handleDeleteCustomer = (customerId: number) => {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        if (isRagInitialized) deleteDocument(`customer-${customerId}`);
        handleBackToDashboard();
    };

    // Property Handlers
    const handleSelectProperty = (id: number) => { setSelectedPropertyId(id); setSelectedCustomerId(null); setView('property_form'); };
    const handleAddPropertyClick = () => { setSelectedPropertyId(null); setSelectedCustomerId(null); setView('property_form'); };
    const handleSaveProperty = (propertyData: Property) => {
        setProperties(prev => {
            const existingIndex = prev.findIndex(p => p.id === propertyData.id);
            const newProperties = existingIndex > -1 ? Object.assign([], prev, {[existingIndex]: propertyData}) : [...prev, propertyData];
            if (isRagInitialized) addDocument(propertyToDocument(propertyData));
            return newProperties;
        });
        setView('property_form');
    };
    const handleDeleteProperty = (propertyId: number) => {
        setProperties(prev => prev.filter(p => p.id !== propertyId));
        if (isRagInitialized) deleteDocument(`property-${propertyId}`);
        handleBackToDashboard();
    };

    // Local Fallback Search
    const performLocalCustomerSearch = (property: Property): MatchResult[] => {
        return customers
            .filter(c => {
                if (c.requirements.transactionType !== property.transactionType) return false;
                if (property.transactionType === TransactionType.Sale) {
                    return property.price && c.requirements.budget ? c.requirements.budget >= property.price * 0.9 : false;
                }
                if (property.transactionType === TransactionType.Rent) {
                    const rahnMatch = property.rahn && c.requirements.maxRahn ? c.requirements.maxRahn >= property.rahn : false;
                    const rentMatch = property.rent && c.requirements.maxRent ? c.requirements.maxRent >= property.rent : false;
                    return rahnMatch && rentMatch;
                }
                return false;
            })
            .map(c => ({ customerId: c.id }));
    };

    const performLocalPropertySearch = (customer: Customer): PropertyMatchResult[] => {
        return properties
            .filter(p => {
                if (p.transactionType !== customer.requirements.transactionType) return false;
                const req = customer.requirements;
                const areaMatch = p.area >= req.minArea && p.area <= req.maxArea;
                if (!areaMatch) return false;
                if (customer.requirements.transactionType === TransactionType.Sale) {
                    return p.price && req.budget ? p.price <= req.budget * 1.1 : false;
                }
                if (customer.requirements.transactionType === TransactionType.Rent) {
                    const rahnMatch = p.rahn && req.maxRahn ? p.rahn <= req.maxRahn : false;
                    const rentMatch = p.rent && req.maxRent ? p.rent <= req.maxRent : false;
                    return rahnMatch && rentMatch;
                }
                return false;
            })
            .map(p => ({ propertyId: p.id }));
    };

    const handleFindMatchesForProperty = useCallback(async (property: Property) => {
        setIsSearching(true);
        setSearchResults([]);
        setSearchFallbackUsed(false);
        if (apiKeys.length === 0) {
            alert("جستجوی هوشمند غیرفعال است (کلید API یافت نشد). نتایج بر اساس جستجوی متنی ساده نمایش داده می‌شوند.");
            setSearchResults(performLocalCustomerSearch(property));
            setSearchFallbackUsed(true);
            setIsSearching(false);
            setView('search_results');
            return;
        }
        try {
            const results = await findMatchingCustomers(apiKeys, property, customers);
            setSearchResults(results);
        } catch (error) {
            console.error("AI search failed, falling back to local search:", error);
            alert(`جستجوی هوشمند ناموفق بود: ${error}. نتایج بر اساس جستجوی متنی ساده نمایش داده می‌شوند.`);
            setSearchResults(performLocalCustomerSearch(property));
            setSearchFallbackUsed(true);
        } finally {
            setIsSearching(false);
            setView('search_results');
        }
    }, [customers, apiKeys]);

    const handleFindMatchesForCustomer = useCallback(async (customer: Customer) => {
        setIsSearching(true);
        setPropertyMatchResults([]);
        setSearchFallbackUsed(false);
        if (apiKeys.length === 0) {
            alert("جستجوی هوشمند غیرفعال است (کلید API یافت نشد). نتایج بر اساس جستجوی متنی ساده نمایش داده می‌شوند.");
            setPropertyMatchResults(performLocalPropertySearch(customer));
            setSearchFallbackUsed(true);
            setIsSearching(false);
            setView('property_match_results');
            return;
        }
        try {
            const results = await findMatchingProperties(apiKeys, customer, properties);
            setPropertyMatchResults(results);
        } catch (error) {
            console.error("AI property search failed, falling back to local search:", error);
            alert(`جستجوی هوشمند ناموفق بود: ${error}. نتایج بر اساس جستجوی متنی ساده نمایش داده می‌شوند.`);
            setPropertyMatchResults(performLocalPropertySearch(customer));
            setSearchFallbackUsed(true);
        } finally {
            setIsSearching(false);
            setView('property_match_results');
        }
    }, [properties, apiKeys]);

    // Task & Calendar Handlers
    const handleViewTasks = () => setView('task_manager');
    const handleViewCalendar = () => setView('calendar');
    const handleSaveTask = (task: Task) => {
        setTasks(prev => {
            const existingIndex = prev.findIndex(t => t.id === task.id);
            return existingIndex > -1 ? Object.assign([], prev, {[existingIndex]: task}) : [...prev, task];
        });
    };
    const handleDeleteTask = (taskId: number) => setTasks(prev => prev.filter(t => t.id !== taskId));
    const handleToggleTask = (taskId: number) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));

    // AI Copilot Handler
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
            const responseText = await getAiCopilotResponse(apiKeys, [...chatMessages, newUserMessage], customers, properties, tasks, message);
            setChatMessages(prev => [...prev, { role: 'model', content: responseText }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', content: `متاسفانه خطایی رخ داد: ${error}` }]);
        } finally {
            setIsCopilotLoading(false);
        }
    }, [chatMessages, customers, properties, tasks, apiKeys, isRagInitialized]);

    // Data Import/Export Handlers
    const handleFileImport = (importer: (data: any[]) => Promise<void>) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const data = JSON.parse(await file.text());
                    if (Array.isArray(data)) await importer(data); else alert('فایل JSON باید حاوی یک آرایه باشد.');
                } catch (err) { alert(`فایل JSON نامعتبر است: ${err}`); }
            }
        };
        input.click();
    };

    const handleGeminiPropertyImport = async (rawData: any[]) => {
        if (apiKeys.length === 0) { alert("لطفا ابتدا کلید API را در تنظیمات وارد کنید."); return; }
        setIsSearching(true);
        try {
            const sanitizedProperties = await Promise.all(rawData.map(item => sanitizePropertyData(apiKeys, item)));
            const newProperties: Property[] = sanitizedProperties.map((p, index) => ({ ...emptyPropertyData, ...p, id: Date.now() + index, createdAt: new Date().toISOString() }));
            setProperties(prev => [...prev, ...newProperties]);
            alert(`${newProperties.length} ملک با موفقیت وارد شد.`);
        } catch (error) { alert(`خطا در هنگام وارد کردن اطلاعات با Gemini: ${error}`); } finally { setIsSearching(false); }
    };

    const handleGeminiCustomerImport = async (rawData: any[]) => {
        if (apiKeys.length === 0) { alert("لطفا ابتدا کلید API را در تنظیمات وارد کنید."); return; }
        setIsSearching(true);
        try {
            const sanitizedCustomers = await Promise.all(rawData.map(item => sanitizeCustomerData(apiKeys, item)));
            const newCustomers: Customer[] = sanitizedCustomers.map((c, index) => ({
                name: 'بدون نام', phoneNumber: '', status: CustomerStatus.Active, interactions: [], ...c,
                id: Date.now() + index, createdAt: new Date().toISOString(),
                requirements: { ...emptyCustomerReq, ...c.requirements },
            }));
            setCustomers(prev => [...prev, ...newCustomers]);
            alert(`${newCustomers.length} مشتری با موفقیت وارد شد.`);
        } catch (error) { alert(`خطا در هنگام وارد کردن اطلاعات با Gemini: ${error}`); } finally { setIsSearching(false); }
    };

    const mapRawData = <T,>(raw: any, mapper: (item: any) => T, array: T[]): T[] => {
        try {
            const newItems = raw.map(mapper);
            return [...array, ...newItems];
        } catch (error) {
            alert(`خطا در هنگام وارد کردن اطلاعات خام: ${error}`);
            return array;
        }
    };

    const handleRawPropertyImport = async (rawData: any[]) => setProperties(prev => mapRawData(rawData, r => ({ ...emptyPropertyData, ...r, id: Date.now() + Math.random(), createdAt: new Date().toISOString() }), prev));
    const handleRawCustomerImport = async (rawData: any[]) => setCustomers(prev => mapRawData(rawData, r => ({ name: 'بدون نام', phoneNumber: '', status: CustomerStatus.Active, interactions: [], ...r, id: Date.now() + Math.random(), createdAt: new Date().toISOString(), requirements: {...emptyCustomerReq, ...r.requirements} }), prev));

    const handleExportData = () => {
        const allData = { customers, properties, tasks, apiKeys, aiConfig };
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crm_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;
    const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;

    const renderMainContent = () => {
        switch (view) {
            case 'customer_form': return <CustomerForm customer={selectedCustomer} onSave={handleSaveCustomer} onCancel={handleBackToDashboard} onDelete={handleDeleteCustomer} onFindMatches={handleFindMatchesForCustomer} isNew={!selectedCustomer} apiKeys={apiKeys} featureInsights={featureInsights} />;
            case 'property_form': return <PropertyForm property={selectedProperty} onSave={handleSaveProperty} onCancel={handleBackToDashboard} onDelete={handleDeleteProperty} onFindMatches={handleFindMatchesForProperty} isNew={!selectedProperty} />;
            case 'search_results': return <SearchResults results={searchResults} customers={customers} isLoading={isSearching} onBack={handleBackToDashboard} onSelectCustomer={handleSelectCustomer} isFallback={searchFallbackUsed} />;
            case 'property_match_results': return <PropertyMatchResults results={propertyMatchResults} properties={properties} isLoading={isSearching} onBack={handleBackToDashboard} onSelectProperty={handleSelectProperty} isFallback={searchFallbackUsed} />;
            case 'task_manager': return <TaskManager tasks={tasks} customers={customers} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onToggleTask={handleToggleTask} onSelectCustomer={handleSelectCustomer} />;
            case 'calendar': return <CalendarView tasks={tasks} customers={customers} onSaveTask={handleSaveTask} onSelectCustomer={handleSelectCustomer} />;
            case 'ai_copilot': return <AiCopilot messages={chatMessages} isLoading={isCopilotLoading} onSendMessage={handleSendMessageToCopilot} />;
            case 'settings': return <Settings apiKeys={apiKeys} onSave={setApiKeys} onExport={handleExportData} />;
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
                </nav>
                <div className="flex-1 flex flex-col space-y-6 mt-6 -mr-2 -ml-2 pr-2 pl-2 overflow-y-auto border-t border-slate-200 pt-6">
                    <CustomerList customers={customers} onAddCustomer={handleAddCustomerClick} onSelectCustomer={handleSelectCustomer} selectedCustomerId={view === 'customer_form' ? selectedCustomerId : null} onGeminiImport={() => handleFileImport(handleGeminiCustomerImport)} onRawImport={() => handleFileImport(handleRawCustomerImport)} />
                    <PropertyList properties={properties} onAddProperty={handleAddPropertyClick} onSelectProperty={handleSelectProperty} selectedPropertyId={view === 'property_form' ? selectedPropertyId : null} onGeminiImport={() => handleFileImport(handleGeminiPropertyImport)} onRawImport={() => handleFileImport(handleRawPropertyImport)} />
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto h-screen max-h-screen">
                {renderMainContent()}
            </main>
        </div>
    );
};

export default App;