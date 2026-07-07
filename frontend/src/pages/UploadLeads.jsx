import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText, CheckCircle2, ShieldAlert, AlertCircle, Sparkles } from 'lucide-react';

const UploadLeads = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const { token } = useAuth();

  const handleFileChange = (e) => {
    setError('');
    setResult(null);
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        setResult(data.stats);
        setFile(null);
      } else {
        setError(data.message || 'Error uploading file');
      }
    } catch (err) {
      setError('Connection failed. Server might be offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Generate a simple CSV string
    const csvContent = "data:text/csv;charset=utf-8,Name,Phone,City,State\r\nRajesh Kumar,9876543210,Lucknow,Uttar Pradesh\r\nAmit Sharma,8765432109,Kanpur,Uttar Pradesh\r\nPooja Singh,7654321098,Delhi,Delhi\r\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dialflow_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Upload Leads</h1>
        <p className="text-sm text-slate-500 font-medium">Bulk import your contact lists via CSV</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-8 space-y-6">
        {/* Template downloader banner */}
        <div className="p-4 bg-brand-50/50 border border-brand-100 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Need the template format?</p>
              <p className="text-[10px] text-slate-400 font-medium font-mono">Requires columns: Name, Phone, City, State</p>
            </div>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 hover-scale"
          >
            Download CSV Template
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Form uploader */}
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-3xl p-8 flex flex-col items-center justify-center transition-colors relative cursor-pointer group bg-slate-50/50">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-brand-50 flex items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 group-hover:text-brand-600 transition-colors">
              {file ? file.name : 'Select or drag & drop CSV file'}
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Max size: 5MB</p>
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/10 disabled:opacity-40 disabled:cursor-not-allowed hover-scale transition-all"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Process & Upload File</span>
            )}
          </button>
        </form>
      </div>

      {/* Result presentation dashboard */}
      {result && (
        <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl p-8 space-y-6 animate-scale-up">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-white">Import Complete!</h3>
              <p className="text-[10px] text-slate-400 font-medium">Leads have been successfully processed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Parsed</p>
              <p className="text-2xl font-black text-white mt-1">{result.totalParsed}</p>
            </div>
            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Successfully Imported</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{result.imported}</p>
            </div>
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Duplicate Phones Skipped</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{result.duplicatesFiltered}</p>
            </div>
            <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">DNC Filtered</p>
              <p className="text-2xl font-black text-rose-400 mt-1">{result.dncFiltered}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadLeads;
