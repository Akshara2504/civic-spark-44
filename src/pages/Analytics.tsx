import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { CheckCircle, Clock, AlertTriangle, TrendingUp, MapPin, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Issue {
  id: string;
  title: string;
  status: string | null;
  severity_score: number | null;
  created_at: string | null;
  updated_at: string | null;
  category_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sos_flag: boolean | null;
}

const STATUS_COLORS: Record<string, string> = {
  'Reported': 'hsl(226, 44%, 45%)',
  'In Progress': 'hsl(45, 93%, 47%)',
  'Escalated': 'hsl(14, 100%, 63%)',
  'Resolved': 'hsl(142, 76%, 36%)',
  'Closed': 'hsl(215, 16%, 47%)',
};

const Analytics = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      const { data } = await supabase
        .from('issues')
        .select('id, title, status, severity_score, created_at, updated_at, category_text, location_lat, location_lng, sos_flag')
        .order('created_at', { ascending: true });
      setIssues((data as Issue[]) || []);
      setLoading(false);
    };
    fetchIssues();
  }, []);

  // --- Derived Stats ---
  const totalIssues = issues.length;
  const resolved = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const pending = issues.filter(i => i.status === 'Reported').length;
  const resolutionRate = totalIssues > 0 ? ((resolved / totalIssues) * 100).toFixed(1) : '0';

  // Avg resolution time (days) for resolved issues
  const resolvedIssues = issues.filter(i => (i.status === 'Resolved' || i.status === 'Closed') && i.created_at && i.updated_at);
  const avgResolutionDays = resolvedIssues.length > 0
    ? (resolvedIssues.reduce((sum, i) => {
        const diff = new Date(i.updated_at!).getTime() - new Date(i.created_at!).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0) / resolvedIssues.length).toFixed(1)
    : 'N/A';

  // Status distribution for pie chart
  const statusCounts = issues.reduce<Record<string, number>>((acc, i) => {
    const s = i.status || 'Reported';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Monthly trend
  const monthlyData = issues.reduce<Record<string, { reported: number; resolved: number }>>((acc, i) => {
    if (!i.created_at) return acc;
    const month = new Date(i.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (!acc[month]) acc[month] = { reported: 0, resolved: 0 };
    acc[month].reported += 1;
    if (i.status === 'Resolved' || i.status === 'Closed') acc[month].resolved += 1;
    return acc;
  }, {});
  const trendData = Object.entries(monthlyData).map(([month, d]) => ({ month, ...d }));

  // Resolution time buckets
  const timeBuckets = { '< 1 day': 0, '1-3 days': 0, '3-7 days': 0, '1-2 weeks': 0, '2+ weeks': 0 };
  resolvedIssues.forEach(i => {
    const days = (new Date(i.updated_at!).getTime() - new Date(i.created_at!).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 1) timeBuckets['< 1 day']++;
    else if (days < 3) timeBuckets['1-3 days']++;
    else if (days < 7) timeBuckets['3-7 days']++;
    else if (days < 14) timeBuckets['1-2 weeks']++;
    else timeBuckets['2+ weeks']++;
  });
  const responseTimeData = Object.entries(timeBuckets).map(([name, count]) => ({ name, count }));

  // Heatmap data points
  const heatmapPoints = issues
    .filter(i => i.location_lat && i.location_lng)
    .map(i => ({ lat: Number(i.location_lat), lng: Number(i.location_lng), title: i.title, status: i.status, severity: i.severity_score }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-2">Real-time insights into civic issue resolution and response performance</p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Issues', value: totalIssues, icon: AlertTriangle, color: 'text-primary' },
            { label: 'Resolved', value: resolved, icon: CheckCircle, color: 'text-[hsl(var(--success))]' },
            { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: TrendingUp, color: 'text-secondary' },
            { label: 'Avg Response', value: avgResolutionDays === 'N/A' ? 'N/A' : `${avgResolutionDays}d`, icon: Clock, color: 'text-accent' },
          ].map((kpi, idx) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="border border-border">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <kpi.icon className={`w-6 h-6 mb-2 ${kpi.color}`} />
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="response">Response Time</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Issue Status Distribution</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || 'hsl(215, 16%, 47%)'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Monthly Trend</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="reported" stroke="hsl(226, 44%, 45%)" strokeWidth={2} name="Reported" />
                      <Line type="monotone" dataKey="resolved" stroke="hsl(142, 76%, 36%)" strokeWidth={2} name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Response Time Tab */}
          <TabsContent value="response" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Resolution Time Distribution</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(226, 44%, 45%)" radius={[6, 6, 0, 0]} name="Issues" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Issue Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                {heatmapPoints.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No location data available for heatmap</p>
                ) : (
                  <div className="relative w-full h-[400px] bg-muted rounded-lg overflow-hidden">
                    <HeatmapCanvas points={heatmapPoints} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Simple canvas-based heatmap
const HeatmapCanvas = ({ points }: { points: { lat: number; lng: number; title: string; status: string | null; severity: number | null }[] }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; status: string; severity: number } | null>(null);

  if (points.length === 0) return null;

  const minLat = Math.min(...points.map(p => p.lat));
  const maxLat = Math.max(...points.map(p => p.lat));
  const minLng = Math.min(...points.map(p => p.lng));
  const maxLng = Math.max(...points.map(p => p.lng));

  const padLat = (maxLat - minLat) * 0.15 || 0.01;
  const padLng = (maxLng - minLng) * 0.15 || 0.01;

  const toX = (lng: number) => ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * 100;
  const toY = (lat: number) => (1 - (lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * 100;

  const getSeverityColor = (severity: number | null) => {
    const s = severity || 2;
    if (s <= 3) return 'bg-green-500';
    if (s <= 5) return 'bg-yellow-500';
    if (s <= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSeverityGlow = (severity: number | null) => {
    const s = severity || 2;
    if (s <= 3) return 'shadow-green-500/50';
    if (s <= 5) return 'shadow-yellow-500/50';
    if (s <= 7) return 'shadow-orange-500/50';
    return 'shadow-red-500/50';
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-muted to-muted/60">
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-20">
        {[20, 40, 60, 80].map(p => (
          <div key={`h-${p}`} className="absolute left-0 right-0 border-t border-muted-foreground/30" style={{ top: `${p}%` }} />
        ))}
        {[20, 40, 60, 80].map(p => (
          <div key={`v-${p}`} className="absolute top-0 bottom-0 border-l border-muted-foreground/30" style={{ left: `${p}%` }} />
        ))}
      </div>

      {/* Points */}
      {points.map((point, idx) => {
        const x = toX(point.lng);
        const y = toY(point.lat);
        return (
          <div
            key={idx}
            className={`absolute w-4 h-4 rounded-full ${getSeverityColor(point.severity)} shadow-lg ${getSeverityGlow(point.severity)} cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-150 z-10`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onMouseEnter={() => setTooltip({ x, y, title: point.title, status: point.status || 'Reported', severity: point.severity || 2 })}
            onMouseLeave={() => setTooltip(null)}
          />
        );
      })}

      {/* Glow halos for density */}
      {points.map((point, idx) => {
        const x = toX(point.lng);
        const y = toY(point.lat);
        const s = point.severity || 2;
        const size = 30 + s * 8;
        return (
          <div
            key={`glow-${idx}`}
            className="absolute rounded-full opacity-15 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x}%`, top: `${y}%`,
              width: `${size}px`, height: `${size}px`,
              background: s <= 3 ? 'hsl(142, 76%, 36%)' : s <= 5 ? 'hsl(45, 93%, 47%)' : s <= 7 ? 'hsl(14, 100%, 63%)' : 'hsl(0, 84%, 60%)',
            }}
          />
        );
      })}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-card border border-border rounded-lg p-2 shadow-lg pointer-events-none text-xs max-w-[180px]"
          style={{ left: `${Math.min(tooltip.x, 75)}%`, top: `${Math.max(tooltip.y - 12, 5)}%` }}
        >
          <p className="font-semibold text-foreground truncate">{tooltip.title}</p>
          <p className="text-muted-foreground">Status: {tooltip.status}</p>
          <p className="text-muted-foreground">Severity: {tooltip.severity}/10</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-card/90 border border-border rounded-lg p-2 text-xs space-y-1">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> Low (1-3)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Medium (4-5)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> High (6-7)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Critical (8-10)</div>
      </div>
    </div>
  );
};

export default Analytics;
