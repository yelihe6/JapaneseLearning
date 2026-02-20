import { useState, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail } from 'lucide-react';

const DISPLAY_NAME_REGEX = /^[\p{L}\p{N}\s\-_\.]+$/u;
const DISPLAY_NAME_MAX = 20;

function validateDisplayName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) return false;
  return DISPLAY_NAME_REGEX.test(trimmed);
}

export function ProfilePage() {
  const { t } = useI18n();
  const { user, updateProfile, clearError } = useAuth();
  const [initialDisplayName, setInitialDisplayName] = useState(user?.displayName?.trim() ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName?.trim() ?? '');
  const [apiValidationError, setApiValidationError] = useState<string | null>(null);

  const trimmed = displayName.trim();
  const isFormatInvalid = trimmed.length > 0 && !validateDisplayName(trimmed);
  const validationError = apiValidationError || (isFormatInvalid ? t('profile_error_invalid_display_name') : null);

  useEffect(() => {
    const next = user?.displayName?.trim() ?? '';
    setInitialDisplayName(next);
    setDisplayName(next);
  }, [user?.displayName]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiValidationError(null);
    clearError();
    if (!user || !trimmed) return;
    if (trimmed === initialDisplayName) return;
    if (!validateDisplayName(trimmed)) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(trimmed);
      // 保存成功后立即同步本地状态，避免依赖 context 更新时序
      setInitialDisplayName(trimmed);
      setDisplayName(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'invalid_display_name') {
        setApiValidationError(t('profile_error_invalid_display_name'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-md mx-auto relative">
      {saved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-xl shadow-lg text-sm">
            {t('profile_saved')}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <User size={24} className="text-blue-600" />
          {t('profile_title')}
        </h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth_email')}
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-gray-700">
              <Mail size={18} className="text-gray-400" />
              <span>{user.email}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile_display_name')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setApiValidationError(null);
                }}
                maxLength={DISPLAY_NAME_MAX}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationError ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder={t('profile_display_name_placeholder')}
                disabled={saving}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">{t('profile_display_name_rule')}</p>
            {validationError && (
              <p className="mt-1 text-sm text-red-600">{validationError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving || !trimmed || trimmed === initialDisplayName || isFormatInvalid}
            className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? t('auth_loading') : saved ? t('profile_saved') : t('profile_save')}
          </button>
        </form>
      </div>
    </div>
  );
}
