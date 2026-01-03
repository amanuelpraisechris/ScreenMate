import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const StudyImport = () => {
  const { currentProject, importStudies, loading } = useApp();
  const [importMethod, setImportMethod] = useState('manual');
  const [manualEntry, setManualEntry] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // Manual entry fields
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState('');
  const [journal, setJournal] = useState('');
  const [doi, setDoi] = useState('');

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
        <div className="flex gap-2 mb-6">
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
            Bulk Import
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Success message */}
        {importResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            Successfully imported {importResult.imported_count} studies
          </div>
        )}

        {importMethod === 'manual' ? (
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
        ) : (
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
                placeholder="Paste your data here...
Example:
Study Title 1	Abstract text here	Smith J; Doe A	2024	Nature	10.1234/abc
Study Title 2	Another abstract	Johnson B	2023	Science	10.5678/def"
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

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Import Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• For bulk import, use tab-delimited format (copy from Excel)</li>
          <li>• Authors should be separated by semicolons in bulk import</li>
          <li>• Title is the only required field</li>
          <li>• Studies will be added with "imported" status ready for screening</li>
        </ul>
      </div>
    </div>
  );
};

export default StudyImport;
