import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitCompare, Check, AlertCircle, Loader2, FileText } from 'lucide-react';

const CompareView = () => {
    const [file1, setFile1] = useState('');
    const [file2, setFile2] = useState('');
    const [documents, setDocuments] = useState([]);
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/documents`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    };

    const handleCompare = async (e) => {
        e.preventDefault();
        if (!file1 || !file2) {
            setError("Please specify both filenames to compare.");
            return;
        }

        setLoading(true);
        setError(null);
        setComparison(null);

        try {
            // Note: In a real app, you'd probably have a dropdown of available files.
            // Here we rely on manual input or previously uploaded files.
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/compare?file1=${file1}&file2=${file2}`);
            setComparison(response.data);
        } catch (err) {
            setError("Failed to generate comparison. Ensure both files are uploaded and indexed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Compare Documents</h2>
                <p className="text-gray-500">Analyze similarities and differences between two documents.</p>
            </div>

            {/* Input Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <form onSubmit={handleCompare} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-medium text-gray-700">Document 1</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-gray-400" size={20} />
                            <select
                                value={file1}
                                onChange={(e) => setFile1(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            >
                                <option value="">Select first document...</option>
                                {Array.isArray(documents) && documents.map((doc, idx) => (
                                    <option key={idx} value={doc}>{doc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-center pb-3 text-gray-400">
                        <GitCompare size={24} />
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <label className="text-sm font-medium text-gray-700">Document 2</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-gray-400" size={20} />
                            <select
                                value={file2}
                                onChange={(e) => setFile2(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            >
                                <option value="">Select second document...</option>
                                {Array.isArray(documents) && documents.map((doc, idx) => (
                                    <option key={idx} value={doc}>{doc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex-shrink-0"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Compare'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>

            {/* Results Section */}
            {comparison && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Similarities */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 text-emerald-600 mb-4">
                            <Check size={24} />
                            <h3 className="text-lg font-semibold">Similarities</h3>
                        </div>
                        <ul className="space-y-3">
                            {comparison.similarities?.map((item, i) => (
                                <li key={i} className="flex gap-3 text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Differences */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 text-amber-600 mb-4">
                            <GitCompare size={24} />
                            <h3 className="text-lg font-semibold">Differences</h3>
                        </div>
                        <ul className="space-y-3">
                            {comparison.differences?.map((item, i) => (
                                <li key={i} className="flex gap-3 text-gray-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Conclusion */}
                    <div className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Conclusion</h3>
                        <p className="text-blue-800 leading-relaxed">
                            {comparison.conclusion}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompareView;
