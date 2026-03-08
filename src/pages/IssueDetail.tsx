import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  ArrowLeft, MapPin, Calendar, ThumbsUp, ThumbsDown, 
  MessageCircle, AlertTriangle, CheckCircle, Clock,
  ShieldAlert, Flame, Users, Timer, Zap, CircleCheckBig
} from 'lucide-react';
import { motion } from 'framer-motion';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchIssueDetails();
      fetchComments();
      if (user) fetchUserVote();
      setupRealtimeSubscription();
    }
  }, [id, user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`issue-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `issue_id=eq.${id}`
        },
        () => fetchComments()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
          filter: `id=eq.${id}`
        },
        () => fetchIssueDetails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchIssueDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          profiles:user_id (name),
          categories (name, icon)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setIssue(data);
    } catch (error) {
      console.error('Error fetching issue:', error);
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (name)
        `)
        .eq('issue_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchUserVote = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('issue_id', id)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setUserVote(data?.vote_type || null);
    } catch (error) {
      console.error('Error fetching user vote:', error);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast.error('Please log in to vote');
      navigate('/auth');
      return;
    }

    try {
      if (userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('issue_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setUserVote(null);
        toast.success('Vote removed');
      } else {
        // Add or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            issue_id: id,
            user_id: user.id,
            vote_type: voteType
          });

        if (error) throw error;
        setUserVote(voteType);
        toast.success('Vote recorded');
      }
      fetchIssueDetails();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('Please log in to comment');
      navigate('/auth');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          issue_id: id,
          user_id: user.id,
          comment_text: newComment.trim()
        });

      if (error) throw error;
      setNewComment('');
      toast.success('Comment added');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Reported': return 'bg-yellow-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Resolved': return 'bg-green-500';
      case 'Escalated': return 'bg-red-500';
      case 'Closed': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Reported': return <Clock className="w-4 h-4" />;
      case 'In Progress': return <AlertTriangle className="w-4 h-4" />;
      case 'Resolved': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Issue not found</h2>
          <Button onClick={() => navigate('/feed')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button variant="ghost" onClick={() => navigate('/feed')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>

        <Card className="p-6 mb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getStatusColor(issue.status)}>
                  {getStatusIcon(issue.status)}
                  <span className="ml-1">{issue.status}</span>
                </Badge>
                <Badge variant="outline">{issue.categories?.name}</Badge>
                {issue.sos_flag && (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    SOS
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-heading font-bold mb-2">{issue.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>By {issue.profiles?.name || 'Anonymous'}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(issue.created_at).toLocaleDateString()}
                </span>
              {issue.location_address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {issue.location_address}
                  </span>
                )}
              </div>
            </div>

            {/* Vote Buttons */}
            <div className="flex flex-col items-center gap-2 ml-4">
              <Button
                variant={userVote === 'upvote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVote('upvote')}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <span className="font-bold">{(issue.upvotes_count || 0) - (issue.downvotes_count || 0)}</span>
              <Button
                variant={userVote === 'downvote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVote('downvote')}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Images */}
          {issue.media_urls && issue.media_urls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {issue.media_urls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url}
                  alt={`Issue image ${index + 1}`}
                  className="rounded-lg w-full h-48 object-cover"
                />
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* AI Emergency Analysis Panel */}
          {(issue.severity_score !== null || issue.sos_flag) && (
            <div className={`mb-6 rounded-xl border-2 p-5 ${
              issue.sos_flag 
                ? 'border-destructive/60 bg-destructive/5' 
                : issue.severity_score >= 5 
                  ? 'border-yellow-500/40 bg-yellow-500/5' 
                  : 'border-border bg-muted/30'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                {issue.sos_flag ? (
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                ) : (
                  <Zap className="w-5 h-5 text-primary" />
                )}
                <h3 className="font-semibold text-lg">
                  {issue.sos_flag ? '🚨 AI Emergency Detection — SOS FLAGGED' : 'AI Severity Analysis'}
                </h3>
              </div>

              {/* Severity Score Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Severity Score</span>
                  <span className={`text-2xl font-bold ${
                    (issue.severity_score || 0) >= 7 ? 'text-destructive' 
                    : (issue.severity_score || 0) >= 5 ? 'text-yellow-600' 
                    : 'text-green-600'
                  }`}>
                    {issue.severity_score || 0}/10
                  </span>
                </div>
                <Progress 
                  value={(issue.severity_score || 0) * 10} 
                  className={`h-3 ${
                    (issue.severity_score || 0) >= 7 ? '[&>div]:bg-destructive' 
                    : (issue.severity_score || 0) >= 5 ? '[&>div]:bg-yellow-500' 
                    : '[&>div]:bg-green-500'
                  }`}
                />
              </div>

              {/* Priority & Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Priority</p>
                    <p className="text-sm font-semibold capitalize">
                      {issue.sos_flag ? 'Critical' : (issue.severity_score || 0) >= 5 ? 'High' : 'Normal'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <Timer className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Time Sensitivity</p>
                    <p className="text-sm font-semibold capitalize">
                      {(issue.severity_score || 0) >= 7 ? 'Critical' : (issue.severity_score || 0) >= 5 ? 'High' : 'Medium'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <Users className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Impact</p>
                    <p className="text-sm font-semibold capitalize">
                      {(issue.severity_score || 0) >= 7 ? 'Many' : (issue.severity_score || 0) >= 5 ? 'Moderate' : 'Few'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Escalation</p>
                    <p className="text-sm font-semibold">Level {issue.escalation_level || 1}</p>
                  </div>
                </div>
              </div>

              {issue.sos_flag && (
                <p className="text-sm text-destructive font-medium mt-2">
                  ⚡ This issue has been automatically flagged as an emergency by AI and prioritized for immediate attention by authorities.
                </p>
              )}
            </div>
          )}

          {/* AI Summary */}
          {issue.summary && (
            <div className="mb-6 p-4 bg-accent/50 rounded-lg">
              <h3 className="font-semibold mb-2">AI Summary</h3>
              <p className="text-sm">{issue.summary}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-4">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              {comments.length} Comments
            </span>
            <span>Severity: {issue.severity_score || 0}/10</span>
            <span>Validations: {issue.validations_count || 0}</span>
          </div>
        </Card>

        {/* Comments Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-heading font-bold mb-4">Comments</h2>

          {/* Add Comment */}
          <div className="mb-6">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-2"
              rows={3}
            />
            <Button onClick={handleAddComment}>Post Comment</Button>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 p-4 bg-accent/30 rounded-lg"
              >
                <Avatar>
                  <AvatarFallback>
                    {comment.profiles?.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {comment.profiles?.name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comment_text}</p>
                </div>
              </motion.div>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default IssueDetail;
