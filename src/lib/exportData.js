/**
 * Export data helpers for TERRA
 */

export function exportToJson(data, filename = 'terra-analyses.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function exportToCsv(analyses, filename = 'terra-analyses.csv') {
  if (!analyses || !analyses.length) return;

  const headers = ['ID', 'Date', 'Bin Label', 'Fill %', 'Status', 'Confidence', 'Notes', 'Duration (ms)'];
  const rows = analyses.map((a) => [
    `"${a.id}"`,
    `"${a.createdAt}"`,
    `"${(a.binLabel || '').replace(/"/g, '""')}"`,
    a.fillPct,
    `"${a.status}"`,
    a.confidence,
    `"${(a.notes || '').replace(/"/g, '""')}"`,
    a.durationMs || 0,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
