import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-dark-bg text-dark-fg py-12 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-heading font-bold gradient-text">
              Civic Connect
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/feed" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('footer.communityFeed')}
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.reportIssue')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading font-semibold mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('footer.helpCenter')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('footer.contactUs')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>support@civicconnect.app</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>123 Main St, City</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12 pt-8 border-t border-border/10 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Civic Connect. {t('footer.rights')}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {t('footer.madeWith')} <Heart className="w-4 h-4 text-accent fill-accent" /> {t('footer.forCommunities')}
          </p>
        </motion.div>
      </div>
    </footer>
  );
};
