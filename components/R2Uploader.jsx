'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, File, CheckCircle, Loader2 } from 'lucide-react';

export default function R2Uploader({ folderPath = 'uploads', onUploadComplete }) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleUpload(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleUpload(files[0]);
        }
    };

    const handleUpload = async (file) => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // 1. Get Presigned URL
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    folder: folderPath
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to get upload URL');
            }

            const { url, publicUrl, filename } = await res.json();

            // 2. Upload File to R2
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url, true);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    setUploading(false);
                    setProgress(100);
                    if (onUploadComplete) {
                        onUploadComplete(publicUrl, filename);
                    }
                } else {
                    setError('Upload failed');
                    setUploading(false);
                }
            };

            xhr.onerror = () => {
                setError('Upload failed');
                setUploading(false);
            };

            xhr.send(file);

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Error uploading file');
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                    isDragging 
                        ? 'border-primary bg-primary/10' 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                />

                {uploading ? (
                    <div className="space-y-3">
                        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
                        <div className="text-sm text-gray-300">Enviando... {Math.round(progress)}%</div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <UploadCloud className="mx-auto h-8 w-8 text-text-muted" />
                        <div className="text-sm text-gray-300">
                            <span className="text-primary font-medium">Clique para upload</span> ou arraste e solte
                        </div>
                        <p className="text-xs text-text-muted">
                            Qualquer tipo de arquivo
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                    <X size={12} /> {error}
                </div>
            )}
        </div>
    );
}
