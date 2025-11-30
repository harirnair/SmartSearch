import React, { useState } from 'react';
import axios from 'axios';
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const UploadZone = () => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        if (file.type !== 'application/pdf') {
            setStatus('error');
            setMessage('Please upload a PDF file.');
            return;
        }
        setFile(file);
        setStatus(null);
        setMessage('');

        // Auto upload
        await uploadFile(file);
    };

    const uploadFile = async (file) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setStatus('success');
            setMessage(`Successfully uploaded and indexed ${file.name}`);
            // Save filename to local storage for other components to use
            localStorage.setItem('current_filename', file.name);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-gray-900">Upload Documents</h2>
                <p className="text-gray-500">Upload your PDFs to start chatting and getting insights.</p>
            </div>

            <div
                className={`relative group cursor-pointer transition-all duration-300 ease-in-out
          ${dragActive ? 'scale-[1.02]' : 'scale-100'}
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleChange}
                    accept=".pdf"
                />

                <div className={`
          bg-white p-12 rounded-3xl border-2 border-dashed transition-colors duration-300
          flex flex-col items-center justify-center gap-6 shadow-sm
          ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'}
        `}>
                    <div className={`
            w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300
            ${dragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'}
          `}>
                        {uploading ? (
                            <Loader2 className="w-10 h-10 animate-spin" />
                        ) : (
                            <Upload className="w-10 h-10" />
                        )}
                    </div>

                    <div className="text-center space-y-1">
                        <p className="text-xl font-semibold text-gray-900">
                            {uploading ? 'Processing PDF...' : 'Drop your PDF here'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {uploading ? 'Extracting text and generating embeddings' : 'or click to browse'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {status && (
                <div className={`
          p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4
          ${status === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}
        `}>
                    {status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p className="font-medium">{message}</p>
                </div>
            )}
        </div>
    );
};

export default UploadZone;
