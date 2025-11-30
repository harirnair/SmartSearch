import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, FileText, CheckCircle, AlertCircle, Loader2, Star } from 'lucide-react';

const EvaluationPage = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/documents');
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    };

    const toggleDocSelection = (doc) => {
        setSelectedDocs(prev =>
            prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
        );
    };

    const handleRunEvaluation = async () => {
        setLoading(true);
        setError(null);
        setResults(null);
        setProgress({ current: 0, total: 0 });

        try {
            // 1. Generate Test Set
            const genResponse = await axios.post('http://localhost:8000/api/evaluate/generate?num_samples=20', selectedDocs);
            const testSet = genResponse.data.test_set;

            if (!testSet || testSet.length === 0) {
                setError("Failed to generate test questions.");
                setLoading(false);
                return;
            }

            setProgress({ current: 0, total: testSet.length });
            const completedResults = [];

            // 2. Run Evaluation One by One
            for (let i = 0; i < testSet.length; i++) {
                const item = testSet[i];
                try {
                    const evalResponse = await axios.post('http://localhost:8000/api/evaluate/run_single', {
                        question: item.question,
                        true_answer: item.true_answer,
                        files: selectedDocs
                    });

                    completedResults.push(evalResponse.data);

                    // Update Results incrementally
                    const totalScore = completedResults.reduce((acc, curr) => acc + curr.score, 0);
                    const avgScore = (totalScore / completedResults.length).toFixed(2);

                    setResults({
                        average_score: avgScore,
                        total_questions: completedResults.length,
                        results: [...completedResults] // Create new array to trigger re-render
                    });

                    setProgress(prev => ({ ...prev, current: i + 1 }));

                } catch (err) {
                    console.error("Error evaluating item", i, err);
                }
            }

        } catch (err) {
            setError("Evaluation failed. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">RAG System Evaluation</h2>
                <p className="text-gray-500">Generate synthetic questions and grade the system's performance.</p>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Select Documents to Evaluate</h3>
                    <div className="flex flex-wrap gap-2">
                        {documents.length === 0 && <span className="text-gray-400 text-sm">No documents found.</span>}
                        {documents.map((doc, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleDocSelection(doc)}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                                    ${selectedDocs.includes(doc)
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}
                                `}
                            >
                                <FileText size={16} />
                                {doc}
                                {selectedDocs.includes(doc) && <CheckCircle size={14} className="text-blue-500" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {loading && (
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                            ></div>
                            <p className="text-xs text-gray-500 mt-1 text-center">Processing {progress.current} of {progress.total}...</p>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleRunEvaluation}
                            disabled={loading || selectedDocs.length === 0}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                            <span>Start Evaluation (20 Samples)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            {results && (
                <div className="space-y-6">
                    {/* Score Card */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-bold mb-1">Evaluation Score</h3>
                            <p className="text-indigo-100">Average accuracy across {results.total_questions} generated questions</p>
                        </div>
                        <div className="flex items-center gap-2 text-5xl font-bold">
                            <span>{results.average_score}</span>
                            <span className="text-2xl text-indigo-200">/ 5</span>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Question</th>
                                        <th className="px-6 py-3">Relevant Chunks</th>
                                        <th className="px-6 py-3">Generated Answer</th>
                                        <th className="px-6 py-3">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.results.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 animate-in fade-in slide-in-from-bottom-2">
                                            <td className="px-6 py-4 max-w-xs">{item.question}</td>
                                            <td className="px-6 py-4 max-w-xs text-gray-600 text-xs">
                                                <div className="max-h-32 overflow-y-auto space-y-2">
                                                    {item.relevant_chunks && item.relevant_chunks.map((chunk, i) => (
                                                        <div key={i} className="p-2 bg-gray-50 rounded border border-gray-100">
                                                            {chunk.substring(0, 150)}...
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs text-gray-600">{item.generated_answer}</td>
                                            <td className="px-6 py-4">
                                                <div className={`
                                                    inline-flex items-center gap-1 px-2 py-1 rounded-md font-bold
                                                    ${item.score >= 4 ? 'bg-green-100 text-green-700' :
                                                        item.score >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'}
                                                `}>
                                                    <Star size={12} fill="currentColor" />
                                                    {item.score}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationPage;
