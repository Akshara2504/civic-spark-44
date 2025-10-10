import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

const Feed = () => {
  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-heading font-bold mb-2">Community Feed</h1>
            <p className="text-muted-foreground">
              See what's happening in your community
            </p>
          </div>
          
          <Link to="/report">
            <Button className="font-button bg-gradient-to-r from-primary to-secondary">
              <Plus className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card glass-card-dark p-12 rounded-2xl text-center"
        >
          <h2 className="text-2xl font-heading font-semibold mb-4">
            Feed Coming Soon
          </h2>
          <p className="text-muted-foreground mb-6">
            Real-time issue feed with filters, voting, and validation will be available here
          </p>
          <Link to="/report">
            <Button variant="outline" className="font-button">
              Report Your First Issue
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Feed;
