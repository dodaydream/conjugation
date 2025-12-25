<template>
<UTimeline
  :items="items"
  orientation="horizontal"
  :ui="{ item: 'odd:flex-col-reverse odd:-translate-y-[calc(100%-1rem)]', root: 'w-full' }"
  class="h-full"
  size="2xs"
  :default-value="defaultIndex"
>
  <template #description="{item}">
    <div>
      <TimelineCard :item="item" :format-label="formatLabel" :highlight-term="highlightTerm" />
    </div>
  </template>
</UTimeline>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TimelineCard from './TimelineCard.vue';

type TimelineItem = {
  key: string;
  label: string;
  sections: Array<{
    key: string;
    forms: Array<{ label: string; value: string }>;
  }>;
};

const props = defineProps<{
  items: TimelineItem[];
  formatLabel: (label: string) => string;
  highlightTerm: string;
}>();

const defaultIndex = computed(() => {
  const presentIndex = props.items.findIndex((item) => item.key === 'present');
  return presentIndex >= 0 ? presentIndex : 0;
});
</script>
