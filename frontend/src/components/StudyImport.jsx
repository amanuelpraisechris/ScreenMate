import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  File,
  X,
  Database,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const StudyImport = () => {
  const { currentProject, importStudies, loading, refreshStats } = useApp();
  const [importMethod, setImportMethod] = useState('file');
  const [manualEntry, setManualEntry] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Manual entry fields
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [journal, setJournal] = useState('');
  const [doi, setDoi] = useState('');

  const supportedFormats = [
    { name: 'RIS', ext: '.ris', desc: 'EndNote, Zotero, Mendeley' },
    { name: 'PubMed XML', ext: '.xml', desc: 'PubMed export' },
    { name: 'NBIB', ext: '.nbib', desc: 'PubMed MEDLINE' },
    { name: 'EndNote XML', ext: '.xml', desc: 'EndNote library' },
    { name: 'BibTeX', ext: '.bib', desc: 'LaTeX bibliography' },
    { name: 'CSV', ext: '.csv', desc: 'Spreadsheet export' },
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setImportResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setImportResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !currentProject) return;

    setUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `${BACKEND_URL}/api/projects/${currentProject.id}/studies/import-file`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setImportResult(response.data);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refreshStats();
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Failed to import file';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setError(null);
      const study = {
        title: title.trim(),
        abstract: abstract.trim() || null,
        authors: authors ? authors.split(',').map(a => a.trim()) : null,
        year: year ? parseInt(year) : null,
        journal: journal.trim() || null,
        doi: doi.trim() || null,
        source: 'manual',
      };

      const result = await importStudies([study]);
      setImportResult(result);
      
      // Clear form
      setTitle('');
      setAbstract('');
      setAuthors('');
      setYear('');
      setJournal('');
      setDoi('');
    } catch (err) {
      setError(err.message || 'Failed to import study');
    }
  };

  const handleBulkImport = async () => {
    if (!manualEntry.trim()) {
      setError('Please enter study data');
      return;
    }

    try {
      setError(null);
      // Parse CSV/tab-delimited data
      const lines = manualEntry.trim().split('\n');
      const studies = [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 1 && parts[0].trim()) {
          studies.push({
            title: parts[0].trim(),
            abstract: parts[1]?.trim() || null,
            authors: parts[2] ? parts[2].split(';').map(a => a.trim()) : null,
            year: parts[3] ? parseInt(parts[3]) : null,
            journal: parts[4]?.trim() || null,
            doi: parts[5]?.trim() || null,
            source: 'bulk_import',
          });
        }
      }

      if (studies.length === 0) {
        setError('No valid studies found in the input');
        return;
      }

      const result = await importStudies(studies);
      setImportResult(result);
      setManualEntry('');
    } catch (err) {
      setError(err.message || 'Failed to import studies');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Studies</h2>
        
        {/* Import method tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setImportMethod('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              importMethod === 'file'
                ? 'bg-[#6B8E7B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            File Upload
          </button>
          <button
            onClick={() => setImportMethod('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              importMethod === 'manual'
                ? 'bg-[#6B8E7B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Single Study
          </button>
          <button
            onClick={() => setImportMethod('bulk')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              importMethod === 'bulk'
                ? 'bg-[#6B8E7B] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Paste Text
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {importResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Import successful!</span>
            </div>
            <ul className="text-sm ml-6 space-y-0.5">
              <li>• {importResult.imported_count} studies imported</li>
              {importResult.duplicates_skipped > 0 && (
                <li>• {importResult.duplicates_skipped} duplicates skipped</li>
              )}
              {importResult.detected_format && (
                <li>• Format detected: {importResult.detected_format}</li>
              )}
            </ul>
          </div>
        )}

        {/* File Upload Method */}
        {importMethod === 'file' && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragOver 
                  ? 'border-[#6B8E7B] bg-[#6B8E7B]/5' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".ris,.xml,.nbib,.bib,.csv,.txt,.enw"
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="w-8 h-8 text-[#6B8E7B]" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop your file here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#6B8E7B] font-medium hover:underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports RIS, PubMed XML, EndNote, BibTeX, CSV
                  </p>
                </>
              )}
            </div>

            {selectedFile && (
              <Button
                onClick={handleFileUpload}
                disabled={uploading}
                className="w-full bg-[#6B8E7B] hover:bg-[#5a7a69] text-white py-3"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Studies
                  </>
                )}
              </Button>
            )}

            {/* Supported formats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
              {supportedFormats.map((format) => (
                <div
                  key={format.name}
                  className="bg-gray-50 rounded-lg p-3 text-center"
                >
                  <p className="font-medium text-gray-900 text-sm">{format.name}</p>
                  <p className="text-xs text-gray-500">{format.desc}</p>
                  <p className="text-xs text-[#6B8E7B] mt-1">{format.ext}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Entry Method */}
        {importMethod === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Study title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
              <Textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Study abstract"
                rows={4}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
                <Input
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="Author 1, Author 2, ..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  type="number"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal</label>
                <Input
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="Journal name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DOI</label>
                <Input
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="10.xxxx/xxxxx"
                />
              </div>
            </div>
            <Button
              onClick={handleManualSubmit}
              disabled={loading || !title.trim()}
              className="bg-[#6B8E7B] hover:bg-[#5a7a69] text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Add Study
            </Button>
          </div>
        )}

        {/* Bulk Paste Method */}
        {importMethod === 'bulk' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paste tab-delimited data
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Format: Title [tab] Abstract [tab] Authors (semicolon-separated) [tab] Year [tab] Journal [tab] DOI
              </p>
              <Textarea
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                placeholder={`Paste your data here...
Example:
Study Title 1\tAbstract text here\tSmith J; Doe A\t2024\tNature\t10.1234/abc
Study Title 2\tAnother abstract\tJohnson B\t2023\tScience\t10.5678/def`}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleBulkImport}
              disabled={loading || !manualEntry.trim()}
              className="bg-[#6B8E7B] hover:bg-[#5a7a69] text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import Studies
            </Button>
          </div>
        )}
      </div>

      {/* Integration Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">PubMed</h3>
          </div>
          <p className="text-sm text-gray-600">
            Export from PubMed as NBIB or XML format, then upload the file here.
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Zotero / EndNote</h3>
          </div>
          <p className="text-sm text-gray-600">
            Export your library as RIS format for best compatibility.
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Spreadsheet</h3>
          </div>
          <p className="text-sm text-gray-600">
            Save as CSV with columns: Title, Abstract, Authors, Year, Journal, DOI.
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Import Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Duplicate studies (same DOI or PMID) are automatically skipped</li>
          <li>• RIS format is recommended for Zotero, EndNote, and Mendeley exports</li>
          <li>• PubMed exports work best in NBIB or XML format</li>
          <li>• CSV files should have a header row with column names</li>
          <li>• Studies will be added with &quot;imported&quot; status ready for screening</li>
        </ul>
      </div>
    </div>
  );
};

export default StudyImport;
