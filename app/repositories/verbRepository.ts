import Fuse from 'fuse.js';

type VerbEntry = Record<string, unknown>;
type VerbDictionary = Record<string, VerbEntry>;

type VerbSearchResult = {
  verb: string;
  entry: VerbEntry;
  score?: number;
};

export type VerbCandidate = {
  verb: string;
  score?: number;
};

let verbDictionaryPromise: Promise<VerbDictionary> | null = null;
let fusePromise: Promise<Fuse<string>> | null = null;
let verbFormIndexPromise: Promise<Map<string, string>> | null = null;

const loadVerbDictionary = async (): Promise<VerbDictionary> => {
  if (!verbDictionaryPromise) {
    verbDictionaryPromise = $fetch<VerbDictionary>('/verbs.min.json');
  }

  return verbDictionaryPromise;
};

const addFormValues = (value: unknown, forms: Set<string>): void => {
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue) {
      forms.add(normalizedValue);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => addFormValues(item, forms));
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => addFormValues(item, forms));
  }
};

const loadVerbFormIndex = async (): Promise<Map<string, string>> => {
  if (!verbFormIndexPromise) {
    verbFormIndexPromise = loadVerbDictionary().then((dictionary) => {
      const index = new Map<string, string>();

      Object.entries(dictionary).forEach(([verb, entry]) => {
        const forms = new Set<string>();
        addFormValues(entry, forms);
        forms.forEach((form) => {
          if (!index.has(form)) {
            index.set(form, verb);
          }
        });
      });

      return index;
    });
  }

  return verbFormIndexPromise;
};

const loadFuse = async (): Promise<Fuse<string>> => {
  if (!fusePromise) {
    fusePromise = loadVerbDictionary().then((dictionary) => {
      const verbs = Object.keys(dictionary);
      return new Fuse(verbs, {
        includeScore: true,
        threshold: 0.3,
        ignoreLocation: true,
        ignoreDiacritics: true
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

  const formIndex = await loadVerbFormIndex();
  const matchedVerb = formIndex.get(normalizedQuery);

  if (matchedVerb) {
    const entry = dictionary[matchedVerb];

    if (entry) {
      return { verb: matchedVerb, entry };
    }
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

export const searchVerbCandidates = async (
  query: string,
  limit = 8
): Promise<VerbCandidate[]> => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery || limit <= 0) {
    return [];
  }

  const dictionary = await loadVerbDictionary();
  const results: VerbCandidate[] = [];
  const seen = new Set<string>();

  const addCandidate = (verb: string, score?: number) => {
    if (!verb || seen.has(verb) || !dictionary[verb]) {
      return;
    }

    seen.add(verb);
    results.push({ verb, score });
  };

  addCandidate(normalizedQuery);

  const formIndex = await loadVerbFormIndex();
  const matchedVerb = formIndex.get(normalizedQuery);

  if (matchedVerb) {
    addCandidate(matchedVerb);
  }

  const fuse = await loadFuse();
  const remaining = Math.max(limit - results.length, 0);
  const matches = remaining ? fuse.search(normalizedQuery, { limit: remaining }) : [];

  matches.forEach((match) => addCandidate(match.item, match.score));

  return results.slice(0, limit);
};

export const getVerbEntry = async (verb: string): Promise<VerbEntry | null> => {
  const normalizedVerb = verb.trim().toLowerCase();

  if (!normalizedVerb) {
    return null;
  }

  const dictionary = await loadVerbDictionary();

  return dictionary[normalizedVerb] ?? null;
};
