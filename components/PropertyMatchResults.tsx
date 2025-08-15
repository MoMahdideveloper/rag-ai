import React from 'react';
import { Property, PropertyMatchResult } from '../types';
import Spinner from './common/Spinner';
import Tag from './common/Tag';

interface PropertyMatchResultsProps {
    results: PropertyMatchResult[];
    properties: Property[];
    isLoading: boolean;
    onBack: () => void;
    onSelectProperty: (id: number) => void;
    isFallback: boolean;
}

const PropertyMatchResults: React.FC<PropertyMatchResultsProps> = ({ results, properties, isLoading, onBack, onSelectProperty, isFallback }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Spinner size="large" />
                <p className="mt-4 text-lg text-slate-600">در حال جستجوی املاک مناسب...</p>
                <p className="text-sm text-slate-500">این فرآیند ممکن است کمی طول بکشد.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold">{isFallback ? 'املاک پیشنهادی (جستجوی متنی)' : 'املاک پیشنهادی برای مشتری'}</h2>
                <button onClick={onBack} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    &rarr; بازگشت به داشبورد
                </button>
            </div>

            {isFallback && (
                <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mb-6 rounded-lg">
                    <p className="font-bold text-yellow-800">جستجوی هوشمند ناموفق بود</p>
                    <p className="text-sm text-yellow-700">نتایج زیر بر اساس جستجوی متنی ساده نمایش داده می‌شوند. لطفاً کلیدهای API خود را در تنظیمات بررسی کنید یا از اتصال اینترنت خود مطمئن شوید.</p>
                </div>
            )}

            {results.length === 0 ? (
                <p className="text-center text-slate-500 py-10">هیچ ملک منطبقی در سیستم پیدا نشد.</p>
            ) : (
                <ul className="space-y-4">
                    {results.map(result => {
                        const property = properties.find(p => p.id === result.propertyId);
                        if (!property) return null;

                        const scoreColor = result.matchScore && result.matchScore > 80 ? 'bg-green-100 text-green-800' :
                                           result.matchScore && result.matchScore > 60 ? 'bg-yellow-100 text-yellow-800' :
                                           'bg-slate-100 text-slate-800';

                        return (
                            <li key={result.propertyId} className="border border-slate-200 rounded-lg p-4 transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-lg text-emerald-700">{property.title}</h3>
                                        <p className="text-sm text-slate-500">{property.address}</p>
                                    </div>
                                    {result.matchScore !== undefined && (
                                        <div className={`px-3 py-1 text-sm font-bold rounded-full ${scoreColor} whitespace-nowrap`}>
                                            {result.matchScore}% تطابق
                                        </div>
                                    )}
                                </div>
                                {result.reasoning && (
                                <p className="mt-3 text-slate-700 bg-slate-50 p-3 rounded-md border-r-4 border-emerald-500">
                                    <span className="font-semibold">دلیل: </span>{result.reasoning}
                                </p>
                                )}
                                 <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <p className="text-xs font-semibold text-slate-500">ویژگی ها:</p>
                                        {property.features.slice(0, 5).map(tag => <Tag key={tag} text={tag}/>)}
                                        {property.features.length > 5 && <span className="text-xs text-slate-500">...</span>}
                                    </div>
                                    <button
                                        onClick={() => onSelectProperty(property.id)}
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        مشاهده جزئیات ملک &larr;
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default PropertyMatchResults;