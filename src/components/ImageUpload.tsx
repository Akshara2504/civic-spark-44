import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ImageUpload = ({ onImagesChange, maxImages = 5 }: ImageUploadProps) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';

    if (files.length + selectedFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setIsChecking(true);
    const checkingId = toast.loading('Verifying images are authentic...');

    const accepted: File[] = [];
    const acceptedPreviews: string[] = [];

    try {
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) continue;

        const base64 = await fileToBase64(file);

        const { data, error } = await supabase.functions.invoke('ai-image-check', {
          body: { imageBase64: base64 },
        });

        if (error) {
          console.error('image check failed', error);
          // fail-open
          accepted.push(file);
          acceptedPreviews.push(base64);
          continue;
        }

        if (data?.is_ai_generated && data.confidence >= 0.7) {
          toast.error(
            `"${file.name}" appears to be AI-generated (${Math.round(data.confidence * 100)}% confidence). Please upload a real photo.`,
            { duration: 7000 }
          );
          continue;
        }

        accepted.push(file);
        acceptedPreviews.push(base64);
      }

      if (accepted.length > 0) {
        const newFiles = [...files, ...accepted];
        setFiles(newFiles);
        setPreviews([...previews, ...acceptedPreviews]);
        onImagesChange(newFiles);
        toast.success(`${accepted.length} image(s) verified and added`, { id: checkingId });
      } else {
        toast.dismiss(checkingId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Image verification failed', { id: checkingId });
    } finally {
      setIsChecking(false);
    }
  };

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    const newFiles = files.filter((_, i) => i !== index);

    setPreviews(newPreviews);
    setFiles(newFiles);
    onImagesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= maxImages || isChecking}
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Images ({files.length}/{maxImages})
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Images are scanned by AI to detect synthetic/AI-generated content. Please upload genuine photos only.</span>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Upload images of the issue (optional)
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
