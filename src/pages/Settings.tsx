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
import { useTranslation } from '@/i18n/useTranslation';

import type { Database } from '@/integrations/supabase/types';

type LangCode = Database['public']['Enums']['language_code'];

const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [languagePref, setLanguagePref] = useState<LangCode>('en');

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
      toast.success(t('settings.saved'));
    } catch (error: any) {
      toast.error(t('settings.saveFailed') + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-heading font-bold mb-8">{t('settings.title')}</h1>

          <Card className="glass-card glass-card-dark mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('settings.profileInfo')}
              </CardTitle>
              <CardDescription>{t('settings.updateDetails')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">{t('settings.fullName')}</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">{t('settings.email')}</Label>
                <Input id="email" value={user?.email || ''} disabled className="opacity-60" />
              </div>
              <div>
                <Label htmlFor="phone">{t('settings.phone')}</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
              </div>
              <div>
                <Label>{t('settings.role')}</Label>
                <Input value={profile?.role || 'Citizen'} disabled className="opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card glass-card-dark mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('settings.preferences')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('settings.languagePref')}</Label>
                <Select value={languagePref} onValueChange={(val) => setLanguagePref(val as LangCode)}>
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
            {t('settings.saveChanges')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
