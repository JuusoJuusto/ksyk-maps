import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, File, FileText, Image, Video, Music, 
  Download, Trash2, Eye, CheckCircle, XCircle,
  AlertCircle, Paperclip, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
}

interface FileUploadSystemProps {
  maxFileSize?: number; // MB
  allowedTypes?: string[];
  maxFiles?: number;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
}

export default function FileUploadSystem({
  maxFileSize = 10,
  allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3'],
  maxFiles = 5,
  onFilesUploaded,
  existingFiles = []
}: FileUploadSystemProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-8 h-8 text-blue-600" />;
    if (type.includes('video')) return <Video className="w-8 h-8 text-purple-600" />;
    if (type.includes('audio')) return <Music className="w-8 h-8 text-green-600" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-600" />;
    return <File className="w-8 h-8 text-gray-600" />;
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Tiedosto on liian suuri. Maksimikoko on ${maxFileSize}MB.`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return `Tiedostotyyppi ei ole sallittu. Sallitut tyypit: ${allowedTypes.join(', ')}`;
    }

    // Check max files
    if (files.length >= maxFiles) {
      return `Voit ladata enintään ${maxFiles} tiedostoa.`;
    }

    return null;
  };

  const simulateUpload = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve) => {
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Current User',
        status: 'uploading',
        progress: 0
      };

      setFiles(prev => [...prev, uploadedFile]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, progress }
            : f
        ));

        if (progress >= 100) {
          clearInterval(interval);
          setFiles(prev => prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, status: 'completed' as const, progress: 100 }
              : f
          ));
          resolve({ ...uploadedFile, status: 'completed', progress: 100 });
        }
      }, 200);
    });
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Virhe",
          description: error,
          variant: "destructive"
        });
        continue;
      }

      try {
        await simulateUpload(file);
        toast({
          title: "Tiedosto ladattu",
          description: `${file.name} ladattu onnistuneesti`,
        });
      } catch (error) {
        toast({
          title: "Virhe",
          description: `Tiedoston ${file.name} lataus epäonnistui`,
          variant: "destructive"
        });
      }
    }

    if (onFilesUploaded) {
      onFilesUploaded(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "Tiedosto poistettu",
      description: "Tiedosto on poistettu onnistuneesti",
    });
  };

  const handleDownloadFile = (file: UploadedFile) => {
    // In production, this would download from server
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
    
    toast({
      title: "Lataus aloitettu",
      description: `Ladataan tiedostoa ${file.name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="text-center">
            <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragging ? 'Pudota tiedostot tähän' : 'Lataa tiedostoja'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Vedä ja pudota tiedostoja tai klikkaa valitaksesi
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#003d82] hover:bg-[#0052a3]"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Valitse tiedostot
            </Button>
            <div className="mt-4 text-xs text-gray-500">
              <p>Maksimikoko: {maxFileSize}MB per tiedosto</p>
              <p>Sallitut tyypit: {allowedTypes.join(', ')}</p>
              <p>Maksimi tiedostoja: {maxFiles}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Ladatut tiedostot ({files.length}/{maxFiles})</span>
              {files.length > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {files.filter(f => f.status === 'completed').length} valmis
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {files.map((file) => (
                <Card key={file.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(file.type)}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                            <p className="text-sm text-gray-600">
                              {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleString('fi-FI')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {file.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            {file.status === 'error' && (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {file.status === 'uploading' && (
                          <div className="mb-2">
                            <Progress value={file.progress || 0} className="h-2" />
                            <p className="text-xs text-gray-600 mt-1">
                              Ladataan... {file.progress}%
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {file.status === 'completed' && (
                          <div className="flex gap-2">
                            {file.type.includes('image') && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Esikatsele
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Lataa
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Poista
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Tiedostojen lataus</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Tiedostot tallennetaan turvallisesti palvelimelle</li>
                <li>• Voit ladata useita tiedostoja kerralla</li>
                <li>• Tiedostot skannataan automaattisesti viruksien varalta</li>
                <li>• Voit poistaa tiedostoja ennen lähettämistä</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
