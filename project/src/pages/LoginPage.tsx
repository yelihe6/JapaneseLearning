import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authService } from '../services/authService';
import { User, Mail, Lock, Globe, Eye, EyeOff, RefreshCw } from 'lucide-react';

type AuthMode = 'login' | 'register';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isEmailFormatValid(email: string) {
  return email.trim().length > 0 && EMAIL_REGEX.test(email.trim());
}

// 8-16 位，必须包含数字、英文字母、特殊字符
function checkPasswordRules(p: string) {
  return {
    length: p.length >= 8 && p.length <= 16,
    digit: /\d/.test(p),
    letter: /[a-zA-Z]/.test(p),
    special: /[^a-zA-Z0-9]/.test(p),
  };
}
function isPasswordValid(p: string) {
  const r = checkPasswordRules(p);
  return r.length && r.digit && r.letter && r.special;
}

export function LoginPage() {
  const { language, t } = useI18n();
  const { setLanguage } = useLanguage();
  const { login, register, loading, error, clearError, setError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaImage, setCaptchaImage] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [emailTakenError, setEmailTakenError] = useState(false);
  const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailRef = useRef(email);
  emailRef.current = email;

  const loadCaptcha = useCallback(async () => {
    try {
      const { captchaId: id, image } = await authService.getCaptcha();
      setCaptchaId(id);
      setCaptchaImage(image);
      setCaptchaAnswer('');
    } catch {
      setCaptchaId('');
      setCaptchaImage('');
    }
  }, []);

  useEffect(() => {
    if (mode === 'register') void loadCaptcha();
  }, [mode, loadCaptcha]);

  useEffect(() => {
    if (mode !== 'register') return;
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailFormatError(false);
      setEmailTakenError(false);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailFormatError(true);
      setEmailTakenError(false);
      return;
    }
    setEmailFormatError(false);
    if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    emailCheckRef.current = setTimeout(async () => {
      emailCheckRef.current = null;
      try {
        const { taken } = await authService.checkEmail(trimmed);
        if (emailRef.current.trim() === trimmed) setEmailTakenError(taken);
      } catch {
        if (emailRef.current.trim() === trimmed) setEmailTakenError(false);
      }
    }, 400);
    return () => {
      if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    };
  }, [mode, email]);

  const passwordRules = checkPasswordRules(password);
  const passwordValid = isPasswordValid(password);
  const confirmMatch = confirmPassword.length > 0 && password === confirmPassword;
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const emailValid = email.trim().length > 0 && isEmailFormatValid(email) && !emailTakenError;
  const canSubmitRegister =
    emailValid &&
    passwordValid &&
    confirmMatch &&
    !!captchaId &&
    captchaAnswer.trim().length > 0;
  const submitDisabled =
    loading ||
    (mode === 'register' ? !canSubmitRegister : false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'register') {
      if (!passwordValid) {
        setError('weak_password');
        return;
      }
      if (password !== confirmPassword) {
        setError('password_mismatch');
        return;
      }
    }
    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(email, password, captchaId, captchaAnswer.trim(), {
        onInvalidCaptcha: loadCaptcha,
      });
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCaptchaId('');
    setCaptchaImage('');
    setCaptchaAnswer('');
    setEmailFormatError(false);
    setEmailTakenError(false);
  };

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

  const title = mode === 'login' ? t('auth_login_title') : t('auth_register_title');
  const submitText = mode === 'login' ? t('auth_login_button') : t('auth_register_button');
  const switchText =
    mode === 'login' ? t('auth_switch_to_register') : t('auth_switch_to_login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Top Navigation Bar */}
        <div className="bg-white rounded-t-2xl shadow-lg p-4 flex justify-between items-center">
          {/* Language Switcher */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen(v => !v)}
              className={`group flex items-center gap-2 bg-white/90 backdrop-blur border rounded-xl px-3 py-2 text-sm text-gray-800 shadow-sm transition-all duration-200 outline-none hover:shadow-md hover:border-blue-300 focus:ring-2 focus:ring-blue-200 active:scale-[0.98] ${
                langMenuOpen ? 'border-blue-300 shadow-md' : 'border-gray-200'
              }`}
              aria-haspopup="menu"
              aria-expanded={langMenuOpen}
            >
              <Globe size={16} className="text-blue-600" />
              <span className="font-medium">{language === 'zh' ? t('lang_zh') : language === 'ja' ? t('lang_ja') : t('lang_en')}</span>
            </button>

            <div
              className={`absolute right-0 mt-2 w-40 origin-top-right rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl overflow-hidden transition-all duration-200 z-50 ${
                langMenuOpen
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 -translate-y-1 scale-[0.98] pointer-events-none'
              }`}
              role="menu"
            >
              <div className="p-1" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('zh');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    language === 'zh'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="menuitem"
                >
                  <span className="flex-1 text-left">{t('lang_zh')}</span>
                  {language === 'zh' && <span className="text-xs text-blue-600">●</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    language === 'en'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="menuitem"
                >
                  <span className="flex-1 text-left">{t('lang_en')}</span>
                  {language === 'en' && <span className="text-xs text-blue-600">●</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('ja');
                    setLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    language === 'ja'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="menuitem"
                >
                  <span className="flex-1 text-left">{t('lang_ja')}</span>
                  {language === 'ja' && <span className="text-xs text-blue-600">●</span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-b-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">
              {mode === 'login' 
                ? t('auth_login_subtitle')
                : t('auth_register_subtitle')
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth_email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    mode === 'register' && (emailFormatError || emailTakenError)
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder={t('auth_email_placeholder')}
                  disabled={loading}
                />
              </div>
              {mode === 'register' && emailFormatError && (
                <p className="mt-1 text-xs text-red-600">{t('auth_error_invalid_email')}</p>
              )}
              {mode === 'register' && emailTakenError && (
                <p className="mt-1 text-xs text-red-600">{t('auth_error_email_taken')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth_password')}
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={mode === 'login'}
                  minLength={mode === 'register' ? 8 : undefined}
                  maxLength={mode === 'register' ? 16 : undefined}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('auth_password_placeholder')}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 p-1.5 text-gray-500 hover:text-gray-700 rounded"
                  title={showPassword ? t('auth_hide_password') : t('auth_show_password')}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'register' && (
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  <li className={passwordRules.length ? 'text-green-600' : ''}>
                    {passwordRules.length ? '✓ ' : '○ '}{t('auth_password_rule_length')}
                  </li>
                  <li className={passwordRules.digit ? 'text-green-600' : ''}>
                    {passwordRules.digit ? '✓ ' : '○ '}{t('auth_password_rule_digit')}
                  </li>
                  <li className={passwordRules.letter ? 'text-green-600' : ''}>
                    {passwordRules.letter ? '✓ ' : '○ '}{t('auth_password_rule_letter')}
                  </li>
                  <li className={passwordRules.special ? 'text-green-600' : ''}>
                    {passwordRules.special ? '✓ ' : '○ '}{t('auth_password_rule_special')}
                  </li>
                </ul>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth_confirm_password')}
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={16}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      confirmMismatch ? 'border-red-500' : confirmMatch ? 'border-green-500' : 'border-gray-300'
                    }`}
                    placeholder={t('auth_confirm_password_placeholder')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2 p-1.5 text-gray-500 hover:text-gray-700 rounded"
                    title={showConfirmPassword ? t('auth_hide_password') : t('auth_show_password')}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmMatch && (
                  <p className="mt-1 text-xs text-green-600">{t('auth_confirm_match')}</p>
                )}
                {confirmMismatch && (
                  <p className="mt-1 text-xs text-red-600">{t('auth_confirm_mismatch')}</p>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth_captcha_label')}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-28 h-10 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                    {captchaImage ? (
                      <span dangerouslySetInnerHTML={{ __html: captchaImage }} className="inline-block [&>svg]:max-w-full [&>svg]:max-h-10 [&>svg]:w-auto [&>svg]:h-10" />
                    ) : (
                      <span className="text-xs text-gray-400">{t('auth_loading')}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadCaptcha()}
                    className="flex-shrink-0 p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    title={t('auth_captcha_refresh')}
                  >
                    <RefreshCw size={20} />
                  </button>
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    maxLength={8}
                    autoComplete="off"
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('auth_captcha_placeholder')}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {(() => {
                const msg = t('auth_error_' + error);
                return msg === 'auth_error_' + error ? t('auth_error_unknown') : msg;
              })()}
              </div>
            )}

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? t('auth_loading') : submitText}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {switchText}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 日本語学习</p>
        </div>
      </div>
    </div>
  );
}
