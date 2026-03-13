import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Shield } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'Citizen' | 'Authority'>('Citizen');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const { signIn, signUp, user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (user && profile) {
      switch (profile.role) {
        case 'Admin':
          navigate('/settings');
          break;
        case 'HigherOfficial':
          navigate('/executive-dashboard');
          break;
        case 'Official':
          navigate('/dashboard');
          break;
        default:
          navigate('/feed');
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
      } else {
        await signUp(formData.email, formData.password, formData.name);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isAuthority = role === 'Authority';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-lavender/10 -z-10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className={`glass-card glass-card-dark shadow-glow ${isAuthority ? 'ring-2 ring-primary/40' : ''}`}>
          <CardHeader className="space-y-1">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={!isAuthority ? 'default' : 'outline'}
                className={`flex-1 font-button ${!isAuthority ? 'bg-gradient-to-r from-primary to-secondary' : ''}`}
                onClick={() => setRole('Citizen')}
              >
                <Users className="w-4 h-4 mr-2" />
                {t('auth.citizen')}
              </Button>
              <Button
                type="button"
                variant={isAuthority ? 'default' : 'outline'}
                className={`flex-1 font-button ${isAuthority ? 'bg-gradient-to-r from-primary to-secondary' : ''}`}
                onClick={() => setRole('Authority')}
              >
                <Shield className="w-4 h-4 mr-2" />
                {t('auth.authority')}
              </Button>
            </div>

            <CardTitle className="text-3xl font-heading font-bold text-center">
              {isLogin 
                ? (isAuthority ? t('auth.authorityLogin') : t('auth.welcomeBack')) 
                : t('auth.createAccount')}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? (isAuthority ? t('auth.authorityDesc') : t('auth.signInDesc'))
                : t('auth.joinDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.fullName')}</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">
                  {isAuthority ? t('auth.officialEmail') : t('auth.email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={isAuthority ? 'official@gov.in' : 'you@example.com'}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full font-button bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.pleaseWait')}
                  </>
                ) : (
                  isLogin 
                    ? (isAuthority ? t('auth.signInAsAuthority') : t('auth.signIn')) 
                    : t('auth.createAccount')
                )}
              </Button>
            </form>

            {isAuthority && isLogin && (
              <p className="mt-4 text-xs text-center text-muted-foreground">
                {t('auth.authorityNote')}
              </p>
            )}

            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
                disabled={loading}
              >
                {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
