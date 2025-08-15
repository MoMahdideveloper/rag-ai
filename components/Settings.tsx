import React, { useState } from 'react';
import TrashIcon from './icons/TrashIcon';
import CogIcon from './icons/CogIcon';

interface SettingsProps {
    apiKeys: string[];
    onSave: (keys: string[]) => void;
    onExport: () => void;
}

const Settings: React.FC<SettingsProps> = ({ apiKeys, onSave, onExport }) => {
    const [newKey, setNewKey] = useState('');

    const handleAddKey = () => {
        const trimmedKey = newKey.trim();
        if (trimmedKey && !apiKeys.includes(trimmedKey)) {
            onSave([...apiKeys, trimmedKey]);
            setNewKey('');
        }
    };

    const handleDeleteKey = (keyToDelete: string) => {
        if (window.confirm('آیا از حذف این کلید API مطمئن هستید؟')) {
            onSave(apiKeys.filter(key => key !== keyToDelete));
        }
    };

    const maskApiKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    return (
        <div className="flex flex-col gap-8">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <CogIcon className="w-8 h-8" />
                <span>تنظیمات</span>
            </h1>

            <div className="bg-white p-8 rounded-xl shadow-sm space-y-6">
                <h2 className="text-xl font-bold">مدیریت کلیدهای API Gemini</h2>
                <p className="text-sm text-slate-600">
                    شما می‌توانید چندین کلید API اضافه کنید. سیستم به صورت خودکار بین آن‌ها جابجا می‌شود تا در صورت اتمام محدودیت یک کلید، از کلید بعدی استفاده کند. کلیدها در حافظه مرورگر شما ذخیره می‌شوند.
                </p>
                <div className="flex items-center gap-3">
                    <input type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="یک کلید API جدید وارد کنید" className="flex-1 w-full bg-slate-100 border-slate-200 border rounded-lg p-3 focus:ring-indigo-500 focus:border-indigo-500" />
                    <button onClick={handleAddKey} disabled={!newKey.trim()} className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors font-medium">افزودن</button>
                </div>
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700">کلیدهای ذخیره شده:</h3>
                    {apiKeys.length > 0 ? (
                        <ul className="space-y-2">
                            {apiKeys.map((key, index) => (
                                <li key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <span className="font-mono text-slate-700" title={key}>{maskApiKey(key)}</span>
                                    <button onClick={() => handleDeleteKey(key)} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" aria-label="حذف کلید"><TrashIcon className="w-5 h-5" /></button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-slate-500 py-6">هنوز هیچ کلید API اضافه نشده است.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm space-y-4">
                <h2 className="text-xl font-bold">پشتیبان‌گیری و بازیابی</h2>
                 <p className="text-sm text-slate-600">
                    از تمام داده‌های خود (مشتریان، املاک، وظایف) یک فایل JSON خروجی بگیرید. می‌توانید از این فایل برای بازیابی اطلاعات در مرورگر دیگر یا به عنوان بکاپ استفاده کنید.
                </p>
                <button onClick={onExport} className="bg-slate-600 text-white px-5 py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium">
                    خروجی گرفتن از تمام داده‌ها
                </button>
            </div>
        </div>
    );
};

export default Settings;