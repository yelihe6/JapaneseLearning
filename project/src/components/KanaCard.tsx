import { useMemo, useState, useEffect } from 'react';
import { Volume2, Edit2, Save, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Kana } from '../types/kana';
import { speechService } from '../services/speechService';
import { storageService } from '../services/storageService';
import { kanaImageStore } from '../services/kanaImageStore';
import { useI18n } from '../hooks/useI18n';
import { useAuth } from '../contexts/AuthContext';

interface KanaCardProps {
  kana: Kana;
  showType: 'hiragana' | 'katakana';
}

export function KanaCard({ kana, showType }: KanaCardProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState('');
  const [tempNote, setTempNote] = useState('');
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [tempImageIds, setTempImageIds] = useState<string[]>([]);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [tempImageUrls, setTempImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const userNote = storageService.getNote(kana.id, user.id);
    const currentNote = showType === 'hiragana'
      ? (userNote?.noteHiragana || '')
      : (userNote?.noteKatakana || '');

    const currentImageIds = showType === 'hiragana'
      ? (userNote?.imagesHiragana || [])
      : (userNote?.imagesKatakana || []);

    setNote(currentNote);
    setTempNote(currentNote);
    setImageIds(currentImageIds);
    setTempImageIds(currentImageIds);
    setIsEditing(false);
  }, [showType, kana.id, user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const ids = imageIds;
      const next: Record<string, string> = {};

      await Promise.all(ids.map(async (id) => {
        try {
          const blob = await kanaImageStore.getImageBlob(id);
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          next[id] = url;
        } catch {
          // ignore
        }
      }));

      if (cancelled) {
        Object.values(next).forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      setImageUrls(prev => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
        return next;
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [imageIds]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const ids = tempImageIds;
      const next: Record<string, string> = {};

      await Promise.all(ids.map(async (id) => {
        try {
          const blob = await kanaImageStore.getImageBlob(id);
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          next[id] = url;
        } catch {
          // ignore
        }
      }));

      if (cancelled) {
        Object.values(next).forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      setTempImageUrls(prev => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
        return next;
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [tempImageIds]);

  const displayChar = showType === 'hiragana' ? kana.hiragana : kana.katakana;

  const handleSpeak = () => {
    speechService.speak(displayChar);
  };

  const handleSave = () => {
    if (!user) return;
    const userNote = storageService.getNote(kana.id, user.id);

    if (tempNote.trim()) {
      if (showType === 'hiragana') {
        storageService.saveNote(kana.id, tempNote, userNote?.noteKatakana, user.id);
      } else {
        storageService.saveNote(kana.id, userNote?.noteHiragana, tempNote, user.id);
      }
      setNote(tempNote);
    } else {
      if (showType === 'hiragana') {
        storageService.saveNote(kana.id, '', userNote?.noteKatakana, user.id);
      } else {
        storageService.saveNote(kana.id, userNote?.noteHiragana, '', user.id);
      }
      setNote('');
    }

    if (showType === 'hiragana') {
      storageService.saveImages(kana.id, tempImageIds, userNote?.imagesKatakana, user.id);
    } else {
      storageService.saveImages(kana.id, userNote?.imagesHiragana, tempImageIds, user.id);
    }

    setImageIds(tempImageIds);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempNote(note);
    setTempImageIds(imageIds);
    setIsEditing(false);
  };

  const handleAddImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const id = await kanaImageStore.putImage(file);
      added.push(id);
    }

    if (added.length === 0) return;
    setTempImageIds(prev => [...prev, ...added]);
  };

  const removeTempImage = (id: string) => {
    setTempImageIds(prev => prev.filter(x => x !== id));
  };

  const hasAnyNote = useMemo(() => {
    return Boolean(note.trim()) || imageIds.length > 0;
  }, [note, imageIds.length]);

  const lightboxUrl = useMemo(() => {
    if (lightboxIndex === null) return null;
    const id = imageIds[lightboxIndex];
    if (!id) return null;
    return imageUrls[id] ?? null;
  }, [imageIds, imageUrls, lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        return;
      }

      if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev => {
          if (prev === null) return prev;
          if (imageIds.length === 0) return null;
          return (prev - 1 + imageIds.length) % imageIds.length;
        });
        return;
      }

      if (e.key === 'ArrowRight') {
        setLightboxIndex(prev => {
          if (prev === null) return prev;
          if (imageIds.length === 0) return null;
          return (prev + 1) % imageIds.length;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imageIds.length, lightboxIndex]);

  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow relative"
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
    >
      <div className="flex flex-col items-center space-y-2">
        <button
          type="button"
          onClick={handleSpeak}
          className="text-5xl font-bold hover:scale-110 transition-transform cursor-pointer"
        >
          {displayChar}
        </button>

        <div className="text-sm text-gray-600 font-medium">{kana.romaji}</div>

        <button
          type="button"
          onClick={handleSpeak}
          className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
          title={t('speak')}
        >
          <Volume2 size={18} />
        </button>

        <div className="w-full mt-2 pt-2 border-t border-gray-200">
          {isEditing ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500">
                {showType === 'hiragana' ? t('note_hiragana_label') : t('note_katakana_label')}
              </div>
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                className="w-full p-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('note_placeholder')}
                rows={3}
              />

              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                  <ImageIcon size={14} />
                  {t('note_image_label')}
                </div>

                <label className="w-full px-2 py-2 text-xs text-gray-600 border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-700 cursor-pointer flex items-center justify-center gap-2">
                  <ImageIcon size={14} />
                  {t('note_add_image')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleAddImages(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>

                {tempImageIds.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {tempImageIds.map((id) => (
                      <div key={id} className="relative border rounded overflow-hidden bg-gray-50">
                        {tempImageUrls[id] ? (
                          <img
                            src={tempImageUrls[id]}
                            className="w-full aspect-square object-cover"
                            alt="note"
                          />
                        ) : (
                          <div className="aspect-square flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTempImage(id)}
                          className="absolute top-1 right-1 p-1 rounded bg-white/90 hover:bg-white text-gray-700"
                          title={t('note_delete')}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center justify-center gap-1"
                >
                  <Save size={12} />
                  {t('note_save')}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 flex items-center justify-center gap-1"
                >
                  <X size={12} />
                  {t('note_cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {hasAnyNote ? (
                <div
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-700 p-2 rounded cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{
                    backgroundColor: showType === 'hiragana' ? '#FEF3C7' : '#DBEAFE',
                    borderLeft: showType === 'hiragana' ? '3px solid #F59E0B' : '3px solid #3B82F6'
                  }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: showType === 'hiragana' ? '#B45309' : '#1E40AF' }}>
                    {showType === 'hiragana' ? t('note_hiragana_short') : t('note_katakana_short')}
                  </div>
                  {note ? note : <span className="text-gray-500">{t('note_image_only')}</span>}
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-2 py-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1"
                >
                  <Edit2 size={12} />
                  {showType === 'hiragana' ? t('note_add_hiragana') : t('note_add_katakana')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!isEditing && hoverOpen && (note.trim() || imageIds.length > 0) && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">{t('note_label')}</div>
          {note.trim() && <div className="text-xs text-gray-700 whitespace-pre-wrap mb-2">{note}</div>}
          {imageIds.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imageIds.map((id, idx) => {
                const url = imageUrls[id];
                if (!url) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    className="border rounded overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(idx);
                    }}
                    title={t('note_view_image')}
                  >
                    <img
                      src={url}
                      className="w-full h-24 object-cover"
                      alt="note"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {lightboxIndex !== null && lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              className="w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-black"
              alt="note"
            />

            {imageIds.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded bg-white/90 hover:bg-white text-gray-800"
                  onClick={() =>
                    setLightboxIndex(prev => {
                      if (prev === null) return prev;
                      return (prev - 1 + imageIds.length) % imageIds.length;
                    })
                  }
                  title={t('note_prev_image')}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded bg-white/90 hover:bg-white text-gray-800"
                  onClick={() =>
                    setLightboxIndex(prev => {
                      if (prev === null) return prev;
                      return (prev + 1) % imageIds.length;
                    })
                  }
                  title={t('note_next_image')}
                >
                  ›
                </button>
              </>
            )}

            <button
              type="button"
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white text-gray-800 shadow flex items-center justify-center hover:bg-gray-100"
              onClick={() => setLightboxIndex(null)}
              title={t('close')}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
