import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react';

const ChatWindow = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! Upload a PDF and ask me anything about it.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const [documents, setDocuments] = useState([]);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/documents');
            setDocuments(response.data.documents);
        } catch (error) {
            console.error("Error fetching documents:", error);
        }
    };

    const toggleDocSelection = (doc) => {
        setSelectedDocs(prev =>
            prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
        );
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const fileQuery = selectedDocs.length > 0 ? `&files=${selectedDocs.join(',')}` : '';
            const response = await axios.get(`http://localhost:8000/api/query?q=${encodeURIComponent(input)}${fileQuery}`);

            const results = response.data.results;
            const answer = response.data.answer;

            let assistantContent = answer || "I found some relevant information:";

            if (!answer && results.length === 0) {
                assistantContent = "I couldn't find any relevant information in the uploaded documents.";
            }

            const assistantMessage = {
                role: 'assistant',
                content: assistantContent,
                citations: results
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Document Selection Header */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                    >
                        <FileText size={16} />
                        <span>{selectedDocs.length > 0 ? `${selectedDocs.length} files selected` : 'All Documents'}</span>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-10">
                            <div className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase">Select Documents</div>
                            {documents.length === 0 ? (
                                <div className="px-2 py-2 text-sm text-gray-500">No documents found.</div>
                            ) : (
                                documents.map((doc, idx) => (
                                    <label key={idx} className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedDocs.includes(doc)}
                                            onChange={() => toggleDocSelection(doc)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 truncate">{doc}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-100 text-indigo-600'}
            `}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>

                        <div className={`space-y-2 max-w-[80%]`}>
                            <div className={`
                p-4 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'}
              `}>
                                {msg.content}
                            </div>

                            {/* Citations */}
                            {msg.citations && msg.citations.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                    {msg.citations.map((cit, i) => (
                                        <div key={i} className="flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-gray-500">
                                            <FileText size={12} />
                                            <span>{cit.source} (p. {cit.page})</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Bot size={20} />
                        </div>
                        <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <form onSubmit={handleSend} className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your documents..."
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                    >
                        <Send size={18} />
                        <span>Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
