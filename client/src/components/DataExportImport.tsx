import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  FileText, 
  Database,
  CheckCircle,
  AlertCircle,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';

export function DataExportImport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastExport, setLastExport] = useState<Date | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const exportFormats = [
    { 
      name: 'JSON', 
      extension: '.json', 
      icon: FileJson, 
      description: 'Complete data structure' 
    },
    { 
      name: 'CSV', 
      extension: '.csv', 
      icon: FileSpreadsheet, 
      description: 'Spreadsheet format' 
    },
    { 
      name: 'XML', 
      extension: '.xml', 
      icon: FileText, 
      description: 'XML data format' 
    }
  ];

  const exportData = async (format: string) => {
    setIsExporting(true);
    
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = {
        buildings: [
          { id: 1, name: 'M', nameEn: 'Music Building', floors: 3 },
          { id: 2, name: 'K', nameEn: 'Classroom Building', floors: 3 },
          { id: 3, name: 'L', nameEn: 'Library', floors: 2 }
        ],
        rooms: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          roomNumber: `M${i + 10}`,
          name: `Room ${i + 1}`,
          floor: Math.floor(i / 7) + 1,
          capacity: Math.floor(Math.random() * 30) + 10
        })),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      let content = '';
      let filename = '';
      let mimeType = '';

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(mockData, null, 2);
          filename = `ksyk-data-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          const csvRooms = mockData.rooms.map(room => 
            `${room.id},${room.roomNumber},${room.name},${room.floor},${room.capacity}`
          ).join('\n');
          content = `ID,Room Number,Name,Floor,Capacity\n${csvRooms}`;
          filename = `ksyk-rooms-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'xml':
          content = `<?xml version="1.0" encoding="UTF-8"?>
<ksyk-data>
  <export-date>${mockData.exportDate}</export-date>
  <buildings>
    ${mockData.buildings.map(b => `<building id="${b.id}"><name>${b.name}</name><nameEn>${b.nameEn}</nameEn><floors>${b.floors}</floors></building>`).join('')}
  </buildings>
  <rooms>
    ${mockData.rooms.map(r => `<room id="${r.id}"><roomNumber>${r.roomNumber}</roomNumber><name>${r.name}</name><floor>${r.floor}</floor><capacity>${r.capacity}</capacity></room>`).join('')}
  </rooms>
</ksyk-data>`;
          filename = `ksyk-data-${new Date().toISOString().split('T')[0]}.xml`;
          mimeType = 'application/xml';
          break;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setLastExport(new Date());
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let data;
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parsing simulation
        const lines = text.split('\n').slice(1); // Skip header
        data = { rooms: lines.length - 1 }; // Count rows
      } else if (file.name.endsWith('.xml')) {
        // Simple XML validation
        data = text.includes('<ksyk-data>') ? { valid: true } : { valid: false };
      }

      if (data) {
        setImportResult(`Successfully imported ${file.name}. Processed ${data.rooms || data.buildings?.length || 'data'} records.`);
      } else {
        setImportResult('Import failed: Invalid file format or corrupted data.');
      }
    } catch (error) {
      setImportResult(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Data Export & Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Export Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {exportFormats.map((format) => (
              <div key={format.name} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <format.icon className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">{format.name}</span>
                  <Badge variant="secondary" className="text-xs">{format.extension}</Badge>
                </div>
                <p className="text-xs text-gray-600 mb-3">{format.description}</p>
                <Button
                  size="sm"
                  onClick={() => exportData(format.name)}
                  disabled={isExporting}
                  className="w-full"
                >
                  <Download className="w-3 h-3 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            ))}
          </div>
          
          {lastExport && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Last export: {lastExport.toLocaleString()}
            </div>
          )}
        </div>

        {/* Import Section */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-sm">Import Data</h4>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              Select a file to import campus data
            </p>
            <input
              type="file"
              accept=".json,.csv,.xml"
              onChange={handleFileImport}
              disabled={isImporting}
              className="hidden"
              id="file-import"
            />
            <label htmlFor="file-import">
              <Button
                variant="outline"
                disabled={isImporting}
                className="cursor-pointer"
                asChild
              >
                <span>
                  {isImporting ? 'Processing...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supports JSON, CSV, and XML formats
            </p>
          </div>
          
          {importResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${importResult.includes('Successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {importResult.includes('Successfully') ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{importResult}</span>
            </div>
          )}
        </div>

        {/* Data Statistics */}
        <div className="space-y-2 border-t pt-4">
          <h4 className="font-semibold text-sm">Current Data</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg text-blue-600">6</div>
              <div className="text-gray-600">Buildings</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg text-green-600">45</div>
              <div className="text-gray-600">Rooms</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg text-purple-600">12</div>
              <div className="text-gray-600">Staff</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-lg text-orange-600">3</div>
              <div className="text-gray-600">Floors</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}