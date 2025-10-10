import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Heart, Users, Target, Award } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Heart,
      title: 'Community First',
      description: 'We believe in the power of community voices to drive meaningful change.'
    },
    {
      icon: Users,
      title: 'Inclusive Platform',
      description: 'Built for everyone, accessible to all, empowering every voice.'
    },
    {
      icon: Target,
      title: 'Action Focused',
      description: 'From report to resolution, we ensure issues get the attention they deserve.'
    },
    {
      icon: Award,
      title: 'Transparent Process',
      description: 'Track progress in real-time and hold officials accountable.'
    }
  ];

  return (
    <div className="min-h-screen pt-24 px-4 pb-12">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-heading font-bold mb-6">
            About <span className="gradient-text">Civic Connect</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We're on a mission to bridge the gap between citizens and civic authorities, 
            making communities safer, cleaner, and more responsive to the needs of their residents.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card glass-card-dark p-12 rounded-3xl mb-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl -z-10" />
          <h2 className="text-3xl font-heading font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            To empower every citizen with the tools they need to report civic issues, 
            collaborate with their community, and hold authorities accountable—all while 
            leveraging cutting-edge technology to ensure faster, more effective responses.
          </p>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-heading font-bold text-center mb-12">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card glass-card-dark p-8 hover:shadow-glow transition-all h-full">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6">
                    <value.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Technology Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card glass-card-dark p-12 rounded-3xl text-center"
        >
          <h2 className="text-3xl font-heading font-bold mb-4">
            Powered by Innovation
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            Civic Connect leverages AI for smart issue categorization, real-time geospatial 
            mapping, automatic multilingual support, and intelligent routing to ensure issues 
            reach the right officials quickly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {['AI Classification', 'Voice-to-Text', 'Real-time Updates', 'Geospatial Mapping', 'Smart Routing', 'Multilingual'].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
