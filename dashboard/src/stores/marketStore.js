import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useMarketStore = defineStore('market', () => {
  const currenciesStats = ref([]);
  const isLoading = ref(true);
  const fetchError = ref(null);

  async function fetchLatestStats() {
    isLoading.value = true;
    fetchError.value = null;
    try {
      const savedMarketDays = localStorage.getItem('market:days');
      const parsedMarketDays = savedMarketDays ? parseInt(savedMarketDays, 10) : 30;
      const limit = isNaN(parsedMarketDays) ? 30 : parsedMarketDays;

      const res = await axios.get(`${API_BASE}/currencies/stats?days=${limit}`);
      currenciesStats.value = res.data;
    } catch (error) {
      console.error('API Fetch Error:', error);
      fetchError.value = 'Failed to fetch currency records. Is the bot server online?';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    currenciesStats,
    isLoading,
    fetchError,
    fetchLatestStats,
  };
});
