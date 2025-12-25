<template>
  <div
    class="relative flex w-96 flex-none flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900"
  >
    <div class="flex items-center gap-2">
      <span class="h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-primary-100 dark:ring-primary-950"></span>
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        {{ item.label }}
      </p>
    </div>
    <div class="grid grid-cols-2 gap-1">
    <div v-for="section in item.sections" :key="section.key">
      <p class="text-[0.7rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {{ formatLabel(section.key) }}
      </p>
      <ul class="space-y-0.5 text-xs text-gray-700 dark:text-gray-200">
        <li
          v-for="form in section.forms"
          :key="form.label + form.value"
          class="grid grid-cols-[minmax(2.5rem,3.5rem)_1fr] gap-2"
        >
          <span v-if="form.label" class="font-medium text-gray-500 dark:text-gray-400">
            {{ form.label }}
          </span>
          <span>
            <span
              v-for="(part, partIndex) in getHighlightedParts(form.value)"
              :key="`${form.label}-${partIndex}`"
              :class="part.isMatch ? 'font-semibold text-green-600 dark:text-green-400' : ''"
            >
              {{ part.text }}
            </span>
          </span>
        </li>
      </ul>
    </div>
        </div>
  </div>
</template>

<script setup lang="ts">
type TimelineItem = {
  key: string;
  label: string;
  sections: Array<{
    key: string;
    forms: Array<{ label: string; value: string }>;
  }>;
};

import { computed } from 'vue';

const props = defineProps<{
  item: TimelineItem;
  formatLabel: (label: string) => string;
  highlightTerm: string;
}>();

const normalizedHighlight = computed(() => props.highlightTerm.trim().toLowerCase());

const getHighlightedParts = (value: string) => {
  const term = normalizedHighlight.value;

  if (!term) {
    return [{ text: value, isMatch: false }];
  }

  const lowerValue = value.toLowerCase();
  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let startIndex = 0;
  let matchIndex = lowerValue.indexOf(term);

  if (matchIndex === -1) {
    return [{ text: value, isMatch: false }];
  }

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push({ text: value.slice(startIndex, matchIndex), isMatch: false });
    }

    parts.push({ text: value.slice(matchIndex, matchIndex + term.length), isMatch: true });
    startIndex = matchIndex + term.length;
    matchIndex = lowerValue.indexOf(term, startIndex);
  }

  if (startIndex < value.length) {
    parts.push({ text: value.slice(startIndex), isMatch: false });
  }

  return parts;
};
</script>
