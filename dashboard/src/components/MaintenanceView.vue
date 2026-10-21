<script setup>
defineProps({
  reason: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <div
    class="relative flex w-full max-w-xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6"
  >
    <!-- Ambient Single-Color Glow -->
    <div
      class="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
    />

    <!-- Main Card -->
    <div
      class="relative w-full overflow-hidden rounded-3xl border border-amber-500/20 bg-[#0c0f18] p-8 shadow-2xl backdrop-blur-xl sm:p-12"
    >
      <!-- Top Accent Line (Solid Single Color) -->
      <div class="absolute inset-x-0 top-0 h-1 bg-amber-500" />

      <!-- Single-Color Animated Beacon -->
      <div class="relative mx-auto mb-6 flex size-20 items-center justify-center">
        <!-- Outer pulsing ping ring -->
        <div class="absolute size-20 animate-ping rounded-full bg-amber-500/20 duration-1000" />
        <!-- Middle ring -->
        <div
          class="absolute size-14 rounded-full border border-amber-500/40 bg-amber-500/10 backdrop-blur-md"
        />
        <!-- Solid Amber Core -->
        <div
          class="relative size-5 rounded-full bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]"
        />
      </div>

      <!-- Status Pill (Single Color) -->
      <div
        class="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-[11px] font-bold tracking-widest text-amber-400 uppercase"
      >
        <span class="size-2 animate-pulse rounded-full bg-amber-400" />
        System Maintenance
      </div>

      <!-- Main Heading (Solid Color, No Gradient) -->
      <h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
        Maintenance Active
      </h1>

      <!-- Reason Block (Rendered ONLY if provided, completely hidden if empty) -->
      <div
        v-if="reason"
        class="relative mt-6 overflow-hidden rounded-2xl border border-amber-500/25 bg-[#121622] p-5 text-left shadow-lg"
      >
        <div
          class="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-amber-400 uppercase"
        >
          <font-awesome-icon icon="circle-info" class="text-amber-400" />
          <span>Notice</span>
        </div>
        <p class="mt-2 text-sm leading-relaxed font-medium text-slate-200 sm:text-base">
          {{ reason }}
        </p>
      </div>
    </div>
  </div>
</template>
