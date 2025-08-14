import React, { useState, useCallback, useEffect } from 'react';
import { Customer, CustomerStatus, MatchResult, Property, PropertyMatchResult, Task, InteractionType, Interaction, TaskPriority, ChatMessage, TransactionType, Requirement, Team } from './types';
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
import UsersIcon from './components/icons/UsersIcon';
import TeamSettings from './components/TeamSettings';
import ChartBarIcon from './components/icons/ChartBarIcon';
import AnalyticsDashboard from './components/AnalyticsDashboard';
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
    const [teams, setTeams] = useState<Team[]>([]);
    const [activeTeam, setActiveTeam] = useState<Team | null>(null);
    const [apiKeys, setApiKeys] = useState<string[]>(() => JSON.parse(window.localStorage.getItem(API_KEYS_STORAGE_KEY) || 'null') || []);

    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [view, setView] = useState<'dashboard' | 'customer_form' | 'property_form' | 'search_results' | 'property_match_results' | 'task_manager' | 'calendar' | 'ai_copilot' | 'settings' | 'team_settings' | 'analytics_dashboard'>('dashboard');
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
                const userTeams = await api.get('/api/teams', token);
                setTeams(userTeams);
                if (userTeams.length > 0 && !activeTeam) {
                    setActiveTeam(userTeams[0]);
                } else if (userTeams.length === 0) {
                    setActiveTeam(null);
                }
            } catch (error) {
                console.error("Failed to fetch teams:", error);
                logout();
            }
        };
        initializeApp();
    }, [isAuthenticated, token]);

    useEffect(() => {
        const fetchTeamData = async () => {
            if (isAuthenticated && activeTeam) {
                try {
                    const [customersData, propertiesData, tasksData] = await Promise.all([
                        api.get(`/api/customers?teamId=${activeTeam.id}`, token),
                        api.get(`/api/properties?teamId=${activeTeam.id}`, token),
                        api.get('/api/tasks', token),
                    ]);
                    setCustomers(customersData);
                    setProperties(propertiesData);
                    setTasks(tasksData);
                } catch (error) {
                    console.error("Failed to fetch team data:", error);
                }
            } else {
                setCustomers([]);
                setProperties([]);
                setTasks([]);
            }
        };
        fetchTeamData();
    }, [isAuthenticated, token, activeTeam]);

    const handleLogout = () => {
        logout();
        setCustomers([]);
        setProperties([]);
        setTasks([]);
        setTeams([]);
        setActiveTeam(null);
        setView('dashboard');
    };

    if (!isAuthenticated) {
        return showRegister ? (
            <Register onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
            <Login onLogin={login} onSwitchToRegister={() => setShowRegister(true)} />
        );
    }

    // ... other useEffects and handlers ...
    const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'interactions'>) => {
        if (!activeTeam) {
            alert("Please select or create a team first.");
            return;
        }
        try {
            const payload = { ...customerData, TeamId: activeTeam.id };
            const savedCustomer = customerData.id
                ? await api.put(`/api/customers/${customerData.id}`, payload, token)
                : await api.post('/api/customers', payload, token);

            setCustomers(prev =>
                customerData.id ? prev.map(c => c.id === savedCustomer.id ? savedCustomer : c) : [...prev, savedCustomer]
            );
            setView('customer_form');
            setSelectedCustomerId(savedCustomer.id);
        } catch (error) {
            console.error("Failed to save customer:", error);
        }
    };

    const handleSaveProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'Images'>, images: FileList | null) => {
        if (!activeTeam) {
            alert("Please select or create a team first.");
            return;
        }
        try {
            const payload = { ...propertyData, TeamId: activeTeam.id };
            const savedProperty = propertyData.id
                ? await api.put(`/api/properties/${propertyData.id}`, payload, token)
                : await api.post('/api/properties', payload, token);

            if (images && images.length > 0) {
                const formData = new FormData();
                for (let i = 0; i < images.length; i++) {
                    formData.append('images', images[i]);
                }
                await fetch(`http://localhost:3001/api/properties/${savedProperty.id}/images`, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            }

            const updatedProperty = await api.get(`/api/properties/${savedProperty.id}`, token);

            setProperties(prev => {
                const existing = prev.find(p => p.id === updatedProperty.id);
                if (existing) {
                    return prev.map(p => p.id === updatedProperty.id ? updatedProperty : p);
                }
                return [...prev, updatedProperty];
            });

            setView('property_form');
            setSelectedPropertyId(updatedProperty.id);
        } catch (error) {
            console.error("Failed to save property:", error);
        }
    };

    const handleSendMessageToCopilot = useCallback(async (message: string) => {
        if (!message.trim()) return;
        if (!activeTeam) {
            setChatMessages(prev => [...prev, { role: 'model', content: 'Please select an active team to use the AI Copilot.' }]);
            return;
        }
        if (apiKeys.length === 0) {
            setChatMessages(prev => [...prev, { role: 'model', content: 'برای استفاده از دستیار هوشمند، لطفاً ابتدا یک یا چند کلید API Gemini را در بخش تنظیمات اضافه کنید.' }]);
            return;
        }
        const newUserMessage: ChatMessage = { role: 'user', content: message };
        setChatMessages(prev => [...prev, newUserMessage]);
        setIsCopilotLoading(true);
        try {
            const responseText = await getAiCopilotResponse(apiKeys, [...chatMessages, newUserMessage], message, token, activeTeam.id);
            setChatMessages(prev => [...prev, { role: 'model', content: responseText }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', content: `متاسفانه خطایی رخ داد: ${error}` }]);
        } finally {
            setIsCopilotLoading(false);
        }
    }, [chatMessages, apiKeys, token, activeTeam]);

    const renderMainContent = () => {
        switch (view) {
            case 'analytics_dashboard': return <AnalyticsDashboard activeTeamId={activeTeam?.id || null} />;
            case 'team_settings': return <TeamSettings />;
            // ... other cases
        }
    };

    return (
        <div className="bg-slate-100 min-h-screen text-slate-800 flex" style={{ direction: 'rtl' }}>
            <aside className="w-1/3 max-w-sm bg-white border-l border-slate-200 p-6 flex flex-col">
                 <div className="shrink-0">
                    <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer" onClick={() => setView('dashboard')}>هوشمند اِملاک</h1>
                    <div className="mt-2">
                        <label htmlFor="team-select" className="text-sm font-medium text-slate-600">Active Team:</label>
                        <select
                            id="team-select"
                            value={activeTeam?.id || ''}
                            onChange={(e) => setActiveTeam(teams.find(t => t.id == e.target.value) || null)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2"
                        >
                            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                        </select>
                    </div>
                 </div>
                <nav className="mt-6 flex flex-col gap-2">
                    {/* ... other buttons ... */}
                    <button onClick={() => setView('analytics_dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${view === 'analytics_dashboard' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><ChartBarIcon className="w-6 h-6" /><span>Analytics</span></button>
                    <button onClick={() => setView('team_settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${view === 'team_settings' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><UsersIcon className="w-6 h-6" /><span>Team Settings</span></button>
                    <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors text-slate-600 hover:bg-slate-100`}><LogoutIcon className="w-6 h-6" /><span>خروج</span></button>
                </nav>
                {/* ... rest of the component */}
            </aside>
            <main className="flex-1 p-8 overflow-y-auto h-screen max-h-screen">
                {renderMainContent()}
            </main>
        </div>
    );
};

export default App;