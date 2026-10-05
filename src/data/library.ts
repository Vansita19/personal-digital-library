import collection from './library-books.json';
export type Book = {
  id: string; title: string; author: string; category: string;
  color: string; ink: string; motif: string; status: string;
  description: string; rating: number | null; cover: string | null; backCover?: string;
};
// Transcribed from Vansita's bookshelf photographs and Goodreads screenshots.
// Read status and ratings are imported only where the screenshots establish them.
export const books: Book[] = collection;
