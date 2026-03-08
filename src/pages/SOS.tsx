import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertTriangle, MapPin, Loader2, Phone } from 'lucide-react';

const SOS = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        setLocationAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setGettingLocation(false);
        toast.success('Location captured');
      },
      (err) => {
        toast.error('Location error: ' + err.message);
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }
    if (!description.trim()) {
      toast.error('Please describe the emergency');
      return;
    }

    setSubmitting(true);
    try {
      // Create issue with SOS flag
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert([{
          user_id: user.id,
          title: `🚨 SOS: ${description.substring(0, 50)}`,
          description,
          sos_flag: true,
          severity_base: 5,
          severity_score: 100,
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: locationAddress,
          status: 'Reported' as const,
        }])
        .select()
        .single();

      if (issueError) throw issueError;

      // Create SOS alert
      await supabase.from('sos_alerts').insert({
        user_id: user.id,
        issue_id: issue.id,
        description,
        severity: 5,
        location_lat: locationLat,
        location_lng: locationLng,
        location_address: locationAddress,
      });

      toast.success('SOS Alert sent! Authorities have been notified.');
      navigate(`/issue/${issue.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to send SOS: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <Card className="border-2 border-destructive/50 shadow-lg shadow-destructive/20">
            <CardHeader className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4"
              >
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </motion.div>
              <CardTitle className="text-3xl font-heading text-destructive">Emergency SOS</CardTitle>
              <CardDescription>
                Send an immediate alert to authorities. Use only for real emergencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the emergency situation..."
                rows={4}
                className="border-destructive/30 focus:border-destructive"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  {locationAddress || 'Share Location'}
                </Button>
              </div>

              <Button
                className="w-full h-14 text-lg bg-destructive hover:bg-destructive/90 animate-heartbeat"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2" />
                )}
                {submitting ? 'Sending Alert...' : 'SEND SOS ALERT'}
              </Button>

              <div className="text-center text-sm text-muted-foreground mt-4">
                <p className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  For life-threatening emergencies, also call 112
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SOS;
