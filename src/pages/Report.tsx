import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import VoiceRecorder from '@/components/VoiceRecorder';
import ImageUpload from '@/components/ImageUpload';
import { generateSummary, categorizeIssue, translateText } from '@/utils/aiHelpers';

const Report = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isCategorizingAI, setIsCategorizingAI] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [predictedCategory, setPredictedCategory] = useState('');
  const [predictedConfidence, setPredictedConfidence] = useState<number | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [isSOS, setIsSOS] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'te'>('en');

  const categories = [
    { id: '1', name: 'Roads', icon: '🛣️' },
    { id: '2', name: 'Water', icon: '💧' },
    { id: '3', name: 'Electricity', icon: '⚡' },
    { id: '4', name: 'Sanitation', icon: '🗑️' },
    { id: '5', name: 'Safety', icon: '🚨' },
    { id: '6', name: 'Other', icon: '📋' },
  ];

  const handleVoiceTranscript = (transcript: string) => {
    setDescription(transcript);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    toast.loading('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(position.coords.latitude);
        setLocationLng(position.coords.longitude);
        
        // Reverse geocoding placeholder
        // TODO: Implement reverse geocoding with Google Maps API or similar
        setLocationAddress(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        
        toast.success('Location captured');
      },
      (error) => {
        toast.error('Could not get location: ' + error.message);
      }
    );
  };

  const handleGenerateSummary = async () => {
    if (!description) {
      toast.error('Please add a description first');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const generatedSummary = await generateSummary(description);
      setSummary(generatedSummary);
      toast.success('Summary generated');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAICategorizaion = async () => {
    if (!title && !description && images.length === 0) {
      toast.error('Please provide title, description, or images');
      return;
    }

    setIsCategorizingAI(true);
    try {
      const result = await categorizeIssue(title, description, images);
      setPredictedCategory(result.category);
      setPredictedConfidence(result.confidence);
      
      // Auto-select the category if confidence is high
      if (result.confidence > 0.7) {
        const category = categories.find(c => c.name === result.category);
        if (category) {
          setCategoryId(category.id);
        }
      }
      
      toast.success(`AI suggests: ${result.category} (${(result.confidence * 100).toFixed(0)}% confident)`);
    } catch (error) {
      toast.error('AI categorization failed');
    } finally {
      setIsCategorizingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to report an issue');
      navigate('/auth');
      return;
    }

    if (!title || !description) {
      toast.error('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload images to Supabase Storage
      const mediaUrls: string[] = [];
      
      if (images.length > 0) {
        toast.loading('Uploading images...');
        
        for (const image of images) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('issue-images')
            .upload(fileName, image);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('issue-images')
            .getPublicUrl(fileName);

          mediaUrls.push(publicUrl);
        }
      }

      // Insert issue into database
      const issueData = {
        user_id: user.id,
        title,
        description,
        summary: summary || null,
        category_id: categoryId || null,
        category_text: predictedCategory || null,
        media_urls: mediaUrls,
        location_address: locationAddress || null,
        location_lat: locationLat,
        location_lng: locationLng,
        location_point: locationLat && locationLng 
          ? `POINT(${locationLng} ${locationLat})` 
          : null,
        predicted_category: predictedCategory || null,
        predicted_confidence: predictedConfidence,
        sos_flag: isSOS,
        severity_base: isSOS ? 5 : 3,
      };

      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert(issueData)
        .select()
        .single();

      if (issueError) throw issueError;

      // TODO: Auto-translate to Telugu and Hindi
      // const translations = await Promise.all([
      //   translateText(description, 'hi'),
      //   translateText(description, 'te')
      // ]);

      // If SOS, create SOS alert
      if (isSOS) {
        await supabase.from('sos_alerts').insert({
          user_id: user.id,
          issue_id: issue.id,
          description: title,
          severity: 5,
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: locationAddress,
        });
      }

      toast.success('Issue reported successfully!');
      
      // Confetti animation on success
      // TODO: Add confetti library
      
      navigate(`/issue/${issue.id}`);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-heading font-bold mb-2">Report an Issue</h1>
          <p className="text-muted-foreground">
            Help improve your community by reporting civic issues
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card glass-card-dark">
            <CardHeader>
              <CardTitle>Report Form</CardTitle>
              <CardDescription>
                Use voice input, upload images, and let AI help categorize your issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Language Selection */}
                <div>
                  <Label>Language</Label>
                  <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                      <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Issue Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title of the issue"
                    required
                  />
                </div>

                {/* Description with Voice Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="description">Description *</Label>
                    <VoiceRecorder 
                      onTranscriptChange={handleVoiceTranscript}
                      language={language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'te-IN'}
                    />
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={6}
                    required
                  />
                </div>

                {/* AI Summary Generation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="summary">Summary (optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                    >
                      {isGeneratingSummary ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Short summary for feed preview"
                    rows={2}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Images (optional)</Label>
                  <ImageUpload onImagesChange={setImages} />
                </div>

                {/* AI Categorization */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Category</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAICategorizaion}
                      disabled={isCategorizingAI}
                    >
                      {isCategorizingAI ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI Suggest
                    </Button>
                  </div>
                  
                  {predictedCategory && predictedConfidence && (
                    <div className="mb-2 p-2 bg-primary/10 rounded-lg text-sm">
                      AI suggests: <strong>{predictedCategory}</strong> ({(predictedConfidence * 100).toFixed(0)}% confidence)
                    </div>
                  )}
                  
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Location (optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetLocation}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Get Current Location
                    </Button>
                  </div>
                  <Input
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Enter location or use GPS"
                  />
                </div>

                {/* SOS Flag */}
                <div className="flex items-center gap-2 p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
                  <input
                    type="checkbox"
                    id="sos"
                    checked={isSOS}
                    onChange={(e) => setIsSOS(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="sos" className="flex items-center gap-2 cursor-pointer">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span>This is an emergency (SOS)</span>
                  </Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full btn-glow"
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Report;
