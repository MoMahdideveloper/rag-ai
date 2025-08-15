import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Spinner from './common/Spinner';
import BrainIcon from './icons/BrainIcon';
import UserIcon from './icons/UserIcon';
import SparklesIcon from './icons/SparklesIcon';

interface AiCopilotProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
}

const examplePrompts = [
    "کدام وظایف من عقب افتاده‌اند؟",
    "یک ایمیل پیگیری محترمانه برای خانواده رضایی بنویس.",
    "مشتریانی که بودجه بالای ۲۰ میلیارد دارند را لیست کن.",
    "خلاصه ای از نیازمندی های دکتر نیما افشار به من بده.",
];

const AiCopilot: React.FC<AiCopilotProps> = ({ messages, isLoading, onSendMessage }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleExampleClick = (prompt: string) => {
        if (!isLoading) {
            onSendMessage(prompt);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm">
            <header className="p-4 border-b border-slate-200">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <BrainIcon className="w-8 h-8 text-indigo-600"/>
                    <span>دستیار هوشمند (هوشمند)</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">از هوش مصنوعی برای تحلیل داده‌ها، تولید محتوا و پاسخ به سوالاتتان استفاده کنید.</p>
            </header>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && (
                                <div className="p-2 bg-indigo-100 rounded-full">
                                    <BrainIcon className="w-6 h-6 text-indigo-600" />
                                </div>
                            )}
                            <div className={`p-4 rounded-xl max-w-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                             {msg.role === 'user' && (
                                <div className="p-2 bg-slate-200 rounded-full">
                                    <UserIcon className="w-6 h-6 text-slate-600" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                             <div className="p-2 bg-indigo-100 rounded-full">
                                <BrainIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="p-4 rounded-xl bg-slate-100 text-slate-800 rounded-bl-none flex items-center gap-2">
                                <Spinner/>
                                <span>در حال فکر کردن...</span>
                            </div>
                        </div>
                    )}
                     <div ref={messagesEndRef} />
                </div>

                 {messages.length <= 1 && (
                    <div className="text-center p-8">
                        <SparklesIcon className="w-12 h-12 mx-auto text-indigo-400"/>
                        <h3 className="mt-4 text-lg font-semibold text-slate-700">چطور می‌توانم کمکتان کنم؟</h3>
                        <p className="mt-2 text-sm text-slate-500">می‌توانید یکی از مثال‌های زیر را امتحان کنید یا سوال خودتان را بپرسید:</p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {examplePrompts.map(prompt => (
                                <button key={prompt} onClick={() => handleExampleClick(prompt)} disabled={isLoading}
                                 className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 text-right transition-colors disabled:opacity-50">
                                    {prompt}
                                 </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-200">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="پیام خود را به «هوشمند» بنویسید..."
                        className="flex-1 w-full bg-slate-100 border-slate-200 border rounded-lg p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                        disabled={isLoading || !input.trim()}
                        aria-label="ارسال پیام"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transform -rotate-90">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AiCopilot;
