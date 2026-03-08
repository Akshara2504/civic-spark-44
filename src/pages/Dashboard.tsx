import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, AlertTriangle, Eye, ArrowUpDown,
  Filter, RefreshCw, MapPin, Calendar, UserCircle, Inbox
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type IssueStatus = Database['public']['Enums']['issue_status'];

interface Official {
  id: string;
  name: string;
  role: string | null;
  department_name: string | null;
  avatar_url: string | null;
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, reported: 0, in_progress: 0, resolved: 0 });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchData();
    const cleanup = setupRealtime();
    return cleanup;
  }, [user, profile, statusFilter]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('dashboard-issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch officials and issues in parallel
      const [officialsRes, issuesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, role, avatar_url, department_id, departments:department_id (name)')
          .in('role', ['Official', 'HigherOfficial', 'Admin']),
        (() => {
          let query = supabase
            .from('issues')
            .select(`*, profiles:user_id (name), categories (name, icon), assigned_profile:assigned_to (id, name, role)`)
            .order('sos_flag', { ascending: false })
            .order('severity_score', { ascending: false })
            .order('created_at', { ascending: false });
          if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter as IssueStatus);
          }
          return query;
        })()
      ]);

      if (officialsRes.error) throw officialsRes.error;
      if (issuesRes.error) throw issuesRes.error;

      const officialsList: Official[] = (officialsRes.data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        role: o.role,
        department_name: o.departments?.name || null,
        avatar_url: o.avatar_url,
      }));

      setOfficials(officialsList);
      setIssues(issuesRes.data || []);

      const all = issuesRes.data || [];
      setStats({
        total: all.length,
        reported: all.filter((i: any) => i.status === 'Reported').length,
        in_progress: all.filter((i: any) => i.status === 'In Progress').length,
        resolved: all.filter((i: any) => i.status === 'Resolved').length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ status: newStatus as IssueStatus, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAssignToOfficial = async (issueId: string, officialId: string) => {
    try {
      const { error } = await supabase
        .from('issues')
        .update({ assigned_to: officialId, status: 'In Progress' as IssueStatus, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      toast.success('Issue assigned successfully');
      fetchData();
    } catch {
      toast.error('Failed to assign issue');
    }
  };

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

  const getIssuesForOfficial = (officialId: string) =>
    issues.filter((i) => i.assigned_to === officialId);

  const unassignedIssues = issues.filter((i) => !i.assigned_to);

  const statCards = [
    { label: 'Total Issues', value: stats.total, icon: Eye, color: 'from-primary to-primary-glow' },
    { label: 'Reported', value: stats.reported, icon: Clock, color: 'from-yellow-500 to-yellow-600' },
    { label: 'In Progress', value: stats.in_progress, icon: AlertTriangle, color: 'from-blue-500 to-blue-600' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'from-green-500 to-green-600' },
  ];

  const isOfficial = profile?.role && profile.role !== 'Citizen';

  const IssueCard = ({ issue, showAssign = false }: { issue: any; showAssign?: boolean }) => (
    <Card className={`glass-card glass-card-dark hover:shadow-lg transition-shadow ${
      issue.sos_flag ? 'ring-2 ring-destructive/60 border-destructive/40' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={getStatusBadge(issue.status)}>{issue.status}</Badge>
              {issue.categories?.name && <Badge variant="outline">{issue.categories.name}</Badge>}
              {issue.sos_flag && <Badge variant="destructive">SOS</Badge>}
              {issue.severity_score && <Badge variant="outline" className="text-xs">Severity: {issue.severity_score}</Badge>}
            </div>
            <Link to={`/issue/${issue.id}`}>
              <h3 className="font-semibold hover:text-primary transition-colors truncate">{issue.title}</h3>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{issue.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>By {issue.profiles?.name || 'Anonymous'}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(issue.created_at).toLocaleDateString()}</span>
              {issue.location_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{issue.location_address}</span>}
            </div>
          </div>
          {isOfficial && (
            <div className="flex flex-col gap-2 shrink-0">
              <Select value={issue.status} onValueChange={(val) => handleStatusChange(issue.id, val)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reported">Reported</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Escalated">Escalated</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              {showAssign && (
                <Select onValueChange={(val) => handleAssignToOfficial(issue.id, val)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {officials.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {issue.assigned_to === user?.id && (
                <Badge className="text-xs bg-primary/20 text-primary justify-center">Assigned to you</Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Official Dashboard</h1>
          <p className="text-muted-foreground">Issues grouped by assigned authority</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="glass-card glass-card-dark">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="Reported">Reported</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Escalated">Escalated</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Unassigned Issues */}
            {unassignedIssues.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Inbox className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-bold">Unassigned Issues</h2>
                    <p className="text-xs text-muted-foreground">{unassignedIssues.length} issue{unassignedIssues.length !== 1 ? 's' : ''} awaiting assignment</p>
                  </div>
                </div>
                <div className="space-y-3 ml-4 border-l-2 border-muted pl-4">
                  {unassignedIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} showAssign />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Officials with their assigned issues */}
            {officials.map((official) => {
              const officialIssues = getIssuesForOfficial(official.id);
              return (
                <motion.div key={official.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-heading font-bold">{official.name}</h2>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{official.role}</Badge>
                        {official.department_name && (
                          <span className="text-xs text-muted-foreground">{official.department_name}</span>
                        )}
                        <span className="text-xs text-muted-foreground">• {officialIssues.length} issue{officialIssues.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  {officialIssues.length > 0 ? (
                    <div className="space-y-3 ml-4 border-l-2 border-primary/30 pl-4">
                      {officialIssues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} />
                      ))}
                    </div>
                  ) : (
                    <div className="ml-4 border-l-2 border-primary/30 pl-4">
                      <p className="text-sm text-muted-foreground py-2">No issues assigned</p>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {issues.length === 0 && (
              <Card className="glass-card glass-card-dark p-12 text-center">
                <h2 className="text-xl font-semibold mb-2">No issues found</h2>
                <p className="text-muted-foreground">No issues match your current filters.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
