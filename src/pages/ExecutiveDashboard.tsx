import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  TrendingUp, Users, AlertTriangle, CheckCircle, Clock,
  Shield, ArrowUp, RefreshCw
} from 'lucide-react';

const COLORS = ['hsl(226, 44%, 45%)', 'hsl(169, 100%, 37%)', 'hsl(14, 100%, 63%)', 'hsl(272, 38%, 76%)', 'hsl(38, 92%, 50%)'];

const ExecutiveDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (profile && profile.role !== 'HigherOfficial' && profile.role !== 'Admin') {
      toast.error('Access denied');
      navigate('/feed');
      return;
    }
    fetchData();
  }, [user, profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [issuesRes, deptsRes] = await Promise.all([
        supabase.from('issues').select('*, categories (name)').order('created_at', { ascending: false }),
        supabase.from('departments').select('*'),
      ]);
      setIssues(issuesRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalIssues = issues.length;
  const resolvedIssues = issues.filter(i => i.status === 'resolved').length;
  const pendingIssues = issues.filter(i => i.status === 'reported').length;
  const inProgressIssues = issues.filter(i => i.status === 'in_progress').length;
  const sosIssues = issues.filter(i => i.sos_flag).length;
  const resolutionRate = totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(1) : '0';

  // Category distribution
  const categoryData = issues.reduce((acc: any[], issue) => {
    const cat = issue.categories?.name || issue.category_text || 'Other';
    const existing = acc.find(a => a.name === cat);
    if (existing) existing.value++;
    else acc.push({ name: cat, value: 1 });
    return acc;
  }, []);

  // Status distribution
  const statusData = [
    { name: 'Reported', value: pendingIssues },
    { name: 'In Progress', value: inProgressIssues },
    { name: 'Resolved', value: resolvedIssues },
    { name: 'Rejected', value: issues.filter(i => i.status === 'rejected').length },
  ];

  // Issues over time (last 30 days)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = issues.filter(issue => issue.created_at?.startsWith(dateStr)).length;
    return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count };
  });

  const statCards = [
    { label: 'Total Issues', value: totalIssues, icon: TrendingUp, color: 'from-primary to-primary-glow' },
    { label: 'Pending', value: pendingIssues, icon: Clock, color: 'from-yellow-500 to-yellow-600' },
    { label: 'In Progress', value: inProgressIssues, icon: AlertTriangle, color: 'from-blue-500 to-blue-600' },
    { label: 'Resolved', value: resolvedIssues, icon: CheckCircle, color: 'from-green-500 to-green-600' },
    { label: 'SOS Alerts', value: sosIssues, icon: Shield, color: 'from-destructive to-red-600' },
    { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: ArrowUp, color: 'from-secondary to-secondary-light' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold mb-2">Executive Dashboard</h1>
            <p className="text-muted-foreground">Overview of all civic issues and department performance</p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="glass-card glass-card-dark">
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Issues over time */}
          <Card className="glass-card glass-card-dark">
            <CardHeader>
              <CardTitle className="text-lg">Issues Over Time (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(226, 44%, 45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="glass-card glass-card-dark">
            <CardHeader>
              <CardTitle className="text-lg">Issues by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="glass-card glass-card-dark">
            <CardHeader>
              <CardTitle className="text-lg">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card className="glass-card glass-card-dark">
            <CardHeader>
              <CardTitle className="text-lg">Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departments.map(dept => (
                  <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">{dept.name}</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No departments configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent SOS Alerts */}
        <Card className="glass-card glass-card-dark">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Recent SOS Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {issues.filter(i => i.sos_flag).slice(0, 5).map(issue => (
                <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleString()}</p>
                  </div>
                  <Badge className={issue.status === 'resolved' ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}>
                    {issue.status?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              {issues.filter(i => i.sos_flag).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No SOS alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
