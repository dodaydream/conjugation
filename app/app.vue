<template>
  <UApp>
    <UContainer class="py-10 space-y-8">
      <header class="space-y-2">
        <h1 class="text-3xl font-semibold text-gray-900 dark:text-white">French Verb Conjugator</h1>
        <p class="text-gray-500 dark:text-gray-400">
          Search for a verb to see its conjugations. The first match will appear as an inline suggestion.
        </p>
      </header>

      <section class="space-y-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="verb-search">
          Verb search
        </label>
        <div class="relative">
          <div
            v-if="suggestion"
            class="pointer-events-none absolute inset-0 flex items-center px-3 py-2 text-gray-400 dark:text-gray-500"
          >
            <span class="text-transparent select-none">{{ query }}</span>
            <span class="select-none">{{ suggestionRemainder }}</span>
          </div>
          <UInput
            id="verb-search"
            v-model="query"
            icon="i-heroicons-magnifying-glass"
            size="lg"
            placeholder="Start typing a verb..."
            autocomplete="off"
            class="relative z-10 w-full"
            @keydown.tab.prevent="acceptSuggestion"
            @keydown.enter.prevent="acceptSuggestion"
          />
        </div>
        <p v-if="isLoading" class="text-sm text-gray-500">Searching…</p>
        <p v-else-if="query && !currentCandidate" class="text-sm text-gray-500">
          No matches found yet. Try a different spelling.
        </p>
      </section>

      <section v-if="currentCandidate" class="space-y-6">
        <UCard>
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">
              {{ currentCandidate.verb }}
            </h2>
            <UBadge v-if="currentCandidate.score !== undefined" color="primary" variant="subtle">
              Match score: {{ formatScore(currentCandidate.score) }}
            </UBadge>
          </div>
        </UCard>

        <div v-for="voice in voiceSections" :key="voice.key" class="space-y-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ formatLabel(voice.key) }}
          </h3>
          <div class="grid gap-4 md:grid-cols-2">
            <UCard v-for="section in voice.sections" :key="section.key" class="space-y-3">
              <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ formatLabel(section.key) }}
              </h4>
              <div v-for="tense in section.tenses" :key="tense.key" class="space-y-2">
                <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {{ formatLabel(tense.key) }}
                </p>
                <ul class="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                  <li v-for="form in tense.forms" :key="form.label + form.value" class="flex gap-2">
                    <span v-if="form.label" class="min-w-[3rem] font-medium text-gray-500 dark:text-gray-400">
                      {{ form.label }}
                    </span>
                    <span>{{ form.value }}</span>
                  </li>
                </ul>
              </div>
            </UCard>
          </div>
        </div>
      </section>
    </UContainer>
  </UApp>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { findVerbEntry } from './repositories/verbRepository';

const query = ref('');
const currentCandidate = ref<Awaited<ReturnType<typeof findVerbEntry>> | null>(null);
const isLoading = ref(false);

const normalizedQuery = computed(() => query.value.trim().toLowerCase());

watch(
  normalizedQuery,
  async (value) => {
    if (!value) {
      currentCandidate.value = null;
      return;
    }

    isLoading.value = true;
    try {
      currentCandidate.value = await findVerbEntry(value);
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
</script>
