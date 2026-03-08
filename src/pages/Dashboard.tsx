import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Filter, RefreshCw, MapPin, Calendar, UserCircle, Inbox,
  ChevronRight, Building2, Droplets, Zap, Trash2, Shield,
  TreePine, HeartPulse, HelpCircle, Car
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type IssueStatus = Database['public']['Enums']['issue_status'];

interface Official {
  id: string;
  name: string;
  role: string | null;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

const DEPT_ICONS: Record<string, any> = {
  'Roads & Transport Dept': Car,
  'Water & Drainage Dept': Droplets,
  'Electricity Dept': Zap,
  'Waste Management Dept': Trash2,
  'Public Safety Dept': Shield,
  'Parks & Recreation Dept': TreePine,
  'Health & Sanitation Dept': HeartPulse,
  'General Services Dept': HelpCircle,
};

const DEPT_COLORS: Record<string, string> = {
  'Roads & Transport Dept': 'from-amber-500 to-orange-600',
  'Water & Drainage Dept': 'from-blue-500 to-cyan-600',
  'Electricity Dept': 'from-yellow-400 to-yellow-600',
  'Waste Management Dept': 'from-green-600 to-emerald-700',
  'Public Safety Dept': 'from-red-500 to-rose-600',
  'Parks & Recreation Dept': 'from-emerald-500 to-green-600',
  'Health & Sanitation Dept': 'from-pink-500 to-rose-500',
  'General Services Dept': 'from-slate-500 to-slate-600',
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, reported: 0, in_progress: 0, resolved: 0 });
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedOfficial, setExpandedOfficial] = useState<string | null>(null);

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
      const [deptsRes, officialsRes, issuesRes] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase
          .from('profiles')
          .select('id, name, role, department_id')
          .in('role', ['Official', 'HigherOfficial', 'Admin']),
        (() => {
          let query = supabase
            .from('issues')
            .select(`*, profiles:user_id (name), categories (name, icon, department_id), assigned_profile:assigned_to (id, name, role, department_id)`)
            .order('sos_flag', { ascending: false })
            .order('severity_score', { ascending: false })
            .order('created_at', { ascending: false });
          if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter as IssueStatus);
          }
          return query;
        })()
      ]);

      if (deptsRes.error) throw deptsRes.error;
      if (officialsRes.error) throw officialsRes.error;
      if (issuesRes.error) throw issuesRes.error;

      setDepartments(deptsRes.data || []);
      setOfficials(officialsRes.data || []);
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

  // Issues for a department: assigned to officials in that dept OR category maps to that dept
  const getIssuesForDept = (deptId: string) =>
    issues.filter((i) =>
      (i.assigned_profile?.department_id === deptId) ||
      (i.categories?.department_id === deptId)
    );

  const getIssuesForOfficial = (officialId: string) =>
    issues.filter((i) => i.assigned_to === officialId);

  const getOfficialsForDept = (deptId: string) =>
    officials.filter((o) => o.department_id === deptId);

  const unassignedIssues = issues.filter((i) => !i.assigned_to && !i.categories?.department_id);

  const isOfficialUser = profile?.role && profile.role !== 'Citizen';

  const statCards = [
    { label: 'Total Issues', value: stats.total, icon: Eye, color: 'from-primary to-primary-glow' },
    { label: 'Reported', value: stats.reported, icon: Clock, color: 'from-yellow-500 to-yellow-600' },
    { label: 'In Progress', value: stats.in_progress, icon: AlertTriangle, color: 'from-blue-500 to-blue-600' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'from-green-500 to-green-600' },
  ];

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Authorities Dashboard</h1>
          <p className="text-muted-foreground">Departments, their authorities, and assigned civic issues</p>
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
          <div className="space-y-4">
            {/* Department Cards */}
            {departments.map((dept, i) => {
              const deptOfficials = getOfficialsForDept(dept.id);
              const deptIssues = getIssuesForDept(dept.id);
              const DeptIcon = DEPT_ICONS[dept.name] || Building2;
              const deptColor = DEPT_COLORS[dept.name] || 'from-primary to-secondary';
              const isExpanded = expandedDept === dept.id;

              return (
                <motion.div key={dept.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card
                    className={`glass-card glass-card-dark cursor-pointer hover:shadow-lg transition-all ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
                    onClick={() => { setExpandedDept(isExpanded ? null : dept.id); setExpandedOfficial(null); }}
                  >
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${deptColor} flex items-center justify-center shadow-lg`}>
                          <DeptIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-heading font-bold">{dept.name}</h2>
                          <p className="text-xs text-muted-foreground">
                            {deptOfficials.length} official{deptOfficials.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${deptIssues.length > 0 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground'} text-sm px-3 py-1`}>
                          {deptIssues.length} issue{deptIssues.length !== 1 ? 's' : ''}
                        </Badge>
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </CardContent>
                  </Card>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-6 mt-3 space-y-3">
                          {deptOfficials.length > 0 ? (
                            deptOfficials.map((official) => {
                               const officialIssues = getIssuesForOfficial(official.id);
                               const isOfficialExpanded = expandedOfficial === official.id;
                               const hasUnresolved = officialIssues.some((i) => i.status !== 'Resolved' && i.status !== 'Closed');
                               const hasIssues = officialIssues.length > 0;
                               const allResolved = hasIssues && !hasUnresolved;
                               return (
                                 <div key={official.id}>
                                   <Card
                                     className={`glass-card cursor-pointer hover:shadow-md transition-all border-l-4 border-l-primary/50 ${isOfficialExpanded ? 'ring-1 ring-primary/20' : ''}`}
                                     onClick={(e) => { e.stopPropagation(); setExpandedOfficial(isOfficialExpanded ? null : official.id); }}
                                   >
                                     <CardContent className="p-4 flex items-center justify-between">
                                       <div className="flex items-center gap-3">
                                         <div className="relative">
                                           <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center">
                                             <UserCircle className="w-5 h-5 text-white" />
                                           </div>
                                           {/* Red blinking dot for unresolved issues */}
                                           {hasUnresolved && (
                                             <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                               <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-background"></span>
                                             </span>
                                           )}
                                           {/* Green blinking dot for all resolved */}
                                           {allResolved && (
                                             <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                               <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background"></span>
                                             </span>
                                           )}
                                         </div>
                                         <div>
                                           <h3 className="font-semibold">{official.name}</h3>
                                           <div className="flex items-center gap-2 mt-0.5">
                                             <Badge variant="outline" className="text-xs">{official.role}</Badge>
                                             {hasUnresolved && (
                                               <span className="text-[10px] text-red-500 font-medium">● Pending issues</span>
                                             )}
                                             {allResolved && (
                                               <span className="text-[10px] text-green-500 font-medium">● All resolved</span>
                                             )}
                                           </div>
                                         </div>
                                       </div>
                                       <div className="flex items-center gap-3">
                                         <Badge variant="secondary" className="text-xs px-2 py-1">
                                           {officialIssues.length} issue{officialIssues.length !== 1 ? 's' : ''}
                                         </Badge>
                                         <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOfficialExpanded ? 'rotate-90' : ''}`} />
                                       </div>
                                     </CardContent>
                                   </Card>

                                  <AnimatePresence>
                                    {isOfficialExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-primary/20 pl-4 pb-2">
                                          {officialIssues.length > 0 ? (
                                            officialIssues.map((issue) => (
                                              <IssueRow key={issue.id} issue={issue} getStatusBadge={getStatusBadge} isOfficialUser={isOfficialUser} onStatusChange={handleStatusChange} userId={user?.id} />
                                            ))
                                          ) : (
                                            <p className="text-sm text-muted-foreground py-3">No issues currently assigned to this official</p>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground border border-dashed border-muted rounded-lg text-center">
                              No officials assigned to this department yet
                            </div>
                          )}

                          {/* Show unassigned dept issues (routed by category but no official yet) */}
                          {(() => {
                            const unassignedDeptIssues = deptIssues.filter((i) => !i.assigned_to);
                            if (unassignedDeptIssues.length === 0) return null;
                            return (
                              <div className="mt-3">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                  <Inbox className="w-4 h-4" /> Unassigned in this department ({unassignedDeptIssues.length})
                                </h4>
                                <div className="space-y-2 border-l-2 border-muted pl-4">
                                  {unassignedDeptIssues.map((issue) => (
                                    <IssueRow
                                      key={issue.id}
                                      issue={issue}
                                      getStatusBadge={getStatusBadge}
                                      isOfficialUser={isOfficialUser}
                                      onStatusChange={handleStatusChange}
                                      showAssign
                                      officials={deptOfficials}
                                      onAssign={handleAssignToOfficial}
                                      userId={user?.id}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Fully unassigned (no dept match) */}
            {unassignedIssues.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="glass-card glass-card-dark cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setExpandedDept(expandedDept === '__unassigned' ? null : '__unassigned')}
                >
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Inbox className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h2 className="text-lg font-heading font-bold">Uncategorized Issues</h2>
                        <p className="text-xs text-muted-foreground">Not mapped to any department</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-sm px-3 py-1">
                        {unassignedIssues.length}
                      </Badge>
                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${expandedDept === '__unassigned' ? 'rotate-90' : ''}`} />
                    </div>
                  </CardContent>
                </Card>
                <AnimatePresence>
                  {expandedDept === '__unassigned' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 mt-3 space-y-2 border-l-2 border-muted pl-4">
                        {unassignedIssues.map((issue) => (
                          <IssueRow key={issue.id} issue={issue} getStatusBadge={getStatusBadge} isOfficialUser={isOfficialUser} onStatusChange={handleStatusChange} showAssign officials={officials} onAssign={handleAssignToOfficial} userId={user?.id} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {issues.length === 0 && departments.length === 0 && (
              <Card className="glass-card glass-card-dark p-12 text-center">
                <h2 className="text-xl font-semibold mb-2">No data found</h2>
                <p className="text-muted-foreground">No departments or issues to display.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const IssueRow = ({ issue, getStatusBadge, isOfficialUser, onStatusChange, showAssign, officials, onAssign, userId }: {
  issue: any;
  getStatusBadge: (s: string) => string;
  isOfficialUser: boolean | null | undefined;
  onStatusChange: (id: string, status: string) => void;
  showAssign?: boolean;
  officials?: { id: string; name: string }[];
  onAssign?: (issueId: string, officialId: string) => void;
  userId?: string;
}) => (
  <Card className={`glass-card hover:shadow-md transition-shadow ${issue.sos_flag ? 'ring-2 ring-destructive/60 border-destructive/40' : ''}`}>
    <CardContent className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`${getStatusBadge(issue.status)} text-xs`}>{issue.status}</Badge>
            {issue.categories?.name && <Badge variant="outline" className="text-xs">{issue.categories.name}</Badge>}
            {issue.sos_flag && <Badge variant="destructive" className="text-xs">SOS</Badge>}
            {issue.severity_score && <Badge variant="outline" className="text-[10px]">Sev: {issue.severity_score}</Badge>}
          </div>
          <Link to={`/issue/${issue.id}`} onClick={(e) => e.stopPropagation()}>
            <h4 className="font-medium text-sm hover:text-primary transition-colors truncate">{issue.title}</h4>
          </Link>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span>By {issue.profiles?.name || 'Anonymous'}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(issue.created_at).toLocaleDateString()}</span>
            {issue.location_address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{issue.location_address}</span>}
          </div>
        </div>
        {isOfficialUser && (
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Select value={issue.status} onValueChange={(val) => onStatusChange(issue.id, val)}>
              <SelectTrigger className="w-32 h-7 text-xs">
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
            {showAssign && officials && onAssign && (
              <Select onValueChange={(val) => onAssign(issue.id, val)}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {officials.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
