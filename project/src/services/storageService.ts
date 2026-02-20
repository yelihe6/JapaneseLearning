import { UserNote } from '../types/kana';

const NOTES_KEY_PREFIX = 'kana_user_notes_';
const LEGACY_NOTES_KEY = 'kana_user_notes';

function getNotesKey(userId: string): string {
  return `${NOTES_KEY_PREFIX}${userId}`;
}

export class StorageService {
  getAllNotes(userId: string): UserNote[] {
    const key = getNotesKey(userId);
    let data = localStorage.getItem(key);
    if (!data) {
      const legacy = localStorage.getItem(LEGACY_NOTES_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_NOTES_KEY);
        data = legacy;
      }
    }
    try {
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getNote(kanaId: string, userId: string): UserNote | undefined {
    const notes = this.getAllNotes(userId);
    return notes.find(note => note.kanaId === kanaId);
  }

  saveNote(kanaId: string, noteHiragana: string | undefined, noteKatakana: string | undefined, userId: string): void {
    const notes = this.getAllNotes(userId);
    const existingIndex = notes.findIndex(note => note.kanaId === kanaId);

    const existingNote = existingIndex >= 0 ? notes[existingIndex] : null;

    const newNote: UserNote = {
      kanaId,
      noteHiragana: noteHiragana !== undefined ? noteHiragana : existingNote?.noteHiragana,
      noteKatakana: noteKatakana !== undefined ? noteKatakana : existingNote?.noteKatakana,
      imagesHiragana: existingNote?.imagesHiragana,
      imagesKatakana: existingNote?.imagesKatakana,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      notes[existingIndex] = newNote;
    } else {
      notes.push(newNote);
    }

    localStorage.setItem(getNotesKey(userId), JSON.stringify(notes));
  }

  saveImages(kanaId: string, imagesHiragana: string[] | undefined, imagesKatakana: string[] | undefined, userId: string): void {
    const notes = this.getAllNotes(userId);
    const existingIndex = notes.findIndex(note => note.kanaId === kanaId);

    const existingNote = existingIndex >= 0 ? notes[existingIndex] : null;

    const newNote: UserNote = {
      kanaId,
      noteHiragana: existingNote?.noteHiragana,
      noteKatakana: existingNote?.noteKatakana,
      imagesHiragana: imagesHiragana !== undefined ? imagesHiragana : existingNote?.imagesHiragana,
      imagesKatakana: imagesKatakana !== undefined ? imagesKatakana : existingNote?.imagesKatakana,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      notes[existingIndex] = newNote;
    } else {
      notes.push(newNote);
    }

    localStorage.setItem(getNotesKey(userId), JSON.stringify(notes));
  }

  deleteNote(kanaId: string, userId: string): void {
    const notes = this.getAllNotes(userId);
    const filtered = notes.filter(note => note.kanaId !== kanaId);
    localStorage.setItem(getNotesKey(userId), JSON.stringify(filtered));
  }
}

export const storageService = new StorageService();
