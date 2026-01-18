import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugBuildings() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawResponse, setRawResponse] = useState<string>('');

  useEffect(() => {
    async function fetchBuildings() {
      try {
        console.log('🔍 Fetching buildings from /api/buildings...');
        const response = await fetch('/api/buildings');
        
        const text = await response.text();
        setRawResponse(text);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response text:', text);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = JSON.parse(text);
        console.log('✅ Parsed buildings:', data);
        setBuildings(data);
      } catch (err: any) {
        console.error('❌ Error fetching buildings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBuildings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔍 Buildings Debug Page</h1>
        
        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-blue-600">⏳ Loading...</p>}
            {error && <p className="text-red-600">❌ Error: {error}</p>}
            {!loading && !error && (
              <p className="text-green-600">✅ Successfully loaded {buildings.length} buildings</p>
            )}
          </CardContent>
        </Card>

        {/* Raw Response Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Raw API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs">
              {rawResponse || 'No response yet...'}
            </pre>
          </CardContent>
        </Card>

        {/* Buildings List */}
        <Card>
          <CardHeader>
            <CardTitle>Buildings Data ({buildings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {buildings.length === 0 ? (
              <p className="text-gray-500">No buildings found</p>
            ) : (
              <div className="space-y-4">
                {buildings.map((building, index) => (
                  <div key={building.id || index} className="border-l-4 border-blue-500 pl-4 py-2 bg-white rounded">
                    <h3 className="font-bold text-xl">{building.name}</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div><strong>ID:</strong> {building.id}</div>
                      <div><strong>Floors:</strong> {building.floors}</div>
                      <div><strong>Position X:</strong> {building.mapPositionX ?? 'null'}</div>
                      <div><strong>Position Y:</strong> {building.mapPositionY ?? 'null'}</div>
                      <div><strong>Color:</strong> <span style={{ backgroundColor: building.colorCode, padding: '2px 8px', borderRadius: '4px', color: 'white' }}>{building.colorCode}</span></div>
                      <div><strong>Active:</strong> {building.isActive ? '✅' : '❌'}</div>
                    </div>
                    {building.description && (
                      <div className="mt-2">
                        <strong>Description:</strong>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {building.description}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Environment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Current URL:</strong> {window.location.href}</div>
              <div><strong>API Endpoint:</strong> /api/buildings</div>
              <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
