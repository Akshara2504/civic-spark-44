import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, User, Globe } from 'lucide-react';

const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [languagePref, setLanguagePref] = useState('en');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setLanguagePref(profile.language_pref || 'en');
    }
  }, [user, profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          language_pref: languagePref,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-heading font-bold mb-8">Settings</h1>

          <Card className="glass-card glass-card-dark mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled className="opacity-60" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={profile?.role || 'Citizen'} disabled className="opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card glass-card-dark mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Language Preference</Label>
                <Select value={languagePref} onValueChange={setLanguagePref}>
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
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
