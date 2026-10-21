<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  currencies: {
    type: Array,
    required: true,
  },
});

const amountInput = ref(localStorage.getItem('exchange:amount') || '1');
const amount = computed(() => parseFloat(amountInput.value) || 0);
const taxEnabled = ref(localStorage.getItem('exchange:tax_enabled') === 'true');

const fromCurrencyId = ref(localStorage.getItem('exchange:from') || 'arc');
const toCurrencyId = ref(localStorage.getItem('exchange:to') || '');
const isToArc = computed(() => toCurrencyId.value?.toLowerCase() === 'arc');
const isConvertingToArc = computed(
  () => isToArc.value && fromCurrencyId.value?.toLowerCase() !== 'arc'
);

watch(
  () => toCurrencyId.value,
  (newTo) => {
    if (newTo?.toLowerCase() === 'arc') {
      taxEnabled.value = false;
    }
  },
  { immediate: true }
);

import { useRoute } from 'vue-router';

const route = useRoute();

function checkQueryParams() {
  if (route?.query?.from) {
    const qFrom = String(route.query.from).toLowerCase().trim();
    if (qFrom === 'arc' || props.currencies.some((c) => c.id?.toLowerCase() === qFrom)) {
      fromCurrencyId.value = qFrom;
    }
  }
  if (route?.query?.to) {
    const qTo = String(route.query.to).toLowerCase().trim();
    if (qTo === 'arc' || props.currencies.some((c) => c.id?.toLowerCase() === qTo)) {
      toCurrencyId.value = qTo;
    }
  }
  if (route?.query?.amount) {
    amountInput.value = String(route.query.amount);
  }
}

checkQueryParams();

watch(
  () => [route?.query?.from, route?.query?.to, props.currencies],
  () => {
    checkQueryParams();
  },
  { deep: true }
);

watch(
  [amountInput, taxEnabled, fromCurrencyId, toCurrencyId],
  ([newAmount, newTax, newFrom, newTo]) => {
    localStorage.setItem('exchange:amount', newAmount);
    localStorage.setItem('exchange:tax_enabled', String(newTax));
    localStorage.setItem('exchange:from', newFrom || '');
    localStorage.setItem('exchange:to', newTo || '');
  }
);

const allOptions = computed(() => {
  const arcOption = {
    id: 'arc',
    name: 'Arcadia (ARC)',
    standardItem: 'GOLD_INGOT',
    nation: 'Global',
    liveRate: 1.0,
    baseRate: 1.0,
  };
  return [arcOption, ...props.currencies];
});

const fromCurrency = computed(() => {
  return allOptions.value.find((c) => c.id === fromCurrencyId.value);
});

const toCurrency = computed(() => {
  return allOptions.value.find((c) => c.id === toCurrencyId.value);
});

const conversionRate = computed(() => {
  if (!fromCurrency.value || !toCurrency.value) return 0;
  const rateFrom = parseFloat(fromCurrency.value.liveRate) || 0;
  const rateTo = parseFloat(toCurrency.value.liveRate) || 0;
  if (rateTo === 0) return 0;
  return rateFrom / rateTo;
});

const arcAmount = computed(() => {
  if (!fromCurrency.value) return 0;
  return amount.value * (parseFloat(fromCurrency.value.liveRate) || 0);
});

const taxArc = computed(() => {
  if (!taxEnabled.value || isToArc.value) return 0;
  return arcAmount.value * 0.05;
});

const netArc = computed(() => {
  return arcAmount.value - taxArc.value;
});

const convertedAmount = computed(() => {
  if (!toCurrency.value) return 0;
  const rateTo = parseFloat(toCurrency.value.liveRate) || 0;
  if (rateTo === 0) return 0;
  return netArc.value / rateTo;
});

function swapCurrencies() {
  const temp = fromCurrencyId.value;
  fromCurrencyId.value = toCurrencyId.value;
  toCurrencyId.value = temp;
}

// Strictly format numbers using the same rounding & locale logic as exchange.js
const formatPrice = (val) => {
  const rounded = Math.round(val * 1000) / 1000;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
};

