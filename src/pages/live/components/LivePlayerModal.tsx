import TranslatableText from '@/i18n/TranslatableText';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabase';
import { useTranslation } from 'react-i18next';


interface LiveStream {
  id: number;
  host: string;
  title: string;
  category: string;
  viewers: number;
  thumbnail: string;
  isMemberDeal: boolean;
  productName: string;
  productPrice: number;
  memberPrice: number;
  productId?: number;
  tags: string[];
}

interface ChatMessage {
  id: number;
  user: string;
  avatar: string;
  message: string;
  timestamp: string;
}

interface LivePlayerModalProps {
  stream: LiveStream;
  onClose: () => void;
}

interface DBProduct {
  id: number;
  name: string;
  price: number;
  discount_enabled: boolean;
  discount_price: number | null;
  media: { url: string; type: string }[];
}

const mockChatMessages: ChatMessage[] = [
  { id: 1, user: 'Sarah K.', avatar: 'SK', message: 'Love this product! Just ordered mine ❤️', timestamp: 'Just now' },
  { id: 2, user: 'Rizky A.', avatar: 'RA', message: 'Is this suitable for daily use?', timestamp: 'Just now' },
  { id: 3, user: 'Mei Ling', avatar: 'ML', message: 'The member price is insane 🔥', timestamp: '1 min ago' },
  { id: 4, user: 'Dan H.', avatar: 'DH', message: 'Copped! Best deal of the day fr fr', timestamp: '1 min ago' },
  { id: 5, user: 'Nadia R.', avatar: 'NR', message: 'How long does one bottle last?', timestamp: '2 mins ago' },
  { id: 6, user: 'Johan P.', avatar: 'JP', message: 'This host is hilarious 😂', timestamp: '2 mins ago' },
  { id: 7, user: 'Aisyah B.', avatar: 'AB', message: 'I have been waiting for this restock!', timestamp: '3 mins ago' },
  { id: 8, user: 'Wei Jie', avatar: 'WJ', message: 'Free shipping to Penang?', timestamp: '3 mins ago' },
  { id: 9, user: 'Catherine', avatar: 'CT', message: 'Just shared to my group chat!', timestamp: '4 mins ago' },
  { id: 10, user: 'Farid Z.', avatar: 'FZ', message: 'Grabbed 2 sets before it sells out', timestamp: '4 mins ago' },
];

const simulatedNewMessages: ChatMessage[] = [
  { id: 101, user: 'Lisa T.', avatar: 'LT', message: 'OMG the deal just dropped! 🚨', timestamp: 'Just now' },
  { id: 102, user: 'Hakim R.', avatar: 'HR', message: 'Cop that quick!', timestamp: 'Just now' },
  { id: 103, user: 'Yuki C.', avatar: 'YC', message: 'Member price is worth it 💯', timestamp: 'Just now' },
  { id: 104, user: 'Ben L.', avatar: 'BL', message: 'Is this halal certified?', timestamp: 'Just now' },
  { id: 105, user: 'Priya S.', avatar: 'PS', message: 'I bought this last week and love it!', timestamp: 'Just now' },
  { id: 106, user: 'Amir F.', avatar: 'AF', message: 'The quality is actually insane 🔥', timestamp: 'Just now' },
  { id: 107, user: 'Chloe W.', avatar: 'CW', message: 'Where to buy??', timestamp: 'Just now' },
  { id: 108, user: 'Zara H.', avatar: 'ZH', message: 'This stream is addictive 😂', timestamp: 'Just now' },
];

const hostReplies: ChatMessage[] = [
  { id: 201, user: 'Host', avatar: 'HO', message: 'Thanks for all the love! ❤️ Grab yours before it sells out!', timestamp: 'Just now' },
  { id: 202, user: 'Host', avatar: 'HO', message: 'Yes, free shipping nationwide! Click the product to view details 🛒', timestamp: 'Just now' },
  { id: 203, user: 'Host', avatar: 'HO', message: 'Only 15 units left at this price! ⚡', timestamp: 'Just now' },
];

