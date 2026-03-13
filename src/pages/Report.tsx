import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Sparkles, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import VoiceRecorder from '@/components/VoiceRecorder';
import ImageUpload from '@/components/ImageUpload';
import { generateSummary, categorizeIssue } from '@/utils/aiHelpers';

const Report = () => {
  const { user } = useAuth();
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
  const [predictedReasoning, setPredictedReasoning] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi' | 'te'>('en');
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name, icon').order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

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
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAICategorization = async () => {
    if (!title && !description && images.length === 0) {
      toast.error('Please provide title, description, or images');
      return;
    }
    setIsCategorizingAI(true);
    try {
      const result = await categorizeIssue(title, description, images);
      setPredictedCategory(result.category);
      setPredictedConfidence(result.confidence);
      setPredictedReasoning(result.reasoning || '');
      // Auto-select the category if confidence is decent
      const category = categories.find(c => c.name === result.category);
      if (category) setCategoryId(category.id);
      toast.success(`AI suggests: ${result.category} (${(result.confidence * 100).toFixed(0)}% confident)`);
    } catch {
      toast.error('AI categorization failed');
    } finally {
      setIsCategorizingAI(false);
    }
  };

  const runAISOSCheck = async (mediaUrls: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-sos-check', {
        body: {
          title,
          description,
          locationAddress,
          locationLat,
          locationLng,
          mediaUrls,
        }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('AI SOS check error:', error);
      return {
        is_sos: false,
        severity_score: 2,
        severity_base: 1,
        reasoning: 'AI check unavailable',
        risk_factors: [],
        recommended_priority: 'normal',
      };
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
      // Upload images
      const mediaUrls: string[] = [];
      if (images.length > 0) {
        toast.loading('Uploading images...');
        for (const image of images) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('issue-images')
            .upload(fileName, image);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('issue-images')
            .getPublicUrl(fileName);
          mediaUrls.push(publicUrl);
        }
      }

      // Run AI emergency detection
      toast.loading('AI is analyzing emergency level...');
      const sosResult = await runAISOSCheck(mediaUrls);
      const isSOS = sosResult.is_sos === true;
      const severityScore = sosResult.severity_score || 3;
      const severityBase = sosResult.severity_base || 3;

      // Insert issue
      // Find the category name for category_text
      const selectedCategory = categories.find(c => c.id === categoryId);
      
      const issueData: Record<string, any> = {
        user_id: user.id,
        title,
        description,
        summary: summary || null,
        category_id: categoryId || null,
        category_text: selectedCategory?.name || predictedCategory || null,
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
        severity_base: severityBase,
        severity_score: severityScore,
      };

      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert(issueData as any)
        .select()
        .single();
      if (issueError) throw issueError;

      // If AI flagged as SOS, create alert automatically
      if (isSOS) {
        await supabase.from('sos_alerts').insert({
          user_id: user.id,
          issue_id: issue.id,
          description: `[AI-DETECTED] ${title}`,
          severity: severityBase,
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: locationAddress,
        });
        toast.success(
          `🚨 AI detected this as an EMERGENCY (severity ${severityScore}/10): ${sosResult.reasoning}`,
          { duration: 8000 }
        );
      } else {
        toast.success('Issue reported successfully!');
      }

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

        {/* AI SOS Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-3"
        >
          <ShieldAlert className="w-6 h-6 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">AI Emergency Detection Active</p>
            <p className="text-xs text-muted-foreground mt-1">
              Our AI system automatically analyzes your report to detect emergencies based on description, images, location, and severity. Critical issues are auto-prioritized and routed to authorities immediately.
            </p>
          </div>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                      onClick={handleAICategorization}
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
                    <div className="mb-2 p-3 bg-primary/10 rounded-lg text-sm border border-primary/20">
                      <p>AI suggests: <strong>{predictedCategory}</strong> ({(predictedConfidence * 100).toFixed(0)}% confidence)</p>
                      {predictedReasoning && <p className="text-xs text-muted-foreground mt-1">{predictedReasoning}</p>}
                    </div>
                  )}
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Location (optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleGetLocation}>
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
                      Analyzing & Submitting...
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