const formattedInputAmount = computed(() => formatPrice(amount.value));
const formattedConvertedAmount = computed(() => formatPrice(convertedAmount.value));
const formattedRate = computed(() => formatPrice(conversionRate.value));
const formattedInverseRate = computed(() => {
  if (conversionRate.value === 0) return '0.000';
  return formatPrice(1 / conversionRate.value);
});
const formattedTaxArc = computed(() => formatPrice(taxArc.value));
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#11131c] p-6 shadow-xl backdrop-blur-md"
  >
    <div class="mb-4 flex items-center gap-2 border-b border-slate-800/50 pb-4">
      <font-awesome-icon icon="calculator" class="text-emerald-500" />
      <h2 class="text-lg font-semibold text-slate-100">Exchange Calculator</h2>
    </div>

    <div class="space-y-4">
      <div>
        <label class="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
          >Amount</label
        >
        <div class="relative rounded-lg shadow-sm">
          <input
            v-model="amountInput"
            type="text"
            class="block w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            placeholder="Enter value"
            @input="
              amountInput = $event.target.value
                .replace(/[^0-9.]/g, '')
                .replace(/(\..*?)\..*/g, '$1')
            "
          />
        </div>
      </div>

      <div class="grid grid-cols-1 items-center gap-3 sm:grid-cols-9">
        <div class="md:col-span-4">
          <label class="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
            >From</label
          >
          <select
            v-model="fromCurrencyId"
            class="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option v-for="opt in allOptions" :key="'from-' + opt.id" :value="opt.id">
              {{ opt.name }} [{{ opt.nation }}]
            </option>
          </select>
        </div>

        <div class="flex justify-center pt-5 md:col-span-1">
          <button
            class="flex size-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-300 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800"
            title="Swap source and destination"
            @click="swapCurrencies"
          >
            <font-awesome-icon icon="rotate" class="text-sm" />
          </button>
        </div>

        <div class="md:col-span-4">
          <label class="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase"
            >To</label
          >
          <select
            v-model="toCurrencyId"
            class="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option v-for="opt in allOptions" :key="'to-' + opt.id" :value="opt.id">
              {{ opt.name }} [{{ opt.nation }}]
            </option>
          </select>
        </div>
      </div>

      <!-- Base ARC Notice -->
      <div
        v-if="isConvertingToArc"
        class="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300/90"
      >
        <font-awesome-icon icon="circle-info" class="mt-0.5 shrink-0 text-sm text-amber-400" />
        <span>
          Other currencies cannot be exchanged back to ARC in-game. As ARC is the base currency,
          server conversion tax does not apply.
        </span>
      </div>

      <!-- Server Tax Toggle -->
      <div class="mt-1 flex items-center gap-3">
        <label
          class="relative inline-flex items-center select-none"
          :class="isToArc ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
        >
          <input v-model="taxEnabled" type="checkbox" :disabled="isToArc" class="peer sr-only" />
          <div
            class="h-5 w-9 rounded-full border border-slate-700 bg-slate-800 transition-colors duration-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-600 peer-focus:ring-1 peer-focus:ring-emerald-500 after:absolute after:top-[3px] after:left-[3px] after:size-3.5 after:rounded-full after:bg-slate-400 after:transition-all after:duration-200 after:content-[''] peer-checked:after:translate-x-4 peer-checked:after:bg-white"
          />
        </label>
        <span class="text-xs font-semibold tracking-wider text-slate-400 uppercase"
          >Include Server Tax (5%)</span
        >
        <span v-if="isToArc" class="text-xs font-medium text-slate-500 italic">
          (Tax not applicable for ARC)
        </span>
      </div>

      <div
        class="mt-4 flex flex-col items-stretch justify-between gap-4 rounded-xl border border-slate-900/60 bg-slate-950 p-4 sm:flex-row sm:items-center sm:p-5"
      >
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Converted Value
          </div>
          <div
            class="mt-1 truncate font-mono text-lg font-bold text-emerald-400 sm:text-xl md:text-2xl"
          >
            {{ formattedInputAmount }} {{ fromCurrency ? fromCurrency.name.split(' (')[0] : '' }}
          </div>
          <div
            class="mt-1 truncate font-mono text-xl font-extrabold text-slate-100 sm:text-2xl md:text-3xl"
          >
            ≈ {{ formattedConvertedAmount }}
            {{ toCurrency ? toCurrency.name.split(' (')[0] : '' }}
          </div>
          <div
            v-if="taxEnabled && !isToArc"
            class="mt-1.5 font-mono text-sm font-medium text-orange-400/90"
          >
            🔥 {{ formattedTaxArc }} ARC burned as server tax
          </div>
        </div>

        <div
          class="flex-shrink-0 border-t border-slate-800/80 pt-3 text-left sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 sm:text-right"
        >
          <div class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Exchange Rate
          </div>
          <div class="mt-1 font-mono text-sm font-medium text-slate-300">
            1 {{ fromCurrency ? fromCurrency.id.toUpperCase() : '' }} = {{ formattedRate }}
            {{ toCurrency ? toCurrency.id.toUpperCase() : '' }}
          </div>
          <div class="mt-0.5 font-mono text-sm font-medium text-slate-300">
            1 {{ toCurrency ? toCurrency.id.toUpperCase() : '' }} = {{ formattedInverseRate }}
            {{ fromCurrency ? fromCurrency.id.toUpperCase() : '' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
