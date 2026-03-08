import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { User, Calendar, MapPin, MessageCircle, ThumbsUp } from 'lucide-react';

const Profile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const profileId = id || user?.id;
  const [profileData, setProfileData] = useState<any>(null);
  const [userIssues, setUserIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      fetchProfile();
      fetchUserIssues();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    setProfileData(data);
  };

  const fetchUserIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select('*, categories (name)')
      .eq('user_id', profileId!)
      .order('created_at', { ascending: false })
      .limit(20);
    setUserIssues(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const isOwnProfile = user?.id === profileId;
  const resolvedCount = userIssues.filter(i => i.status === 'resolved').length;

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile Header */}
          <Card className="glass-card glass-card-dark mb-6">
            <CardContent className="p-8">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData?.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {profileData?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-heading font-bold">{profileData?.name || 'User'}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline">{profileData?.role || 'Citizen'}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(profileData?.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{userIssues.length}</p>
                  <p className="text-sm text-muted-foreground">Issues Reported</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{resolvedCount}</p>
                  <p className="text-sm text-muted-foreground">Issues Resolved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {userIssues.reduce((sum, i) => sum + (i.upvotes_count || 0), 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Upvotes Received</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Issues */}
          <Card className="glass-card glass-card-dark">
            <CardHeader>
              <CardTitle>{isOwnProfile ? 'Your Issues' : 'Issues by this user'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userIssues.map(issue => (
                  <Link key={issue.id} to={`/issue/${issue.id}`}>
                    <div className="p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{issue.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {issue.categories?.name} • {new Date(issue.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={
                          issue.status === 'resolved' ? 'bg-green-500/20 text-green-700' :
                          issue.status === 'in_progress' ? 'bg-blue-500/20 text-blue-700' :
                          'bg-yellow-500/20 text-yellow-700'
                        }>
                          {issue.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
                {userIssues.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No issues reported yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
