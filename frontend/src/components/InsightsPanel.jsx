import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Lightbulb, Hash, Tag, Loader2, AlertCircle } from 'lucide-react';

const InsightsPanel = () => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        if (selectedDoc) {
            fetchInsights(selectedDoc);
        }
    }, [selectedDoc]);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/documents');
            setDocuments(response.data.documents);
            if (response.data.documents.length > 0 && !selectedDoc) {
                // Optionally auto-select the first one
                // setSelectedDoc(response.data.documents[0]);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    };

    const fetchInsights = async (fname) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`http://localhost:8000/api/insights?filename=${fname}`);
            setInsights(response.data);
        } catch (err) {
            setError("Failed to generate insights. Make sure a file is uploaded and the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    // Removed blocking check to allow dropdown selection


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-blue-600 space-y-4">
                <Loader2 size={40} className="animate-spin" />
                <p className="font-medium animate-pulse">Analyzing document structure and content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3">
                <AlertCircle size={24} />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Document Insights</h2>
                <div className="relative min-w-[200px]">
                    <select
                        value={selectedDoc}
                        onChange={(e) => setSelectedDoc(e.target.value)}
                        className="w-full pl-4 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                        <option value="">Select a document...</option>
                        {documents.map((doc, idx) => (
                            <option key={idx} value={doc}>{doc}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Tag size={16} />
                    </div>
                </div>
            </div>

            {insights && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Summary Card */}
                    <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                        <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <Lightbulb size={24} />
                            <h3 className="text-lg font-semibold">Executive Summary</h3>
                        </div>
                        <p className="text-gray-700 leading-relaxed text-lg">
                            {insights.summary}
                        </p>
                    </div>

                    {/* Key Entities */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                            <Hash size={20} />
                            <h3 className="font-semibold">Key Entities</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {insights.key_entities?.map((entity, i) => (
                                <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                                    {entity}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Topics */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 text-emerald-600 mb-4">
                            <Tag size={20} />
                            <h3 className="font-semibold">Main Topics</h3>
                        </div>
                        <div className="space-y-2">
                            {insights.topics?.map((topic, i) => (
                                <div key={i} className="flex items-center gap-2 text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>{topic}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InsightsPanel;
