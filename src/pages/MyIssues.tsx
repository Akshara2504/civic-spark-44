import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CheckCircle, Clock, AlertTriangle, Eye, CircleCheckBig,
  Plus, ArrowLeft, Loader2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';

const MyIssues = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; issue: any | null }>({ open: false, issue: null });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMyIssues();
  }, [user]);

  const fetchMyIssues = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('issues')
      .select('*, categories (name, icon)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setIssues(data || []);
    setLoading(false);
  };

  const handleMarkResolved = async () => {
    const issue = confirmDialog.issue;
    if (!issue) return;
    setResolvingId(issue.id);
    const { error } = await supabase
      .from('issues')
      .update({ status: 'Resolved' as any, updated_at: new Date().toISOString() })
      .eq('id', issue.id)
      .eq('user_id', user!.id);

    if (error) {
      toast.error('Failed to mark as resolved');
    } else {
      toast.success('Issue marked as resolved!');
      fetchMyIssues();
    }
    setResolvingId(null);
    setConfirmDialog({ open: false, issue: null });
  };

  const getStatusStyle = (status: string) => {
    const map: Record<string, { class: string; icon: JSX.Element }> = {
      Reported: { class: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
      'In Progress': { class: 'bg-blue-500/20 text-blue-700 border-blue-500/30', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      Resolved: { class: 'bg-green-500/20 text-green-700 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
      Escalated: { class: 'bg-destructive/20 text-destructive border-destructive/30', icon: <AlertTriangle className="w-3 h-3" /> },
      Closed: { class: 'bg-muted text-muted-foreground', icon: <CheckCircle className="w-3 h-3" /> },
    };
    return map[status] || map.Reported;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-heading font-bold">My Reported Issues</h1>
              <p className="text-muted-foreground mt-1">Track and resolve your reported issues</p>
            </div>
            <Link to="/report">
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4 mr-2" /> New Issue
              </Button>
            </Link>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : issues.length === 0 ? (
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Issues Reported Yet</h2>
            <p className="text-muted-foreground mb-4">Start by reporting a community issue.</p>
            <Link to="/report">
              <Button>Report Your First Issue</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {issues.map((issue, i) => {
              const status = getStatusStyle(issue.status || 'Reported');
              const isResolved = issue.status === 'Resolved' || issue.status === 'Closed';
              return (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`transition-all ${isResolved ? 'opacity-75' : ''}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Status icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isResolved ? 'bg-green-500/20' : 'bg-yellow-500/20'
                      }`}>
                        {isResolved
                          ? <CheckCircle className="w-5 h-5 text-green-600" />
                          : <Clock className="w-5 h-5 text-yellow-600" />
                        }
                      </div>

                      {/* Issue info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{issue.title}</h3>
                          <Badge className={status.class} variant="outline">
                            {status.icon}
                            <span className="ml-1">{issue.status}</span>
                          </Badge>
                          {issue.categories?.name && (
                            <Badge variant="secondary" className="text-xs">{issue.categories.name}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {issue.summary || issue.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(issue.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex gap-2">
                        <Link to={`/issue/${issue.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </Link>
                        {!isResolved && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setConfirmDialog({ open: true, issue })}
                          >
                            <CircleCheckBig className="w-4 h-4 mr-1" /> Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Confirm Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, issue: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Issue Resolved</DialogTitle>
              <DialogDescription>
                Are you sure <strong>"{confirmDialog.issue?.title}"</strong> has been resolved? This will update the status and notify the assigned authority.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, issue: null })}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleMarkResolved}
                disabled={!!resolvingId}
              >
                {resolvingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Yes, It's Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyIssues;
