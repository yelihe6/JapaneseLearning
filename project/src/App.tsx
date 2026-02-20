import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Trash2, ChevronDown, LayoutGrid, Mail, MessageCircle, Pencil, LogOut, User as UserIcon, CheckCircle, X, AlertCircle, Globe } from 'lucide-react';
import { KanaChart } from './components/KanaChart';
import { Quiz } from './components/Quiz';
import { Greetings } from './components/Greetings';
import { KanaFillBlanksPractice } from './components/KanaFillBlanksPractice';
import { KanaDictationPractice } from './components/KanaDictationPractice';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { t } from './i18n/i18n';
import { backgroundImageStore } from './services/backgroundImageStore';

type Page = 'chart' | 'greetings' | 'practice' | 'profile';
type KanaType = 'hiragana' | 'katakana';
type PracticeMode = 'fill' | 'dictation' | 'quiz';

function AppInner() {
  const [page, setPage] = useState<Page>('chart');
  const [lastMainPage, setLastMainPage] = useState<Exclude<Page, 'profile'>>('chart');
  const [kanaType, setKanaType] = useState<KanaType>('hiragana');
  const { language, setLanguage } = useLanguage();
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('fill');
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(() => backgroundImageStore.getOpacity());
  const [bgPosition, setBgPosition] = useState(() => backgroundImageStore.getPosition());
  const [bgScale, setBgScale] = useState(() => backgroundImageStore.getScale());
  const [bgPositionModalOpen, setBgPositionModalOpen] = useState(false);
  const [bgPreviewFile, setBgPreviewFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 50, y: 50 });
  const [previewScale, setPreviewScale] = useState(1);
  const bgDragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const bgPreviewRef = useRef<HTMLDivElement | null>(null);
  const previewScaleRef = useRef(previewScale);
  previewScaleRef.current = previewScale;
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);
  const appearanceRef = useRef<HTMLDivElement | null>(null);
  const [profileHoverOpen, setProfileHoverOpen] = useState(false);

  const { user, logout, loading, justLoggedIn } = useAuth();
  const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 检测登录成功：仅在通过 login 函数成功登录时显示（排除页面刷新和更新个人信息）
  useEffect(() => {
    if (justLoggedIn && user) {
      setShowLoginSuccessModal(true);
      const timer = setTimeout(() => {
        setShowLoginSuccessModal(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn, user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const blob = await backgroundImageStore.getBackgroundBlob();
        if (!blob) {
          setBgUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          return;
        }

        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        setBgUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // ignore
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectBackgroundFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setBgPreviewFile(file);
    setBgPreviewUrl(url);
    setPreviewPosition({ x: 50, y: 50 });
    setPreviewScale(1);
    setBgPositionModalOpen(true);
  };

  const onConfirmBackgroundChange = async () => {
    if (!bgPreviewFile || !bgPreviewUrl) return;
    await backgroundImageStore.setBackground(bgPreviewFile);
    setBgPosition(previewPosition);
    setBgScale(previewScale);
    backgroundImageStore.setPosition(previewPosition.x, previewPosition.y);
    backgroundImageStore.setScale(previewScale);
    setBgUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return bgPreviewUrl;
    });
    setBgPreviewFile(null);
    setBgPreviewUrl(null);
    setBgPositionModalOpen(false);
  };

  const onCancelBackgroundChange = () => {
    if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);
    setBgPreviewFile(null);
    setBgPreviewUrl(null);
    setBgPositionModalOpen(false);
  };

  const onClearBackground = async () => {
    await backgroundImageStore.clearBackground();
    setBgUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const onChangeBgOpacity = (opacity: number) => {
    setBgOpacity(opacity);
    backgroundImageStore.setOpacity(opacity);
  };

  useEffect(() => {
    if (!bgPositionModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelBackgroundChange();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bgPositionModalOpen]);

  useEffect(() => {
    const el = bgPreviewRef.current;
    if (!el || !bgPositionModalOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setPreviewScale((s) => Math.min(2, Math.max(0.5, s + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [bgPositionModalOpen]);

  useEffect(() => {
    if (!bgPositionModalOpen) return;
    const onPointerMove = (e: PointerEvent) => {
      if (!bgDragStartRef.current) return;
      const { posX, posY } = bgDragStartRef.current;
      const zoom = previewScaleRef.current;
      const scale = 0.15 / zoom;
      const newX = Math.min(100, Math.max(0, posX - (e.clientX - bgDragStartRef.current.x) * scale));
      const newY = Math.min(100, Math.max(0, posY - (e.clientY - bgDragStartRef.current.y) * scale));
      setPreviewPosition({ x: newX, y: newY });
      bgDragStartRef.current = { x: e.clientX, y: e.clientY, posX: newX, posY: newY };
    };
    const onPointerUp = () => {
      bgDragStartRef.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [bgPositionModalOpen]);

  const pageItems = useMemo(() => {
    return [
      { value: 'chart' as const, label: t(language, 'nav_learn'), icon: LayoutGrid },
      { value: 'greetings' as const, label: t(language, 'nav_greetings'), icon: MessageCircle },
      { value: 'practice' as const, label: t(language, 'nav_practice'), icon: Pencil },
    ];
  }, [language]);

  const currentPageItem = useMemo(() => {
    const displayPage = page === 'profile' ? lastMainPage : page;
    return pageItems.find(i => i.value === displayPage) ?? pageItems[0];
  }, [page, lastMainPage, pageItems]);

  useEffect(() => {
    if (!pageMenuOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = pageMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setPageMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPageMenuOpen(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [pageMenuOpen]);

  useEffect(() => {
    if (!langMenuOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = langMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setLangMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLangMenuOpen(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [langMenuOpen]);

  useEffect(() => {
    if (!appearanceOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = appearanceRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setAppearanceOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAppearanceOpen(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [appearanceOpen]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (page === 'chart') {
      return <KanaChart showType={kanaType} />;
    }
    if (page === 'greetings') {
      return <Greetings />;
    }
    if (page === 'practice') {
      if (practiceMode === 'quiz') {
        return <Quiz kanaType={kanaType} />;
      }
      if (practiceMode === 'dictation') {
        return <KanaDictationPractice kanaType={kanaType} />;
      }
      return <KanaFillBlanksPractice kanaType={kanaType} />;
    }
    if (page === 'profile') {
      return <ProfilePage />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-6 px-4 relative overflow-x-hidden">
      {/* Background image */}
      {bgUrl && (
        <div
          className="fixed inset-0 bg-no-repeat pointer-events-none z-0"
          style={{
            backgroundImage: `url(${bgUrl})`,
            backgroundPosition: `${bgPosition.x}% ${bgPosition.y}%`,
            backgroundSize: `${100 * bgScale}%`,
            opacity: bgOpacity,
          }}
        />
      )}
      {/* 选择背景后的位置调整弹窗 */}
      {bgPositionModalOpen && bgPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && onCancelBackgroundChange()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{t(language, 'bg_position_modal_title')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t(language, 'bg_position_drag_hint')}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-gray-600">{t(language, 'bg_scale')}</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={previewScale}
                  onChange={(e) => setPreviewScale(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12">{Math.round(previewScale * 100)}%</span>
              </div>
            </div>
            <div
              ref={bgPreviewRef}
              className="flex-1 min-h-[320px] bg-gray-100 cursor-grab active:cursor-grabbing relative overflow-hidden select-none"
              onPointerDown={(e) => {
                if (e.button === 0) {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  bgDragStartRef.current = { x: e.clientX, y: e.clientY, posX: previewPosition.x, posY: previewPosition.y };
                }
              }}
              onPointerUp={(e) => {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              }}
            >
              <div
                className="absolute inset-0 bg-no-repeat"
                style={{
                  backgroundImage: `url(${bgPreviewUrl})`,
                  backgroundPosition: `${previewPosition.x}% ${previewPosition.y}%`,
                  backgroundSize: `${100 * previewScale}%`,
                }}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancelBackgroundChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t(language, 'auth_cancel_button')}
              </button>
              <button
                type="button"
                onClick={() => void onConfirmBackgroundChange()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {t(language, 'bg_position_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative z-10 w-full max-w-7xl flex flex-col items-center flex-1 min-h-0">
        {/* Top bar: nav + language + appearance */}
        <nav className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative" ref={pageMenuRef}>
                <button
                  type="button"
                  onClick={() => setPageMenuOpen(v => !v)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                >
                  <currentPageItem.icon size={18} className="text-blue-600" />
                  <span>{currentPageItem.label}</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                <div
                  className={`absolute left-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50 transition-all duration-200 ${
                    pageMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
                  }`}
                >
                  {pageItems.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { setPage(item.value); setLastMainPage(item.value); setPageMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                        item.value === page ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon size={16} className={item.value === page ? 'text-blue-600' : 'text-gray-500'} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {page === 'chart' && (
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setKanaType('hiragana')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${kanaType === 'hiragana' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t(language, 'kana_hiragana')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setKanaType('katakana')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${kanaType === 'katakana' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t(language, 'kana_katakana')}
                  </button>
                </div>
              )}
              {page === 'practice' && (
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setPracticeMode('fill')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${practiceMode === 'fill' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t(language, 'practice_tab_fill')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPracticeMode('dictation')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${practiceMode === 'dictation' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t(language, 'practice_tab_dictation')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPracticeMode('quiz')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${practiceMode === 'quiz' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t(language, 'practice_tab_quiz')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="relative"
                onMouseEnter={() => setProfileHoverOpen(true)}
                onMouseLeave={() => setProfileHoverOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setPage('profile')}
                  className={`p-2.5 rounded-xl transition-colors ${
                    page === 'profile'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800'
                  }`}
                  title={t(language, 'nav_profile')}
                >
                  <UserIcon size={18} className={page === 'profile' ? 'text-blue-600' : 'text-gray-600'} />
                </button>
                {profileHoverOpen && user && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3 z-50">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600 truncate">{user.displayName?.trim() || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600 truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={langMenuRef}>
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(v => !v)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors"
                  title={t(language, 'lang_label')}
                >
                  <Globe size={18} className="text-blue-600 flex-shrink-0" />
                  <span>{language === 'zh' ? t(language, 'lang_zh') : language === 'ja' ? t(language, 'lang_ja') : t(language, 'lang_en')}</span>
                  <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                </button>
                <div
                  className={`absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-lg z-50 transition-all duration-200 ${
                    langMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
                  }`}
                >
                  <button type="button" onClick={() => { setLanguage('zh'); setLangMenuOpen(false); }} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-t-xl transition-colors">中文</button>
                  <button type="button" onClick={() => { setLanguage('en'); setLangMenuOpen(false); }} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors">English</button>
                  <button type="button" onClick={() => { setLanguage('ja'); setLangMenuOpen(false); }} className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-b-xl transition-colors">日本語</button>
                </div>
              </div>
              <div className="relative" ref={appearanceRef}>
                <button
                  type="button"
                  onClick={() => setAppearanceOpen(v => !v)}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                  title={t(language, 'appearance')}
                >
                  <ImageIcon size={18} />
                </button>
                {appearanceOpen && (
                  <div className="absolute top-full right-0 mt-2 z-20 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-gray-800">{t(language, 'appearance')}</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(language, 'bg_section')}</label>
                        <div className="flex flex-wrap gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <ImageIcon size={18} />
                            <span className="text-sm">{t(language, 'bg_change')}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelectBackgroundFile(f); e.target.value = ''; }} />
                          </label>
                          <button type="button" onClick={() => void onClearBackground()} className="flex items-center gap-2 text-sm text-red-600 hover:underline">
                            <Trash2 size={18} />
                            {t(language, 'bg_clear')}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(language, 'bg_opacity')}</label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={bgOpacity}
                          onChange={(e) => onChangeBgOpacity(Number(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">{t(language, 'bg_opacity_hint')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <LogOut size={18} />
                {t(language, 'auth_logout')}
              </button>
            </div>
          </div>
        </nav>

        <div className={`w-full flex justify-center ${page === 'profile' ? 'flex-1 items-center min-h-0' : ''}`}>
          {renderContent()}
        </div>
      </div>

      {/* 登录成功弹窗 */}
      {showLoginSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t(language, 'auth_login_success')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 text-sm">{t(language, 'auth_login_success')}</p>
          </div>
        </div>
      )}

      {/* 登出确认对话框 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{t(language, 'auth_logout_confirm_title')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t(language, 'auth_logout_confirm_message')}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t(language, 'auth_cancel_button')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  void logout();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {t(language, 'auth_logout_confirm_button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
