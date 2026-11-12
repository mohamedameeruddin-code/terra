import React, { useState, useEffect } from 'react';
import HistoryCard from '../components/HistoryCard';
import { getAnalyses, deleteAnalysis } from '../lib/db';
import { exportToCsv, exportToJson } from '../lib/exportData';
import { Search, Download, Trash2, Filter } from 'lucide-react';
import ResultModal from './Result';

export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedScan, setSelectedScan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAnalyses();
      setAnalyses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (confirm('Delete this scan and its saved image?')) {
      await deleteAnalysis(id);
      loadData();
    }
  };

  const filteredAnalyses = analyses.filter((a) => {
    const matchesSearch =
      (a.binLabel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Export Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>SCAN AUDIT HISTORY</h1>
          <p style={{ color: 'var(--lichen)', fontSize: '13px' }}>
            {analyses.length} saved inspection {analyses.length === 1 ? 'record' : 'records'} in IndexedDB
          </p>
        </div>

        {analyses.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => exportToCsv(analyses, 'terra-audit-export.csv')}
              style={{ minHeight: '38px', height: '38px', fontSize: '12px', padding: '0 12px' }}
            >
              <Download size={14} style={{ marginRight: '6px' }} />
              CSV
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => exportToJson(analyses, 'terra-audit-export.json')}
              style={{ minHeight: '38px', height: '38px', fontSize: '12px', padding: '0 12px' }}
            >
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="terra-card" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '12px' }}>
        <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
          <Search size={16} color="var(--lichen)" style={{ position: 'absolute', left: '12px', top: '15px' }} />
          <input
            type="text"
            className="terra-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bin label or notes..."
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {['ALL', 'OK', 'WARN', 'CRITICAL'].map((st) => (
            <button
              key={st}
              type="button"
              className={statusFilter === st ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setStatusFilter(st)}
              style={{ minHeight: '38px', height: '38px', fontSize: '11px', padding: '0 10px' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* List of Analyses */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--lichen)' }}>
          Loading records from device database...
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <div className="terra-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--lichen)' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--bone)', marginBottom: '8px' }}>
            No records found
          </div>
          <p style={{ fontSize: '13px' }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search or status filter.'
              : 'Perform your first vision AI analysis to populate history.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredAnalyses.map((item) => (
            <HistoryCard
              key={item.id}
              analysis={item}
              onSelect={(selected) => setSelectedScan(selected)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Scan Detail Modal if clicked */}
      {selectedScan && (
        <ResultModal
          result={{
            ...selectedScan,
            processedUrl: selectedScan.processedImage ? URL.createObjectURL(selectedScan.processedImage.blob) : null,
          }}
          onRetake={() => setSelectedScan(null)}
          onClose={() => setSelectedScan(null)}
        />
      )}
    </div>
  );
}
