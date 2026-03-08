import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Users, TrendingUp, Shield, Zap, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Home = () => {
  const { user, profile } = useAuth();
  const isAuthority = profile?.role && profile.role !== 'Citizen';

  const features = [
    {
      icon: MessageSquare,
      title: 'Easy Reporting',
      description: 'Report civic issues with voice, text, or photos in seconds',
      gradient: 'from-primary to-primary-glow'
    },
    {
      icon: Users,
      title: 'Community Power',
      description: 'Vote and validate issues to amplify community voice',
      gradient: 'from-secondary to-secondary-light'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Real-time updates on issue status and resolution',
      gradient: 'from-accent to-lavender'
    },
    {
      icon: Shield,
      title: 'Priority Routing',
      description: 'Smart escalation ensures urgent issues get immediate attention',
      gradient: 'from-lavender to-primary'
    },
    {
      icon: Zap,
      title: 'AI-Powered',
      description: 'Intelligent categorization and multilingual support',
      gradient: 'from-secondary to-accent'
    },
    {
      icon: MapPin,
      title: 'Geospatial Insights',
      description: 'Visualize issues on interactive maps and heatmaps',
      gradient: 'from-primary to-secondary'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-lavender/10 -z-10" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="container mx-auto max-w-6xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-block mb-6"
          >
            <span className="px-4 py-2 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
              Empowering Communities Since 2025
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-tight">
            Your Voice,{' '}
            <span className="gradient-text">Your Community</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Report civic issues, connect with your community, and track real change. 
            Together, we build better neighborhoods.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {isAuthority ? (
              <Link to="/dashboard">
                <Button 
                  size="lg" 
                  className="font-button text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-glow group"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Link to={user ? "/report" : "/auth"}>
                <Button 
                  size="lg" 
                  className="font-button text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-glow group"
                >
                  {user ? 'Report an Issue' : 'Get Started'}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}
            <Link to="/feed">
              <Button 
                size="lg" 
                variant="outline"
                className="font-button text-lg px-8 py-6"
              >
                Explore Issues
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {[
              { label: 'Issues Reported', value: '12.5K+' },
              { label: 'Issues Resolved', value: '8.9K+' },
              { label: 'Active Citizens', value: '25K+' },
              { label: 'Response Time', value: '< 24h' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-heading font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              Why Choose Civic Connect?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Modern tools and smart technology to make civic engagement effortless
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="glass-card glass-card-dark p-8 rounded-2xl group hover:shadow-glow transition-all duration-300"
                style={{
                  animationDelay: `${index * 60}ms`
                }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-4xl"
        >
          <div className="glass-card glass-card-dark rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 -z-10" />
            
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of citizens already using Civic Connect to improve their communities
            </p>
            
            <Link to={isAuthority ? "/dashboard" : (user ? "/report" : "/auth")}>
              <Button 
                size="lg"
                className="font-button text-lg px-10 py-6 bg-gradient-to-r from-primary to-secondary hover:opacity-90 animate-glow-pulse group"
              >
                {isAuthority ? 'View Dashboard' : 'Start Now'}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