export default function LivePlayerModal({ stream, onClose }: LivePlayerModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [chatInput, setChatInput] = useState('');
  const [hearts, setHearts] = useState<{ id: number; left: number }[]>([]);
  const [showProductCard, setShowProductCard] = useState(true);
  const [viewers, setViewers] = useState(stream.viewers);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'products'>('chat');
  const [dbProduct, setDbProduct] = useState<DBProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<DBProduct[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heartIdRef = useRef(0);

  const finalPrice = dbProduct?.discount_enabled && dbProduct?.discount_price != null
    ? dbProduct.discount_price
    : dbProduct?.price ?? stream.memberPrice;

  const originalPrice = dbProduct?.discount_enabled && dbProduct?.discount_price != null
    ? dbProduct.price
    : dbProduct?.price ?? stream.productPrice;

  const productImage = dbProduct?.media?.[0]?.url ?? stream.thumbnail;

  useEffect(() => {
    if (stream.productId) {
      fetchProductData(stream.productId);
    }
  }, [stream.productId]);

  const fetchProductData = async (productId: number) => {
    try {
      const { data, error } = await supabase
        .from('product_items')
        .select('id, name, price, discount_enabled, discount_price, media, category_id')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDbProduct(data);

        // Fetch related products from the same category
        const { data: related, error: relatedErr } = await supabase
          .from('product_items')
          .select('id, name, price, discount_enabled, discount_price, media')
          .eq('category_id', data.category_id)
          .eq('status', 'active')
          .neq('id', productId)
          .limit(4);

        if (!relatedErr && related) {
          setRelatedProducts(related);
        }
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    }
  };

  // Simulate new messages coming in
  useEffect(() => {
    const msgInterval = setInterval(() => {
      const random = simulatedNewMessages[Math.floor(Math.random() * simulatedNewMessages.length)];
      setMessages(prev => [...prev.slice(-40), { ...random, id: Date.now() + Math.random() }]);
    }, 4000);

    const hostInterval = setInterval(() => {
      const random = hostReplies[Math.floor(Math.random() * hostReplies.length)];
      setMessages(prev => [...prev.slice(-40), { ...random, id: Date.now() + Math.random() }]);
    }, 10000);

    const viewerInterval = setInterval(() => {
      setViewers(prev => Math.max(prev + Math.floor(Math.random() * 50) - 25, 100));
    }, 5000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(hostInterval);
      clearInterval(viewerInterval);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      user: 'You',
      avatar: 'YO',
      message: chatInput.trim(),
      timestamp: 'Just now',
    };
    setMessages(prev => [...prev.slice(-40), newMsg]);
    setChatInput('');
  };

  const tapHeart = () => {
    heartIdRef.current += 1;
    const id = heartIdRef.current;
    const left = 20 + Math.random() * 60;
    setHearts(prev => [...prev, { id, left }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 1500);
    setIsLiked(true);
    setTimeout(() => setIsLiked(false), 400);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stream.productId) {
      onClose();
      navigate(`/shop/${stream.productId}`);
    }
  };

  const getProdImage = (prod: DBProduct): string => {
    if (prod.media && Array.isArray(prod.media) && prod.media.length > 0) {
      return prod.media[0].url;
    }
    return '';
  };

  const getProdPrice = (prod: DBProduct): number => {
    if (prod.discount_enabled && prod.discount_price != null) return prod.discount_price;
    return prod.price;
  };

  const getProdOriginal = (prod: DBProduct): number | null => {
    if (prod.discount_enabled && prod.discount_price != null) return prod.price;
    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground-900/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-[1200px] max-h-[90vh] mx-4 my-4 bg-foreground-950 rounded-2xl overflow-hidden flex flex-col lg:flex-row">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-foreground-900/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-foreground-900/80 transition-colors cursor-pointer"
        >
          <i className="ri-close-line text-lg"></i>
        </button>

        {/* Left: Video Player */}
        <div className="relative w-full lg:w-[65%] h-[45%] lg:h-full flex-shrink-0 bg-foreground-950">
          <img
            src={stream.thumbnail}
            alt={stream.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground-950/60 via-transparent to-transparent"></div>
          <div className="absolute inset-0 z-10" onDoubleClick={tapHeart}></div>

          {hearts.map(heart => (
            <div
              key={heart.id}
              className="absolute bottom-10 z-20 text-accent-500 animate-[floatUp_1.5s_ease-out_forwards] pointer-events-none"
              style={{ left: `${heart.left}%` }}
            >
              <i className="ri-heart-3-fill text-3xl"></i>
            </div>
          ))}

          <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
            <span className="px-3 py-1 rounded-full bg-accent-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <TranslatableText i18nKey="ui.live.65c821a" />
            </span>
            <span className="px-3 py-1 rounded-full bg-foreground-900/60 backdrop-blur-sm text-white text-[11px] font-medium">
              <i className="ri-eye-line mr-1"></i>
              {viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}K` : viewers} <TranslatableText i18nKey="ui.extra_watching.874e70e" /></span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-white/30">
                <span className="text-primary-700 text-xs font-bold">
                  {stream.host.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{stream.host}</div>
                <div className="text-white/60 text-[11px]">{stream.title}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={tapHeart}
                className={`w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer ${isLiked ? 'scale-125' : 'scale-100'}`}
              >
                <i className={`text-lg ${isLiked ? 'ri-heart-3-fill text-accent-500' : 'ri-heart-3-line text-white'}`}></i>
              </button>
              <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
                <i className="ri-share-forward-line text-lg"></i>
              </button>
              <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
                <i className="ri-gift-line text-lg"></i>
              </button>
            </div>
          </div>

          {/* Floating Product Card */}
          {showProductCard && (
            <div className="absolute bottom-20 left-4 z-20 bg-background-50 rounded-xl p-3 shadow-lg border border-background-200/70 max-w-[220px] animate-[slideUp_0.4s_ease-out]">
              <button
                onClick={() => setShowProductCard(false)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-foreground-700 flex items-center justify-center text-white text-[10px] cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-background-200 overflow-hidden flex-shrink-0">
                  <img src={productImage} alt={stream.productName} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-foreground-800 truncate">
                    {dbProduct?.name || stream.productName}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-accent-600">RM {finalPrice.toFixed(2)}</span>
                    {dbProduct?.discount_enabled && (
                      <span className="text-[10px] text-foreground-400 line-through">RM {originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleBuyNow}
                className="w-full py-2 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('ui.view_product.97dc6a9', { keySeparator: false })}
              </button>
            </div>
          )}

          {!showProductCard && (
            <button
              onClick={() => setShowProductCard(true)}
              className="absolute bottom-20 left-4 z-20 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-medium cursor-pointer whitespace-nowrap flex items-center gap-1.5 hover:bg-white/25 transition-colors"
            >
              <i className="ri-shopping-bag-3-line text-sm"></i> <TranslatableText i18nKey="ui.show_deal.0f3861a" />
            </button>
          )}
        </div>

        {/* Right: Chat / Products Panel */}
        <div className="w-full lg:w-[35%] h-[55%] lg:h-full flex flex-col bg-background-50">
          <div className="flex border-b border-background-200/70 flex-shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'chat' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-foreground-500 hover:text-foreground-700'}`}
            >
              <i className="ri-chat-3-line mr-1.5"></i><TranslatableText i18nKey="ui.extra_chat.2ced57f" /></button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'products' ? 'text-primary-600 border-b-2 border-primary-500' : 'text-foreground-500 hover:text-foreground-700'}`}
            >
              <i className="ri-shopping-bag-3-line mr-1.5"></i><TranslatableText i18nKey="ui.extra_products.fe0a091" /></button>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                {messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.avatar === 'HO' ? 'bg-accent-500' : msg.avatar === 'YO' ? 'bg-primary-500' : 'bg-secondary-200'}`}>
                      <span className="text-[10px] font-bold text-white">{msg.avatar}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-[11px] font-semibold ${msg.avatar === 'HO' ? 'text-accent-600' : 'text-foreground-700'}`}>{msg.user}</span>
                        <span className="text-[9px] text-foreground-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-foreground-600 leading-relaxed break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef}></div>
              </div>

              <div className="px-3 py-3 border-t border-background-200/70 flex-shrink-0 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Send a message..."
                  className="flex-1 px-3.5 py-2 rounded-full bg-background-100 border border-background-200/70 text-xs text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 transition-all"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-primary-500 hover:bg-primary-600 disabled:bg-background-200 flex items-center justify-center text-white transition-colors cursor-pointer flex-shrink-0"
                >
                  <i className="ri-send-plane-fill text-sm"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {/* Main Product */}
              <div className="bg-background-100 rounded-xl p-3 border border-background-200/70">
                <div className="flex items-center gap-1 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
                  <span className="text-[10px] text-accent-600 font-semibold uppercase"><TranslatableText i18nKey="ui.now_showing.bda20e6" /></span>
                </div>
                <h4 className="text-sm font-semibold text-foreground-800 mb-2">
                  {dbProduct?.name || stream.productName}
                </h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base font-bold text-accent-600">RM {finalPrice.toFixed(2)}</span>
                  {dbProduct?.discount_enabled && (
                    <>
                      <span className="text-xs text-foreground-400 line-through">RM {originalPrice.toFixed(2)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 font-semibold whitespace-nowrap"><TranslatableText i18nKey="ui.extra_member.6853c98" /></span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleBuyNow}
                  className="w-full py-2.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  {t('ui.view_product_details.2f92c56', { keySeparator: false })}
                </button>
              </div>

              {/* Related Products */}
              {relatedProducts.length > 0 && (
                <>
                  <p className="text-xs text-foreground-500 font-medium"><TranslatableText i18nKey="ui.more_from_this_category.8439fe6" /></p>
                  {relatedProducts.map(prod => {
                    const rpFinal = getProdPrice(prod);
                    const rpOriginal = getProdOriginal(prod);
                    return (
                      <div
                        key={prod.id}
                        onClick={(e) => { e.stopPropagation(); onClose(); navigate(`/shop/${prod.id}`); }}
                        className="flex items-center gap-3 bg-background-100 rounded-xl p-3 border border-background-200/70 cursor-pointer hover:border-primary-200 transition-colors"
                      >
                        <img src={getProdImage(prod)} alt={prod.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-foreground-800 truncate">{prod.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-bold text-accent-600">RM {rpFinal.toFixed(2)}</span>
                            {rpOriginal != null && (
                              <span className="text-[10px] text-foreground-400 line-through">RM {rpOriginal.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <button className="px-3 py-1.5 rounded-full bg-primary-100 hover:bg-primary-200 text-primary-700 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap">
                          <TranslatableText i18nKey="ui.view.69bd4ef" />
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0.8; transform: translateY(-60px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}