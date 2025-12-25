'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import Papa from 'papaparse';
import type { ImportResult } from '@/lib/types';

interface CSVRow {
  name?: string;
  address?: string;
  [key: string]: string | undefined;
}

export default function ImportClientsPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const csvRows = results.data as CSVRow[];

            const clientsToImport = csvRows
              .filter(row => row.name && row.address)
              .map(row => ({
                name: row.name!.trim(),
                address: row.address!.trim(),
              }));

            if (clientsToImport.length === 0) {
              toast.error('No valid rows found in CSV');
              setUploading(false);
              return;
            }

            const response = await fetch('/api/clients/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                clients: clientsToImport,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Import failed');
            }

            const data: ImportResult = await response.json();
            setResult(data);

            if (data.imported > 0) {
              toast.success(`Successfully imported ${data.imported} client(s)`);
            }

            if (data.failed.length > 0) {
              toast.error(`Failed to import ${data.failed.length} client(s)`);
            }
          } catch (error) {
            console.error('Import error:', error);
            toast.error(error instanceof Error ? error.message : 'Import failed');
          } finally {
            setUploading(false);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          toast.error('Failed to parse CSV file');
          setUploading(false);
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">Import Clients</h1>
        <Link href="/dashboard/clients" className="text-blue-600 hover:underline">
          Back to Clients
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">CSV Format</h2>
          <p className="text-gray-600 text-sm mb-4">
            Your CSV file must contain at least these columns: <code className="bg-gray-100 px-2 py-1 rounded">name</code> and <code className="bg-gray-100 px-2 py-1 rounded">address</code>
          </p>

          <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-4">
            <p className="text-xs font-mono text-gray-700">
              name,address<br />
              Acme Corp,15 Rue de la Paix 75002 Paris<br />
              Tech Solutions,42 Avenue des Champs-Élysées 75008 Paris
            </p>
          </div>

          <div className="flex items-center justify-center">
            <label className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span
                className={`px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <span className="text-gray-600">Uploading...</span>
                ) : (
                  <span className="text-gray-700">Click to select CSV file</span>
                )}
              </span>
            </label>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {result.imported > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                Successfully imported {result.imported} client(s)
              </h3>
              <ul className="text-sm text-green-800 space-y-1">
                {result.clients.map(client => (
                  <li key={client.id}>• {client.name} ({client.address})</li>
                ))}
              </ul>
            </div>
          )}

          {result.failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">
                Failed to import {result.failed.length} client(s)
              </h3>
              <ul className="text-sm text-red-800 space-y-1">
                {result.failed.map((item, index) => (
                  <li key={index}>
                    • {item.name} ({item.address}): {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href="/dashboard/clients"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View All Clients
            </Link>
            <button
              onClick={() => {
                setResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
