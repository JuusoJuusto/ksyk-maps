import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Download, Share2 } from 'lucide-react';

export function QRCodeGenerator() {
  const [roomCode, setRoomCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const generateQRCode = async () => {
    if (!roomCode) return;
    
    // Generate QR code URL using a free service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`KSYK-${roomCode}`)}`;
    setQrCodeUrl(qrUrl);
  };

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return;
    
    const response = await fetch(qrCodeUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSYK-Room-${roomCode}-QR.png`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `KSYK Room ${roomCode} QR Code`,
          text: `Navigate to room ${roomCode} at KSYK`,
          url: qrCodeUrl
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Room Number</label>
          <Input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room number (e.g., M12)"
            className="text-center text-lg font-mono"
          />
        </div>
        
        <Button 
          onClick={generateQRCode}
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={!roomCode}
        >
          Generate QR Code
        </Button>
        
        {qrCodeUrl && (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img 
                src={qrCodeUrl} 
                alt={`QR Code for room ${roomCode}`}
                className="w-48 h-48"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={downloadQRCode}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button 
                onClick={shareQRCode}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}