<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  currencies: {
    type: Array,
    required: true,
  },
});

const amountInput = ref('1');
const amount = computed(() => parseFloat(amountInput.value) || 0);
const taxEnabled = ref(false);

const fromCurrencyId = ref('arc');
const toCurrencyId = ref('');

if (props.currencies && props.currencies.length > 0) {
  toCurrencyId.value = props.currencies[0].id;
}

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
  if (!taxEnabled.value) return 0;
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
    class="bg-[#11131c] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md"
  >
    <div class="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800/50">
      <font-awesome-icon icon="calculator" class="text-emerald-500" />
      <h2 class="text-lg font-semibold text-slate-100">Exchange Calculator</h2>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
          >Amount</label
        >
        <div class="relative rounded-lg shadow-sm">
          <input
            type="text"
            v-model="amountInput"
            @input="
              amountInput = $event.target.value
                .replace(/[^0-9.]/g, '')
                .replace(/(\..*?)\..*/g, '$1')
            "
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Enter value"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-9 items-center gap-3">
        <div class="md:col-span-4">
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >From</label
          >
          <select
            v-model="fromCurrencyId"
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option v-for="opt in allOptions" :key="'from-' + opt.id" :value="opt.id">
              {{ opt.name }} [{{ opt.nation }}]
            </option>
          </select>
        </div>

        <div class="md:col-span-1 flex justify-center pt-5">
          <button
            @click="swapCurrencies"
            class="w-10 h-10 rounded-full bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center transition-all duration-200"
            title="Swap source and destination"
          >
            <font-awesome-icon icon="rotate" class="text-sm" />
          </button>
        </div>

        <div class="md:col-span-4">
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
            >To</label
          >
          <select
            v-model="toCurrencyId"
            class="block w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option v-for="opt in allOptions" :key="'to-' + opt.id" :value="opt.id">
              {{ opt.name }} [{{ opt.nation }}]
            </option>
          </select>
        </div>
      </div>

      <!-- Server Tax Toggle -->
      <div class="flex items-center gap-3 mt-1">
        <label class="relative inline-flex items-center cursor-pointer select-none">
          <input type="checkbox" v-model="taxEnabled" class="sr-only peer" />
          <div
            class="w-9 h-5 rounded-full bg-slate-800 border border-slate-700 peer-focus:ring-1 peer-focus:ring-emerald-500 peer-checked:bg-emerald-600 peer-checked:border-emerald-500 transition-colors duration-200 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all after:duration-200 peer-checked:after:translate-x-4 peer-checked:after:bg-white"
          ></div>
        </label>
        <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >Include Server Tax (5%)</span
        >
      </div>

      <div
        class="bg-slate-950 border border-slate-900/60 rounded-xl p-5 mt-4 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div>
          <div class="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Converted Value
          </div>
          <div class="text-xl md:text-2xl font-bold font-mono text-emerald-400 mt-1">
            {{ formattedInputAmount }} {{ fromCurrency ? fromCurrency.name.split(' (')[0] : '' }}
          </div>
          <div class="text-2xl md:text-3xl font-extrabold font-mono text-slate-100 mt-1">
            ≈ {{ formattedConvertedAmount }}
            {{ toCurrency ? toCurrency.name.split(' (')[0] : '' }}
          </div>
          <div v-if="taxEnabled" class="text-sm font-mono font-medium text-orange-400/90 mt-1.5">
            🔥 {{ formattedTaxArc }} ARC burned as server tax
          </div>
        </div>

        <div
          class="text-right border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-6 flex-shrink-0"
        >
          <div class="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Exchange Rate
          </div>
          <div class="text-sm font-mono font-medium text-slate-300 mt-1">
            1 {{ fromCurrency ? fromCurrency.id.toUpperCase() : '' }} = {{ formattedRate }}
            {{ toCurrency ? toCurrency.id.toUpperCase() : '' }}
          </div>
          <div class="text-sm font-mono font-medium text-slate-300 mt-0.5">
            1 {{ toCurrency ? toCurrency.id.toUpperCase() : '' }} = {{ formattedInverseRate }}
            {{ fromCurrency ? fromCurrency.id.toUpperCase() : '' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
