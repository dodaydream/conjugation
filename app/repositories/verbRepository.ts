import Fuse from 'fuse.js';

type VerbEntry = Record<string, unknown>;
type VerbDictionary = Record<string, VerbEntry>;

type VerbSearchResult = {
  verb: string;
  entry: VerbEntry;
  score?: number;
};

let verbDictionaryPromise: Promise<VerbDictionary> | null = null;
let fusePromise: Promise<Fuse<string>> | null = null;

const loadVerbDictionary = async (): Promise<VerbDictionary> => {
  if (!verbDictionaryPromise) {
    verbDictionaryPromise = $fetch<VerbDictionary>('/verbs.min.json');
  }

  return verbDictionaryPromise;
};

const loadFuse = async (): Promise<Fuse<string>> => {
  if (!fusePromise) {
    fusePromise = loadVerbDictionary().then((dictionary) => {
      const verbs = Object.keys(dictionary);
      return new Fuse(verbs, {
        includeScore: true,
        threshold: 0.3,
        ignoreLocation: true,
      });
    });
  }

  return fusePromise;
};

export const findVerbEntry = async (query: string): Promise<VerbSearchResult | null> => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  const dictionary = await loadVerbDictionary();
  const exactMatch = dictionary[normalizedQuery];

  if (exactMatch) {
    return { verb: normalizedQuery, entry: exactMatch };
  }

  const fuse = await loadFuse();
  const [bestMatch] = fuse.search(normalizedQuery);

  if (!bestMatch) {
    return null;
  }

  const entry = dictionary[bestMatch.item];

  if (!entry) {
    return null;
  }

  return { verb: bestMatch.item, entry, score: bestMatch.score };
};

export const getVerbEntry = async (verb: string): Promise<VerbEntry | null> => {
  const normalizedVerb = verb.trim().toLowerCase();

  if (!normalizedVerb) {
    return null;
  }

  const dictionary = await loadVerbDictionary();

  return dictionary[normalizedVerb] ?? null;
};
