import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useTownyStore = defineStore('towny', () => {
  const townyData = ref(null);
  const isLoading = ref(true);
  const fetchError = ref(null);

  // Filters & Tabs
  const activeTab = ref('towns');
  const searchQuery = ref('');
  const sortBy = ref('residents_desc');

  // Modals state
  const selectedTown = ref(null);
  const selectedNation = ref(null);

  async function fetchTownyData() {
    isLoading.value = true;
    fetchError.value = null;
    try {
      const res = await axios.get(`${API_BASE}/towny`);
      townyData.value = res.data;

      // Preload head images in background so they're cached before render
      preloadHeadImages(res.data);
    } catch (error) {
      console.error('Failed to fetch Towny data:', error);
      fetchError.value = 'Failed to load Towny data. Is the API service online?';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Preloads mayor and king head images in the background using Image() objects.
   * Loads in batches of 8 with small delays to avoid saturating the browser connection pool.
   */
  function preloadHeadImages(data) {
    if (!data) return;
    const names = new Set();

    if (data.towns) {
      for (const t of data.towns) {
        if (t.mayor?.name) names.add(t.mayor.name.toLowerCase());
      }
    }
    if (data.nations) {
      for (const n of data.nations) {
        if (n.king?.name) names.add(n.king.name.toLowerCase());
      }
    }

    const list = [...names];
    const BATCH = 8;
    let i = 0;

    function loadBatch() {
      const batch = list.slice(i, i + BATCH);
      for (const name of batch) {
        const img = new Image();
        img.src = `${API_BASE}/heads/${name}.png`;
      }
      i += BATCH;
      if (i < list.length) {
        setTimeout(loadBatch, 150);
      }
    }

    if (list.length > 0) loadBatch();
  }

  return {
    townyData,
    isLoading,
    fetchError,
    activeTab,
    searchQuery,
    sortBy,
    selectedTown,
    selectedNation,
    fetchTownyData,
  };
});
