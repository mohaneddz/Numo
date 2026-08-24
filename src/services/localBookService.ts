import { open } from '@tauri-apps/plugin-dialog';
import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { LOCAL_LANGUAGE_CODE, type ImmersionResource } from '../pages/Immerse/immersionCatalog';

const BOOKS_FOLDER_KEY = 'numo_books_folder_v1';
const LOCAL_BOOKS_KEY = 'numo_local_books_v1';
export const LOCAL_BOOKS_CHANGED_EVENT = 'numo:local-books-changed';

export interface LocalBook {
  id: string;
  path: string;
  title: string;
  format: 'epub' | 'txt';
}

function fileTitle(name: string): string {
  return name
    .replace(/\.(epub|txt)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bookId(path: string): string {
  let hash = 2166136261;
  for (let index = 0; index < path.length; index += 1) {
    hash ^= path.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `local-book-${(hash >>> 0).toString(36)}`;
}

export function getBooksFolder(): string {
  return localStorage.getItem(BOOKS_FOLDER_KEY) ?? '';
}

export function getLocalBooks(): LocalBook[] {
  try {
    const books = JSON.parse(localStorage.getItem(LOCAL_BOOKS_KEY) ?? '[]') as LocalBook[];
    return Array.isArray(books) ? books : [];
  } catch {
    return [];
  }
}

export function getLocalBook(id?: string): LocalBook | null {
  return getLocalBooks().find((book) => book.id === id) ?? null;
}

export function localBookToResource(book: LocalBook): ImmersionResource {
  return {
    id: book.id,
    kind: 'reading',
    category: 'My Books',
    title: book.title,
    subtitle: `${book.format.toUpperCase()} imported from your books folder`,
    level: 'Personal',
    duration: 'Local',
    accent: 'from-slate-500/45 via-indigo-800/25 to-[#0B1020]',
    // The app cannot know what language an imported file is in, so local books are
    // marked with a sentinel and always shown. Hiding the learner's own file behind
    // a language filter would be worse than showing it under the wrong language.
    languageCode: LOCAL_LANGUAGE_CODE,
    tags: ['Local', book.format.toUpperCase()],
    author: 'Local library',
    sourceLabel: 'Books folder',
    localPath: book.path,
    localFormat: book.format,
  };
}

export function getLocalBookResources(): ImmersionResource[] {
  return getLocalBooks().map(localBookToResource);
}

export async function chooseBooksFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Choose your books folder',
    defaultPath: getBooksFolder() || undefined,
  });
  if (typeof selected !== 'string') return null;
  localStorage.setItem(BOOKS_FOLDER_KEY, selected);
  await scanBooksFolder(selected);
  return selected;
}

export async function scanBooksFolder(folder = getBooksFolder()): Promise<LocalBook[]> {
  if (!folder) {
    localStorage.removeItem(LOCAL_BOOKS_KEY);
    window.dispatchEvent(new Event(LOCAL_BOOKS_CHANGED_EVENT));
    return [];
  }

  const entries = await readDir(folder);
  const books: LocalBook[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name || !/\.(epub|txt)$/i.test(entry.name)) continue;
    const path = await join(folder, entry.name);
    books.push({
      id: bookId(path),
      path,
      title: fileTitle(entry.name),
      format: entry.name.toLowerCase().endsWith('.epub') ? 'epub' : 'txt',
    });
  }
  books.sort((left, right) => left.title.localeCompare(right.title));
  localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(books));
  window.dispatchEvent(new Event(LOCAL_BOOKS_CHANGED_EVENT));
  return books;
}

export async function readLocalBookBytes(path: string): Promise<Uint8Array> {
  return readFile(path);
}

