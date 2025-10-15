import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

const ImageUpload = ({ onImagesChange, maxImages = 5 }: ImageUploadProps) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Create previews
    const newPreviews: string[] = [];
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === selectedFiles.length) {
            setPreviews([...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    onImagesChange(newFiles);

    // TODO: Implement AI image enhancement (auto-crop, auto-contrast)
    // TODO: Run image classifier to get predicted_category and predicted_confidence
    // TODO: Generate alt text/caption using image captioning LLM
    
    toast.success(`${selectedFiles.length} image(s) added`);
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
          disabled={files.length >= maxImages}
        >
          <Upload className="w-4 h-4 mr-2" />
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
              {/* TODO: Show AI-generated caption/category here */}
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
