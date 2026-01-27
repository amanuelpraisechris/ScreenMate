import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { prismaApi } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Download,
  Loader2,
  RefreshCw,
  Database,
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  AlertCircle,
} from 'lucide-react';

const PRISMAFlowDiagram = () => {
  const { currentProject } = useApp();
  const [loading, setLoading] = useState(false);
  const [prismaData, setPrismaData] = useState(null);
  const diagramRef = useRef(null);

  const fetchPrismaData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const response = await prismaApi.getData(currentProject.id);
      setPrismaData(response.data);
    } catch (err) {
      console.error('Failed to fetch PRISMA data', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchPrismaData();
  }, [fetchPrismaData]);

  const downloadAsSVG = () => {
    if (!diagramRef.current) return;
    const svgElement = diagramRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prisma_flow_${currentProject?.name || 'diagram'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsPNG = async () => {
    if (!diagramRef.current) return;
    const svgElement = diagramRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `prisma_flow_${currentProject?.name || 'diagram'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B8E7B]" />
      </div>
    );
  }

  if (!prismaData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
          <p className="text-gray-500 mt-1">Import studies to generate the PRISMA flow diagram.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate values for display
  const totalIdentified =
    prismaData.records_identified_databases +
    prismaData.records_identified_registers +
    prismaData.records_identified_other;

  const recordsAfterRemoval = totalIdentified - prismaData.duplicates_removed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">PRISMA 2020 Flow Diagram</h2>
          <p className="text-sm text-gray-500 mt-1">
            Visualization of the systematic review screening process
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPrismaData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsSVG}>
            <Download className="w-4 h-4 mr-2" />
            SVG
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAsPNG}>
            <Download className="w-4 h-4 mr-2" />
            PNG
          </Button>
        </div>
      </div>

      {/* PRISMA Diagram */}
      <Card>
        <CardContent className="p-6" ref={diagramRef}>
          <svg
            viewBox="0 0 1000 800"
            className="w-full h-auto"
            style={{ minHeight: '600px' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background */}
            <rect width="1000" height="800" fill="#ffffff" />

            {/* Section Labels */}
            <text x="30" y="30" className="text-lg font-bold" fill="#374151" fontSize="16" fontWeight="bold">
              Identification
            </text>
            <text x="30" y="230" className="text-lg font-bold" fill="#374151" fontSize="16" fontWeight="bold">
              Screening
            </text>
            <text x="30" y="430" className="text-lg font-bold" fill="#374151" fontSize="16" fontWeight="bold">
              Included
            </text>

            {/* Section Dividers */}
            <line x1="20" y1="200" x2="980" y2="200" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="20" y1="400" x2="980" y2="400" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />

            {/* ===== IDENTIFICATION SECTION ===== */}

            {/* Records from databases */}
            <g transform="translate(100, 60)">
              <rect width="280" height="80" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
              <text x="140" y="30" textAnchor="middle" fill="#1e40af" fontSize="13" fontWeight="600">
                Records identified from databases
              </text>
              <text x="140" y="55" textAnchor="middle" fill="#1e40af" fontSize="24" fontWeight="bold">
                {prismaData.records_identified_databases}
              </text>
            </g>

            {/* Records from other sources */}
            <g transform="translate(620, 60)">
              <rect width="280" height="80" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
              <text x="140" y="30" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="600">
                Records from other sources
              </text>
              <text x="140" y="55" textAnchor="middle" fill="#92400e" fontSize="24" fontWeight="bold">
                {prismaData.records_identified_other}
              </text>
            </g>

            {/* Arrow down from databases */}
            <line x1="240" y1="140" x2="240" y2="160" stroke="#6b7280" strokeWidth="2" />
            <polygon points="240,170 235,160 245,160" fill="#6b7280" />

            {/* Arrow down from other sources */}
            <line x1="760" y1="140" x2="760" y2="160" stroke="#6b7280" strokeWidth="2" />
            <polygon points="760,170 755,160 765,160" fill="#6b7280" />

            {/* ===== SCREENING SECTION ===== */}

            {/* Records after duplicates removed - centered box */}
            <g transform="translate(310, 220)">
              <rect width="380" height="70" rx="8" fill="#f3f4f6" stroke="#6b7280" strokeWidth="2" />
              <text x="190" y="28" textAnchor="middle" fill="#374151" fontSize="13" fontWeight="600">
                Records after duplicates removed
              </text>
              <text x="190" y="52" textAnchor="middle" fill="#374151" fontSize="22" fontWeight="bold">
                {recordsAfterRemoval}
              </text>
            </g>

            {/* Duplicates removed - side box */}
            <g transform="translate(720, 220)">
              <rect width="180" height="70" rx="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
              <text x="90" y="28" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">
                Duplicates removed
              </text>
              <text x="90" y="52" textAnchor="middle" fill="#991b1b" fontSize="20" fontWeight="bold">
                {prismaData.duplicates_removed}
              </text>
            </g>

            {/* Arrow to duplicates removed */}
            <line x1="690" y1="255" x2="720" y2="255" stroke="#ef4444" strokeWidth="2" />
            <polygon points="718,250 718,260 728,255" fill="#ef4444" />

            {/* Arrow down to screened */}
            <line x1="500" y1="290" x2="500" y2="310" stroke="#6b7280" strokeWidth="2" />
            <polygon points="500,320 495,310 505,310" fill="#6b7280" />

            {/* Records screened */}
            <g transform="translate(310, 320)">
              <rect width="380" height="70" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
              <text x="190" y="28" textAnchor="middle" fill="#166534" fontSize="13" fontWeight="600">
                Records screened (Title & Abstract)
              </text>
              <text x="190" y="52" textAnchor="middle" fill="#166534" fontSize="22" fontWeight="bold">
                {prismaData.records_screened}
              </text>
            </g>

            {/* Records excluded at screening */}
            <g transform="translate(720, 320)">
              <rect width="180" height="70" rx="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
              <text x="90" y="28" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">
                Records excluded
              </text>
              <text x="90" y="52" textAnchor="middle" fill="#991b1b" fontSize="20" fontWeight="bold">
                {prismaData.records_excluded_screening}
              </text>
            </g>

            {/* Arrow to excluded at screening */}
            <line x1="690" y1="355" x2="720" y2="355" stroke="#ef4444" strokeWidth="2" />
            <polygon points="718,350 718,360 728,355" fill="#ef4444" />

            {/* ===== INCLUDED SECTION ===== */}

            {/* Arrow down to full text */}
            <line x1="500" y1="390" x2="500" y2="420" stroke="#6b7280" strokeWidth="2" />
            <polygon points="500,430 495,420 505,420" fill="#6b7280" />

            {/* Reports assessed for eligibility */}
            <g transform="translate(310, 430)">
              <rect width="380" height="70" rx="8" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
              <text x="190" y="28" textAnchor="middle" fill="#3730a3" fontSize="13" fontWeight="600">
                Reports assessed for eligibility (Full Text)
              </text>
              <text x="190" y="52" textAnchor="middle" fill="#3730a3" fontSize="22" fontWeight="bold">
                {prismaData.reports_assessed_eligibility}
              </text>
            </g>

            {/* Reports not retrieved */}
            <g transform="translate(720, 430)">
              <rect width="180" height="70" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
              <text x="90" y="28" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="600">
                Reports not retrieved
              </text>
              <text x="90" y="52" textAnchor="middle" fill="#92400e" fontSize="20" fontWeight="bold">
                {prismaData.reports_not_retrieved}
              </text>
            </g>

            {/* Arrow to not retrieved */}
            <line x1="690" y1="465" x2="720" y2="465" stroke="#f59e0b" strokeWidth="2" />
            <polygon points="718,460 718,470 728,465" fill="#f59e0b" />

            {/* Arrow down to excluded eligibility */}
            <line x1="500" y1="500" x2="500" y2="530" stroke="#6b7280" strokeWidth="2" />
            <polygon points="500,540 495,530 505,530" fill="#6b7280" />

            {/* Reports excluded with reasons */}
            <g transform="translate(620, 540)">
              <rect width="280" height="120" rx="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
              <text x="140" y="25" textAnchor="middle" fill="#991b1b" fontSize="12" fontWeight="600">
                Reports excluded with reasons:
              </text>
              {Object.entries(prismaData.exclusion_reasons || {}).length > 0 ? (
                Object.entries(prismaData.exclusion_reasons)
                  .slice(0, 4)
                  .map(([reason, count], index) => (
                    <text
                      key={reason}
                      x="20"
                      y={50 + index * 20}
                      fill="#991b1b"
                      fontSize="11"
                    >
                      • {reason}: {count}
                    </text>
                  ))
              ) : (
                <text x="140" y="70" textAnchor="middle" fill="#991b1b" fontSize="11">
                  No exclusions recorded yet
                </text>
              )}
            </g>

            {/* Arrow to excluded with reasons */}
            <line x1="500" y1="600" x2="620" y2="600" stroke="#ef4444" strokeWidth="2" />
            <polygon points="618,595 618,605 628,600" fill="#ef4444" />

            {/* Studies included */}
            <g transform="translate(260, 540)">
              <rect width="280" height="100" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="3" />
              <text x="140" y="35" textAnchor="middle" fill="#166534" fontSize="14" fontWeight="600">
                Studies included in review
              </text>
              <text x="140" y="70" textAnchor="middle" fill="#166534" fontSize="32" fontWeight="bold">
                {prismaData.studies_included_review}
              </text>
            </g>

            {/* Sources breakdown - bottom left */}
            {Object.keys(prismaData.sources || {}).length > 0 && (
              <g transform="translate(50, 680)">
                <text x="0" y="0" fill="#6b7280" fontSize="12" fontWeight="600">
                  Sources:
                </text>
                {Object.entries(prismaData.sources)
                  .slice(0, 5)
                  .map(([source, count], index) => (
                    <text key={source} x={0 + index * 150} y="20" fill="#6b7280" fontSize="11">
                      {source}: {count}
                    </text>
                  ))}
              </g>
            )}

            {/* PRISMA 2020 Label */}
            <text x="980" y="780" textAnchor="end" fill="#9ca3af" fontSize="10">
              PRISMA 2020 Flow Diagram
            </text>
          </svg>
        </CardContent>
      </Card>

      {/* Summary Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Identified</p>
                <p className="text-2xl font-bold">{totalIdentified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duplicates</p>
                <p className="text-2xl font-bold">{prismaData.duplicates_removed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Filter className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Screened</p>
                <p className="text-2xl font-bold">{prismaData.records_screened}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Included</p>
                <p className="text-2xl font-bold">{prismaData.studies_included_review}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
          <CardDescription>Stage-by-stage analysis of the screening process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Identification */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Identification
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">From databases:</span>
                  <span className="ml-2 font-medium">{prismaData.records_identified_databases}</span>
                </div>
                <div>
                  <span className="text-blue-700">From other sources:</span>
                  <span className="ml-2 font-medium">{prismaData.records_identified_other}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total identified:</span>
                  <span className="ml-2 font-medium">{totalIdentified}</span>
                </div>
              </div>
            </div>

            {/* Screening */}
            <div className="p-4 bg-amber-50 rounded-lg">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Screening
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-amber-700">Duplicates removed:</span>
                  <span className="ml-2 font-medium">{prismaData.duplicates_removed}</span>
                </div>
                <div>
                  <span className="text-amber-700">Records screened:</span>
                  <span className="ml-2 font-medium">{prismaData.records_screened}</span>
                </div>
                <div>
                  <span className="text-amber-700">Excluded at screening:</span>
                  <span className="ml-2 font-medium">{prismaData.records_excluded_screening}</span>
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Eligibility
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-purple-700">Reports sought:</span>
                  <span className="ml-2 font-medium">{prismaData.reports_sought_retrieval}</span>
                </div>
                <div>
                  <span className="text-purple-700">Not retrieved:</span>
                  <span className="ml-2 font-medium">{prismaData.reports_not_retrieved}</span>
                </div>
                <div>
                  <span className="text-purple-700">Assessed for eligibility:</span>
                  <span className="ml-2 font-medium">{prismaData.reports_assessed_eligibility}</span>
                </div>
              </div>
            </div>

            {/* Included */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Included
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700">Studies included:</span>
                  <span className="ml-2 font-medium text-lg">{prismaData.studies_included_review}</span>
                </div>
                <div>
                  <span className="text-green-700">Reports included:</span>
                  <span className="ml-2 font-medium text-lg">{prismaData.reports_included_review}</span>
                </div>
              </div>
            </div>

            {/* Exclusion Reasons */}
            {Object.keys(prismaData.exclusion_reasons || {}).length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Exclusion Reasons (Full Text)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(prismaData.exclusion_reasons).map(([reason, count]) => (
                    <div key={reason} className="flex justify-between">
                      <span className="text-red-700">{reason}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PRISMAFlowDiagram;
