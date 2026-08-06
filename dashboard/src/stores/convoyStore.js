import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useConvoyStore = defineStore('convoy', () => {
  const convoyItems = ref([]);
  const isLoading = ref(true);
  const fetchError = ref(null);

  // Persistent filter options
  const searchQuery = ref('');
  const activeRarityFilter = ref('all');
  const activeSubView = ref('live');

  async function fetchConvoyData() {
    isLoading.value = true;
    fetchError.value = null;
    try {
      const res = await axios.get(`${API_BASE}/currencies/convoy/all`);
      convoyItems.value = res.data.map((item) => ({
        ...item,
        imageError: false,
      }));
    } catch (err) {
      console.error('Failed to fetch convoy stock:', err);
      fetchError.value = 'Could not load convoy stock trades. Is the backend server running?';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    convoyItems,
    isLoading,
    fetchError,
    searchQuery,
    activeRarityFilter,
    activeSubView,
    fetchConvoyData,
  };
});
