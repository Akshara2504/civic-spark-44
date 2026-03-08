import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, ThumbsUp, MessageCircle, AlertTriangle } from 'lucide-react';

const Feed = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchIssues();

    const channel = supabase
      .channel('feed-issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => fetchIssues())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, categoryFilter]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data || []);
  };

  const fetchIssues = async () => {
    setLoading(true);
    let query = supabase
      .from('issues')
      .select(`*, profiles:user_id (name), categories (name, icon)`)
      .order('sos_flag', { ascending: false })
      .order('severity_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as Database['public']['Enums']['issue_status']);
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category_id', categoryFilter);
    }

    const { data } = await query;
    setIssues(data || []);
    setLoading(false);
  };

  const filtered = issues.filter(issue =>
    !search || issue.title?.toLowerCase().includes(search.toLowerCase()) ||
    issue.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Reported: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      'In Progress': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      Resolved: 'bg-green-500/20 text-green-700 border-green-500/30',
      Closed: 'bg-muted text-muted-foreground',
      Escalated: 'bg-red-500/20 text-red-700 border-red-500/30',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold mb-2">Community Feed</h1>
            <p className="text-muted-foreground">See what's happening in your community</p>
          </div>
          <Link to="/report">
            <Button className="font-button bg-gradient-to-r from-primary to-secondary">
              <Plus className="w-4 h-4 mr-2" /> Report Issue
            </Button>
          </Link>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Reported">Reported</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Escalated">Escalated</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Issues List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card glass-card-dark p-12 text-center">
            <h2 className="text-2xl font-heading font-semibold mb-4">No Issues Found</h2>
            <p className="text-muted-foreground mb-6">
              {search ? 'No issues match your search.' : 'Be the first to report an issue!'}
            </p>
            <Link to="/report">
              <Button variant="outline" className="font-button">Report Your First Issue</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((issue, i) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/issue/${issue.id}`}>
                  <Card className={`glass-card glass-card-dark hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full ${
                    issue.sos_flag ? 'ring-2 ring-destructive/60 border-destructive/40' : ''
                  }`}>
                    <CardContent className="p-4">
                      {/* Media preview */}
                      {issue.media_urls && issue.media_urls.length > 0 && (
                        <img
                          src={issue.media_urls[0]}
                          alt={issue.title}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                          loading="lazy"
                        />
                      )}

                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getStatusBadge(issue.status)}>{issue.status}</Badge>
                        {issue.categories?.name && <Badge variant="outline">{issue.categories.name}</Badge>}
                        {issue.sos_flag && (
                          <Badge variant="destructive" className="animate-heartbeat">
                            <AlertTriangle className="w-3 h-3 mr-1" /> SOS
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">{issue.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {issue.summary || issue.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span>{issue.profiles?.name || 'Anonymous'}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" /> {issue.upvotes_count || 0}
                          </span>
                          {issue.location_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
