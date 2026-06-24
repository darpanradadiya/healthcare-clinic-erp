import { useEffect, useState } from 'react';
import initSqlJs from 'sql.js';

export function useDatabase() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadDb() {
      try {
        const wasmResponse = await fetch('/sql-wasm.wasm', { cache: 'no-store' });
        if (!wasmResponse.ok) {
          throw new Error(`Failed to fetch sql-wasm.wasm: ${wasmResponse.statusText}`);
        }
        const wasmBinary = await wasmResponse.arrayBuffer();
        const SQL = await initSqlJs({ wasmBinary });

        const res = await fetch('/clinic_erp.db', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to fetch clinic_erp.db: ${res.statusText}`);
        }
        const buf = await res.arrayBuffer();
        if (active) {
          const database = new SQL.Database(new Uint8Array(buf));
          setDb(database);
        }
      } catch (err) {
        console.error('Failed to load SQLite database:', err);
        if (active) {
          setError(err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadDb();
    return () => {
      active = false;
    };
  }, []);

  return { db, loading, error };
}

export function runQuery(db, sql) {
  if (!db) return [];
  try {
    const res = db.exec(sql);
    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  } catch (err) {
    console.error('SQL query execution failed:', sql, err);
    return [];
  }
}
