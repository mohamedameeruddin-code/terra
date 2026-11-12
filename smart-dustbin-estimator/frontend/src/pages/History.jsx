import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import StatusPill from '../components/StatusPill';
import { getHistory, deleteHistoryRecord } from '../api/client';

const History = () => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistory(search, statusFilter);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadHistory();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this scan record and its images?')) {
      try {
        await deleteHistoryRecord(id);
        loadHistory();
      } catch (err) {
        alert('Failed to delete record: ' + err.message);
      }
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/export/csv', '_blank');
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '4px' }}>Analysis Audit History</h1>
          <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
            Complete audit trail of processed images, calculated fill levels, and downloadable PDF reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownloadCsv} className="btn btn-ghost btn-sm">
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
          <button onClick={loadHistory} className="btn btn-ghost btn-sm">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="chamfer-card"
        style={{
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: 'var(--soil-950)',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by image filename, notes, or recommendation..."
            className="input"
            style={{ fontSize: '13px' }}
          />
          <button type="submit" className="btn btn-ghost btn-sm">
            <Search size={14} />
          </button>
        </form>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'Empty', 'Low', 'Medium', 'High', 'Critical'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11px' }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Thumbnail</th>
              <th>Image File</th>
              <th>Fill Level</th>
              <th>Classification</th>
              <th>Confidence</th>
              <th>Recommendation</th>
              <th>Date & Time</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>
                  <img
                    src={r.processed_image_url || r.original_image_url}
                    alt="Scan thumbnail"
                    style={{
                      width: '44px',
                      height: '44px',
                      objectFit: 'cover',
                      borderRadius: '2px',
                      border: '1px solid var(--line)',
                    }}
                  />
                </td>
                <td>
                  <strong style={{ color: 'var(--bone)', fontSize: '14px' }}>
                    {r.image_name}
                  </strong>
                  {r.notes && (
                    <div style={{ fontSize: '12px', color: 'var(--lichen)' }}>
                      {r.notes}
                    </div>
                  )}
                </td>
                <td>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--bone)' }}>
                    {r.fill_percentage?.toFixed(1)}%
                  </span>
                </td>
                <td>
                  <StatusPill status={r.fill_status} />
                </td>
                <td>
                  <span className="mono" style={{ color: 'var(--sprout)' }}>
                    {r.confidence_score?.toFixed(0)}%
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--lichen)', maxWidth: '240px' }}>
                  {r.recommendation}
                </td>
                <td className="mono" style={{ fontSize: '12px', color: 'var(--lichen)' }}>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    <button
                      onClick={() => window.open(`/api/export/${r.id}`, '_blank')}
                      className="btn btn-ghost btn-sm"
                      title="Download PDF Report"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => setSelectedRecord(r)}
                      className="btn btn-ghost btn-sm"
                      title="View Full Resolution"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--ember)', borderColor: 'transparent' }}
                      title="Delete Record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for full resolution inspect */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(10, 15, 12, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="chamfer-card"
            style={{
              maxWidth: '800px',
              width: '100%',
              backgroundColor: 'var(--soil-900)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px' }}>{selectedRecord.image_name}</h2>
                <div style={{ fontSize: '12px', color: 'var(--lichen)' }}>
                  Analyzed {new Date(selectedRecord.created_at).toLocaleString()}
                </div>
              </div>
              <StatusPill status={selectedRecord.fill_status} />
            </div>

            <div style={{ textAlign: 'center', background: 'var(--soil-950)', borderRadius: '2px', padding: '12px', marginBottom: '16px' }}>
              <img
                src={selectedRecord.processed_image_url || selectedRecord.original_image_url}
                alt="Enlarged"
                style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--bone)' }}>
                  {selectedRecord.fill_percentage?.toFixed(1)}% Fill
                </span>
                <span style={{ fontSize: '13px', color: 'var(--lichen)', marginLeft: '12px' }}>
                  Confidence: {selectedRecord.confidence_score?.toFixed(0)}%
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.open(`/api/export/${selectedRecord.id}`, '_blank')}
                  className="btn btn-primary btn-sm"
                >
                  <Download size={14} />
                  <span>Download PDF Report</span>
                </button>
                <button onClick={() => setSelectedRecord(null)} className="btn btn-ghost btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;

