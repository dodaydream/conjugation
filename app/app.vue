<template>
  <UApp class="h-full flex flex-col w-full">
    <section class="space-y-4 p-6">
      <div class="relative">
        <UInput id="verb-search" v-model="query" icon="i-heroicons-magnifying-glass" size="lg"
          placeholder="Start typing a verb..." autocomplete="off" class="relative z-10 w-full"
          @keydown.tab.prevent="acceptSuggestion" @keydown.enter.prevent="acceptSuggestion" />
        <div
          v-if="showCandidates"
          class="absolute left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li v-for="candidate in candidates" :key="candidate.verb">
              <button
                type="button"
                class="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                @mousedown.prevent
                @click="selectCandidate(candidate.verb)"
              >
                <span>{{ candidate.verb }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <div class="flex-1 h-full flex w-full">
      <p v-if="isLoading" class="text-sm text-gray-500">Searching…</p>
      <p v-else-if="query && !currentCandidate" class="text-sm text-gray-500">
        No matches found yet. Try a different spelling.
      </p>

      <section v-if="currentCandidate" class="space-y-6 mt-12 w-full p-6">
        <h2 class="text-3xl font-semibold text-gray-900 dark:text-white">
          {{ currentCandidate.verb }}
        </h2>

        <div class="flex-1 h-full w-full">
         <div v-for="voice in voiceSections" :key="voice.key" class="h-full w-full">
          <UScrollArea :ui="{ root: 'w-full h-full flex justify-center items-center', viewport: 'w-full' }" orientation="horizontal">
            <IndicativeTimeline v-if="indicatifTimeline(voice).length" :items="indicatifTimeline(voice)"
              :format-label="formatLabel"/>
          </UScrollArea>
        </div>
        </div>
      </section>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import IndicativeTimeline from './components/IndicativeTimeline.vue';
import { findVerbEntry, type VerbCandidate, searchVerbCandidates } from './repositories/verbRepository';

const query = ref('');
const currentCandidate = ref<Awaited<ReturnType<typeof findVerbEntry>> | null>(null);
const isLoading = ref(false);
const candidates = ref<VerbCandidate[]>([]);

const normalizedQuery = computed(() => query.value.trim().toLowerCase());

watch(
  normalizedQuery,
  async (value) => {
    if (!value) {
      currentCandidate.value = null;
      candidates.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const [entry, list] = await Promise.all([
        findVerbEntry(value),
        searchVerbCandidates(value),
      ]);
      currentCandidate.value = entry;
      candidates.value = list;
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true }
);

const suggestion = computed(() => {
  if (!currentCandidate.value || !normalizedQuery.value) {
    return '';
  }

  const verb = currentCandidate.value.verb;

  return verb.startsWith(normalizedQuery.value) ? verb : '';
});

const suggestionRemainder = computed(() => {
  if (!suggestion.value) {
    return '';
  }

  return suggestion.value.slice(normalizedQuery.value.length);
});

const acceptSuggestion = () => {
  if (suggestion.value) {
    query.value = suggestion.value;
  }
};

const selectCandidate = (verb: string) => {
  query.value = verb;
};

const showCandidates = computed(() => normalizedQuery.value && candidates.value.length > 0);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const formatLabel = (label: string) =>
  label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatScore = (score: number) => Math.round((1 - score) * 100);

const formatForms = (value: unknown) => {
  if (typeof value === 'string') {
    return [{ label: '', value }];
  }

  if (isRecord(value)) {
    return Object.entries(value).map(([label, formValue]) => ({
      label,
      value: typeof formValue === 'string' ? formValue : JSON.stringify(formValue),
    }));
  }

  return [{ label: '', value: String(value) }];
};

const voiceSections = computed(() => {
  if (!currentCandidate.value) {
    return [] as Array<{
      key: string;
      sections: Array<{
        key: string;
        tenses: Array<{ key: string; forms: Array<{ label: string; value: string }> }>;
      }>;
    }>;
  }

  const entry = currentCandidate.value.entry as Record<string, unknown>;

  return Object.entries(entry)
    .filter(([key, value]) => key.startsWith('voix_') && isRecord(value))
    .map(([key, voiceValue]) => {
      const sections = Object.entries(voiceValue)
        .filter(([, sectionValue]) => isRecord(sectionValue))
        .map(([sectionKey, sectionValue]) => {
          const tenses = Object.entries(sectionValue).map(([tenseKey, tenseValue]) => ({
            key: tenseKey,
            forms: formatForms(tenseValue),
          }));

          return {
            key: sectionKey,
            tenses,
          };
        });

      return {
        key,
        sections,
      };
    });
});

const indicatifTimelineOrder = [
  'plus_que_parfait',
  'passe_anterieur',
  'passe_compose',
  'passe_simple',
  'imparfait',
  'present',
  'futur_anterieur',
  'futur_simple',
];

const indicatifTimelineLabels: Record<string, string> = {
  plus_que_parfait: 'Plus-que-parfait',
  passe_anterieur: 'Passé antérieur',
  passe_compose: 'Passé composé',
  passe_simple: 'Passé simple',
  imparfait: 'Imparfait',
  present: 'Présent',
  futur_simple: 'Futur simple',
  futur_anterieur: 'Futur antérieur',
};

const indicatifTimeline = (voice: {
  key: string;
  sections: Array<{
    key: string;
    tenses: Array<{ key: string; forms: Array<{ label: string; value: string }> }>;
  }>;
}) => {
  return indicatifTimelineOrder
    .map((tenseKey) => {
      const sections = voice.sections
        .map((section) => {
          const tense = section.tenses.find((item) => item.key === tenseKey);

          if (!tense) {
            return null;
          }

          return {
            key: section.key,
            forms: tense.forms,
          };
        })
        .filter((section): section is { key: string; forms: Array<{ label: string; value: string }> } =>
          Boolean(section)
        );

      if (!sections.length) {
        return null;
      }

      return {
        key: tenseKey,
        label: indicatifTimelineLabels[tenseKey] ?? formatLabel(tenseKey),
        sections,
      };
    })
    .filter(
      (item): item is { key: string; label: string; sections: Array<{ key: string; forms: Array<{ label: string; value: string }> }> } =>
        Boolean(item)
    );
};
</script>
