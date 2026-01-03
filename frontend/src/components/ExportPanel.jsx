import React from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { exportApi } from '../services/api';
import { Download, FileSpreadsheet, Database, FileText } from 'lucide-react';

const ExportPanel = () => {
  const { currentProject, templates, projectStats } = useApp();

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Screening Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Screening Decisions</h3>
            <p className="text-sm text-gray-500">Export all screening decisions with reviewer information</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleDownload(
              exportApi.screeningCsv(currentProject.id),
              `${currentProject.name}_all_screening.csv`
            )}
          >
            <Download className="w-4 h-4 mr-2" />
            All Decisions
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleDownload(
              exportApi.screeningCsv(currentProject.id, 'title_abstract'),
              `${currentProject.name}_title_abstract.csv`
            )}
          >
            <Download className="w-4 h-4 mr-2" />
            Title & Abstract
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleDownload(
              exportApi.screeningCsv(currentProject.id, 'full_text'),
              `${currentProject.name}_full_text.csv`
            )}
          >
            <Download className="w-4 h-4 mr-2" />
            Full Text
          </Button>
        </div>
      </div>

      {/* Extraction Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Database className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Extracted Data</h3>
            <p className="text-sm text-gray-500">Export extracted data with evidence anchors</p>
          </div>
        </div>
        
        {templates.length === 0 ? (
          <p className="text-gray-400 text-sm">No extraction templates available</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleDownload(
                  exportApi.extractionCsv(currentProject.id, template.id),
                  `${currentProject.name}_${template.name}_extraction.csv`
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                {template.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Export Summary */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Export Summary</h3>
        <div className="grid md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{projectStats?.total_studies || 0}</p>
            <p className="text-sm text-gray-500">Total Studies</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{projectStats?.included || 0}</p>
            <p className="text-sm text-gray-500">Included</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{projectStats?.excluded || 0}</p>
            <p className="text-sm text-gray-500">Excluded</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{projectStats?.conflicts_pending || 0}</p>
            <p className="text-sm text-gray-500">Conflicts</p>
          </div>
        </div>
      </div>

      {/* Export Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">About Exports</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• All exports include reviewer decisions and timestamps</li>
              <li>• Extraction exports include evidence quotes and page numbers</li>
              <li>• Conflicts are marked for transparency</li>
              <li>• CSV format compatible with Excel, R, and Python</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
