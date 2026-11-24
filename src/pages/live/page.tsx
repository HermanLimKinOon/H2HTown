import TranslatableText from '@/i18n/TranslatableText';
import { Link } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { allLiveStreams } from '@/mocks/homeData';
import { useTranslation } from 'react-i18next';


export default function Live() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[320px] md:h-[400px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-100/80 via-accent-50/60 to-accent-100/70"></div>
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px), radial-gradient(circle at 75% 75%, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-200/60 border border-accent-300/50 mb-5">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
              <span className="text-accent-800 text-sm font-semibold whitespace-nowrap"><TranslatableText i18nKey="ui.live_now.26a5561" /></span>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground-800 mb-4">
              <TranslatableText i18nKey="ui.live.65c821a" /><span className="text-accent-500"><TranslatableText i18nKey="ui.extra_streams.74985da" /></span>
            </h1>
            <p className="text-foreground-600 text-sm md:text-base max-w-xl">
              <TranslatableText i18nKey="ui.join_real_hosts_discover_products_and_enjo.91f53f8" />
            </p>
          </div>
        </div>
      </section>

      {/* All Live Streams Grid */}
      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">
              <TranslatableText i18nKey="ui.extra_all.6a72085" /><span className="text-accent-500"><TranslatableText i18nKey="ui.extra_streams.74985da" /></span>
            </h2>
            <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-md mx-auto">
              <TranslatableText i18nKey="ui.browse_past_and_upcoming_live_shows_from_o.047862b" />
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {allLiveStreams.map((stream) => (
              <div key={stream.id} className="group bg-background-50 rounded-2xl border border-background-200/70 hover:border-accent-200 transition-all cursor-pointer overflow-hidden">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={stream.thumbnail}
                    alt={stream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500 text-white text-[11px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    <TranslatableText i18nKey="ui.live.65c821a" />
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-foreground-900/60 backdrop-blur-sm text-white text-[11px] font-medium">
                    <i className="ri-eye-line mr-1"></i>
                    {stream.viewers >= 1000 ? `${(stream.viewers / 1000).toFixed(1)}K` : stream.viewers}
                  </div>
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-background-50/90 text-foreground-700 text-[11px] font-medium">
                    {stream.category}
                  </div>
                  <div className="absolute inset-0 bg-foreground-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center shadow-lg">
                      <i className="ri-play-fill text-white text-xl ml-0.5"></i>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-700 text-[10px] font-bold">
                        {stream.host.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground-800 truncate">{stream.host}</span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground-700 line-clamp-2 mb-3 leading-snug">{stream.title}</h3>

                  {/* Product Preview */}
                  <div className="flex items-center gap-3 bg-accent-50/60 rounded-xl p-3">
                    <div>
                      <div className="text-[11px] text-foreground-500 mb-0.5">{stream.productName}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-accent-600">RM {stream.memberPrice}</span>
                        <span className="text-[11px] text-foreground-400 line-through">RM {stream.productPrice}</span>
                      </div>
                    </div>
                    <div className="ml-auto flex flex-col gap-1.5">
                      {stream.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 font-semibold whitespace-nowrap text-center">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={stream.productId ? `/shop/${stream.productId}` : '#'}
                    className="mt-3 w-full py-2.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <i className="ri-play-circle-line text-base"></i>
                    {t('ui.watch_live.e4b48c8', { keySeparator: false })}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}