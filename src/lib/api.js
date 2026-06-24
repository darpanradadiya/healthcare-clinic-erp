const BASE = '/api';

export async function apiGet(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) {
    const errText = await r.text();
    let errObj;
    try {
      errObj = JSON.parse(errText);
    } catch (e) {}
    throw new Error(errObj?.error || errText || `GET request failed with status ${r.status}`);
  }
  return r.json();
}

export async function apiPost(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text();
    let errObj;
    try {
      errObj = JSON.parse(errText);
    } catch (e) {}
    throw new Error(errObj?.error || errText || `POST request failed with status ${r.status}`);
  }
  return r.json();
}

export async function apiPut(path, body) {
  const r = await fetch(BASE + path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text();
    let errObj;
    try {
      errObj = JSON.parse(errText);
    } catch (e) {}
    throw new Error(errObj?.error || errText || `PUT request failed with status ${r.status}`);
  }
  return r.json();
}

export async function apiDelete(path) {
  const r = await fetch(BASE + path, {
    method: 'DELETE',
  });
  if (!r.ok) {
    const errText = await r.text();
    let errObj;
    try {
      errObj = JSON.parse(errText);
    } catch (e) {}
    throw new Error(errObj?.error || errText || `DELETE request failed with status ${r.status}`);
  }
  return r.json();
}

// Unified formatters
export function formatCurrency(num) {
  const parsed = parseFloat(num || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parsed);
}

export function formatDate(str) {
  if (!str) return '';
  const date = new Date(str);
  if (isNaN(date.getTime())) return str;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function formatDateTime(str) {
  if (!str) return '';
  // Convert standard sqlite space separated timestamp to iso format for standard javascript Date parsing
  const formattedStr = str.includes(' ') ? str.replace(' ', 'T') : str;
  const date = new Date(formattedStr);
  if (isNaN(date.getTime())) return str;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function exportToCsv(filename, headers, data, keyMap) {
  if (!data || data.length === 0) return;
  
  const csvRows = [];
  // Add headers row
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
  
  // Add data rows
  for (const row of data) {
    const values = keyMap.map(key => {
      const val = typeof key === 'function' ? key(row) : row[key];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
