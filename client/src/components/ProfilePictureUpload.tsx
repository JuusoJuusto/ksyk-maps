import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Camera, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfilePictureUploadProps {
  currentUser: any;
  onUploadComplete?: (imageUrl: string) => void;
}

export default function ProfilePictureUpload({ currentUser, onUploadComplete }: ProfilePictureUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(
    localStorage.getItem(`profile_picture_${currentUser?.id}`) || null
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Virheellinen tiedostotyyppi",
        description: "Valitse kuvatiedosto (JPG, PNG, GIF).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Tiedosto liian suuri",
        description: "Kuvan maksimikoko on 5 MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;

    setUploading(true);

    try {
      // In a real implementation, this would upload to a server
      // For now, we'll store in localStorage
      localStorage.setItem(`profile_picture_${currentUser.id}`, preview);
      setCurrentImage(preview);
      setPreview(null);

      // TODO: Upload to backend
      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('userId', currentUser.id);
      // const response = await fetch('/api/wilma/upload-profile-picture', {
      //   method: 'POST',
      //   body: formData
      // });

      toast({
        title: "Profiilikuva päivitetty",
        description: "Profiilikuvasi on tallennettu onnistuneesti.",
      });

      if (onUploadComplete) {
        onUploadComplete(preview);
      }
    } catch (error) {
      toast({
        title: "Virhe",
        description: "Profiilikuvan tallennus epäonnistui.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem(`profile_picture_${currentUser.id}`);
    setCurrentImage(null);
    setPreview(null);

    toast({
      title: "Profiilikuva poistettu",
      description: "Profiilikuvasi on poistettu.",
    });
  };

  const handleCancel = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-[#003d82] transition-colors">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Current/Preview Image */}
          <div className="relative">
            {preview || currentImage ? (
              <div className="relative">
                <img
                  src={preview || currentImage || ''}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-[#003d82] shadow-lg"
                />
                {!preview && currentImage && (
                  <button
                    onClick={handleRemove}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#003d82] to-[#0052a3] flex items-center justify-center text-white shadow-lg">
                <User className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Upload Controls */}
          {preview ? (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Tallennetaan...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Tallenna kuva
                  </>
                )}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={uploading}
              >
                Peruuta
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-[#003d82] text-[#003d82] hover:bg-[#003d82] hover:text-white"
              >
                <Camera className="w-4 h-4 mr-2" />
                {currentImage ? 'Vaihda kuva' : 'Lisää profiilikuva'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                JPG, PNG tai GIF. Maksimikoko 5 MB.
              </p>
            </div>
          )}

          {/* Info */}
          {!preview && !currentImage && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Lisää profiilikuva personoidaksesi tilisi
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
