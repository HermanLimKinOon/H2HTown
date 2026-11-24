import TranslatableText from '@/i18n/TranslatableText';
import { Link } from 'react-router-dom';
import { footerNav, socialLinks } from '@/mocks/homeData';
import { useTranslation } from 'react-i18next';


export default function Footer() {
  const { t } = useTranslation();
  const isInternalLink = (href: string) => href.startsWith('/') || href.startsWith('#');
  const footerTextKeys: Record<string, string> = {
    Company: 'footer.company',
    Legal: 'footer.legal',
    'About Us': 'footer.about_us',
    'Meet Our Team': 'footer.meet_our_team',
    Contact: 'footer.contact',
    Careers: 'footer.careers',
    'Press Kit': 'footer.press_kit',
    'Privacy Policy': 'footer.privacy_policy',
    'Terms of Use': 'footer.terms_of_use',
    'Return Policy': 'footer.return_policy',
    'Membership Terms': 'footer.membership_terms',
  };
  const getFooterLabel = (label: string) => t(footerTextKeys[label] ?? label, { keySeparator: false });

  return (
    <footer className="bg-foreground-900 pt-14 md:pt-16 pb-8">
      <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
        {/* Top: Brand + Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 md:mb-12">
          <Link to="/" className="inline-flex items-center flex-shrink-0">
            <img
              src="https://public.readdy.ai/ai/img_res/f5c1b870-4e2b-4a48-a573-05e8dc50ba26.png"
              alt="Human To Human Ai Sdn Bhd"
              className="h-16 md:h-20 object-contain"
            />
          </Link>
        </div>

        {/* Middle: Navigation Columns */}
        <div className="grid grid-cols-2 gap-8 mb-10 md:mb-12">
          {footerNav.map((col) => {
            const linkTextSize = col.title === 'Legal' ? 'text-[11px] md:text-xs' : 'text-xs md:text-sm';
            const linkIcons: Record<string, string> = {
              'About Us': 'ri-information-line',
              'Meet Our Team': 'ri-team-line',
              'Contact': 'ri-mail-line',
              'Careers': 'ri-briefcase-line',
              'Press Kit': 'ri-newspaper-line',
              'Privacy Policy': 'ri-shield-check-line',
              'Terms of Use': 'ri-file-text-line',
              'Return Policy': 'ri-arrow-go-back-line',
              'Membership Terms': 'ri-vip-crown-line',
            };

            return (
              <div key={col.title}>
                <h4 className="font-heading font-semibold text-white/90 text-sm mb-4 uppercase tracking-wider">{getFooterLabel(col.title)}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => {
                    if (isInternalLink(link.href)) {
                      return (
                        <li key={link.label}>
                          <Link
                            to={link.href}
                            className={`inline-flex items-center gap-2.5 text-white/50 hover:text-white/85 ${linkTextSize} transition-colors group`}
                          >
                            <span className="w-6 h-6 rounded-md bg-white/6 group-hover:bg-white/12 flex items-center justify-center transition-colors flex-shrink-0">
                              <i className={`${linkIcons[link.label] || 'ri-link'} text-[11px]`}></i>
                            </span>
                            {getFooterLabel(link.label)}
                          </Link>
                        </li>
                      );
                    }
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className={`inline-flex items-center gap-2.5 text-white/50 hover:text-white/85 ${linkTextSize} transition-colors group`}
                        >
                          <span className="w-6 h-6 rounded-md bg-white/6 group-hover:bg-white/12 flex items-center justify-center transition-colors flex-shrink-0">
                            <i className={`${linkIcons[link.label] || 'ri-link'} text-[11px]`}></i>
                          </span>
                          {getFooterLabel(link.label)}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
                  aria-label={social.label}
                  rel="nofollow"
                >
                  <i className={`${social.icon} text-base`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col items-center gap-4 mt-8 pt-6 border-t border-white/5">
            {/* Full brand logo — hand-written to avoid AI image corruption */}
            <div className="flex items-center gap-3 md:gap-4">
              <img
                src="https://public.readdy.ai/ai/img_res/3d4ad1df-e358-457b-a3d5-f2c2afadead5.png"
                alt="H2H"
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain flex-shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-white font-heading font-bold text-base md:text-lg tracking-tight leading-none">
                  <TranslatableText i18nKey="ui.human_to_human_ai.ca37c6d" />
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/50 text-[10px] md:text-xs font-medium tracking-wide">
                    <TranslatableText i18nKey="ui.sdn_bhd.0a6aa97" />
                  </span>
                  <span className="text-white/30 text-[10px]">|</span>
                  <span className="text-primary-400 text-[10px] md:text-xs font-medium tracking-wider uppercase">
                    {t('ui.live_commerce_ai_connection.5dcb227', { keySeparator: false })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="text-white/30 text-[11px]">
                <TranslatableText i18nKey="ui.copy.55dfe7b" />{new Date().getFullYear()} {t('ui.human_to_human_ai_sdn_bhd_all_rights_reser.e53e9f4', { keySeparator: false })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
