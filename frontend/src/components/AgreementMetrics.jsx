import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { projectsApi } from '../services/api';
import { Progress } from './ui/progress';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  UserCheck,
  Loader2,
  BarChart3,
} from 'lucide-react';

const AgreementMetrics = () => {
  const { currentProject } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [currentProject]);

  const loadMetrics = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const response = await projectsApi.getAgreementMetrics(currentProject.id);
      setMetrics(response.data);
    } catch (err) {
      console.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B8E7B]" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No screening data yet</p>
      </div>
    );
  }

  const { title_abstract, full_text, ai_screening, reviewer_stats, conflicts_resolved, conflicts_pending } = metrics;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Inter-Rater Agreement - Title & Abstract */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">T&A Agreement</h4>
          </div>
          {title_abstract.agreement_rate !== null ? (
            <>
              <p className="text-3xl font-bold text-gray-900">{title_abstract.agreement_rate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {title_abstract.agreements} agreed / {title_abstract.agreements + title_abstract.disagreements} dual
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No dual reviews yet</p>
          )}
        </div>

        {/* Inter-Rater Agreement - Full Text */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">Full Text Agreement</h4>
          </div>
          {full_text.agreement_rate !== null ? (
            <>
              <p className="text-3xl font-bold text-gray-900">{full_text.agreement_rate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {full_text.agreements} agreed / {full_text.agreements + full_text.disagreements} dual
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No dual reviews yet</p>
          )}
        </div>

        {/* AI-Human Agreement */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">AI-Human Match</h4>
          </div>
          {ai_screening.ai_human_agreement_rate !== null ? (
            <>
              <p className="text-3xl font-bold text-gray-900">{ai_screening.ai_human_agreement_rate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {ai_screening.total_suggestions} AI suggestions made
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No AI suggestions yet</p>
          )}
        </div>

        {/* Conflicts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm">Conflicts</h4>
          </div>
          <p className="text-3xl font-bold text-gray-900">{conflicts_pending}</p>
          <p className="text-xs text-gray-500 mt-1">
            {conflicts_resolved} resolved
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Title & Abstract Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Title & Abstract Screening</h4>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Agreements
                </span>
                <span className="font-medium text-gray-900">{title_abstract.agreements}</span>
              </div>
              <Progress 
                value={title_abstract.agreements + title_abstract.disagreements > 0 
                  ? (title_abstract.agreements / (title_abstract.agreements + title_abstract.disagreements)) * 100 
                  : 0} 
                className="h-2 bg-gray-100"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Disagreements
                </span>
                <span className="font-medium text-gray-900">{title_abstract.disagreements}</span>
              </div>
              <Progress 
                value={title_abstract.agreements + title_abstract.disagreements > 0 
                  ? (title_abstract.disagreements / (title_abstract.agreements + title_abstract.disagreements)) * 100 
                  : 0} 
                className="h-2 bg-gray-100"
              />
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{title_abstract.single_reviewer}</span> studies with single reviewer
              </p>
            </div>
          </div>
        </div>

        {/* AI Screening Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Screening Suggestions
          </h4>
          
          {ai_screening.total_suggestions > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">{ai_screening.include}</p>
                  <p className="text-xs text-green-700">Include</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">{ai_screening.exclude}</p>
                  <p className="text-xs text-red-700">Exclude</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-amber-600">{ai_screening.maybe}</p>
                  <p className="text-xs text-amber-700">Maybe</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg. Confidence</span>
                  <span className="font-medium text-gray-900">
                    {(ai_screening.avg_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No AI suggestions yet</p>
              <p className="text-xs text-gray-400 mt-1">Use "Get AI Suggestion" in screening</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Stats */}
      {Object.keys(reviewer_stats).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Reviewer Statistics</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Reviewer</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Total</th>
                  <th className="text-right py-2 px-3 font-medium text-green-700">Include</th>
                  <th className="text-right py-2 px-3 font-medium text-red-700">Exclude</th>
                  <th className="text-right py-2 px-3 font-medium text-amber-700">Maybe</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Include Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reviewer_stats).map(([reviewerId, stats]) => (
                  <tr key={reviewerId} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-gray-900">{reviewerId}</td>
                    <td className="text-right py-2 px-3 text-gray-600">{stats.total}</td>
                    <td className="text-right py-2 px-3 text-green-600">{stats.include}</td>
                    <td className="text-right py-2 px-3 text-red-600">{stats.exclude}</td>
                    <td className="text-right py-2 px-3 text-amber-600">{stats.maybe}</td>
                    <td className="text-right py-2 px-3 text-gray-900 font-medium">
                      {stats.total > 0 ? ((stats.include / stats.total) * 100).toFixed(0) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h4 className="font-semibold text-blue-900 mb-2">About Agreement Metrics</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Inter-Rater Agreement:</strong> Percentage of studies where both reviewers made the same decision</li>
          <li>• <strong>AI-Human Match:</strong> How often AI suggestions aligned with human decisions</li>
          <li>• <strong>Conflicts:</strong> Disagreements requiring adjudication by a third reviewer</li>
        </ul>
      </div>
    </div>
  );
};

export default AgreementMetrics;
