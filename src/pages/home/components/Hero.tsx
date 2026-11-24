import TranslatableText from '@/i18n/TranslatableText';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Hero() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative w-full min-h-[100svh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Abstract%20modern%20geometric%20gradient%20background%20with%20flowing%20teal%20mint%20and%20coral%20orange%20waves%20intersecting%20with%20circular%20glowing%20orbs%20subtle%20grid%20pattern%20dark%20overlay%20at%20bottom%20left%20tech-forward%20young%20vibrant%20aesthetic%20no%20text&width=1920&height=1080&seq=hero-bg-h2h&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground-900/75 via-foreground-900/60 to-primary-900/50"></div>
      </div>

      {/* Content */}
      <div className="relative w-full mx-auto px-4 md:px-6 max-w-[1440px] py-20 md:py-28">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 md:gap-14">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left pt-8 md:pt-12">

            {/* Title */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] mb-5">
              {t('ui.live_connected.21b065e')}
              <br />
              {t('ui.grow_together.092a38a')}
            </h1>

            {/* Subtitle */}
            <p className="text-white/75 text-base md:text-lg max-w-lg mx-auto lg:mx-0 mb-4 leading-relaxed">
              {t('ui.watch_live_streams_listen_to_podcasts_lear.9572e72', { keySeparator: false })}
            </p>
            <p className="text-white/55 text-sm md:text-base mb-8">
              <TranslatableText i18nKey="ui.podcast_h2h.3b598d5" />
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                onClick={() => navigate('/live')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm md:text-base transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-play-circle-line text-lg"></i>
                {t('ui.watch_show_now.802100a', { keySeparator: false })}
              </button>
              <button
                onClick={() => navigate('/courses')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm md:text-base transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-book-open-line text-lg"></i>
                {t('ui.explore_courses.089a86e', { keySeparator: false })}
              </button>
            </div>
          </div>

          {/* Right Visual — App Mockup */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-[280px] sm:w-[320px] md:w-[360px]">
              {/* Main Card */}
              <div className="relative bg-background-50/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 md:p-5 overflow-hidden">
                {/* Live indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-500 animate-pulse"></span>
                  <span className="text-white text-xs font-semibold font-label uppercase tracking-wider"><TranslatableText i18nKey="ui.extra_live.6990f01" /></span>
                  <span className="text-white/50 text-xs"><TranslatableText i18nKey="ui.2_8k_watching.35c0ed0" /></span>
                </div>
                {/* Stream thumbnail */}
                <div className="rounded-xl overflow-hidden mb-3 aspect-video bg-background-800">
                  <img
                    src="https://readdy.ai/api/search-image?query=Young%20Asian%20female%20live%20streamer%20host%20in%20a%20bright%20modern%20studio%20setup%20with%20ring%20light%20holding%20a%20beauty%20product%20teal%20mint%20and%20coral%20orange%20studio%20accents%20professional%20and%20friendly%20atmosphere&width=640&height=360&seq=hero-card-thumb&orientation=landscape"
                    alt="Live stream"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Product Preview */}
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <div className="w-12 h-12 rounded-lg bg-white/15 flex-shrink-0 overflow-hidden">
                    <img
                      src="https://readdy.ai/api/search-image?query=Premium%20skincare%20serum%20bottle%20with%20dropper%20on%20white%20background%20minimal%20clean%20product%20photography%20small%20thumbnail&width=120&height=120&seq=hero-card-product&orientation=squarish"
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate"><TranslatableText i18nKey="ui.glow_serum_set.789007e" /></div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-accent-400 text-sm font-bold"><TranslatableText i18nKey="ui.rm_59.0bb12c5" /></span>
                      <span className="text-white/40 text-xs line-through"><TranslatableText i18nKey="ui.rm_89.4378fc4" /></span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-500/20 text-accent-400 font-semibold whitespace-nowrap"><TranslatableText i18nKey="ui.extra_member.6853c98" /></span>
                    </div>
                  </div>
                  <button className="flex-shrink-0 w-9 h-9 rounded-full bg-accent-500 flex items-center justify-center cursor-pointer hover:bg-accent-600 transition-colors">
                    <i className="ri-shopping-cart-line text-white text-sm"></i>
                  </button>
                </div>
              </div>
              {/* Floating mini cards */}
              <div className="absolute -top-4 -right-4 bg-background-50/15 backdrop-blur-md rounded-xl border border-white/15 px-3 py-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center">
                  <i className="ri-star-fill text-white text-xs"></i>
                </div>
                <span className="text-white text-xs font-semibold whitespace-nowrap"><TranslatableText i18nKey="ui.120_pts.afaf64f" /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
