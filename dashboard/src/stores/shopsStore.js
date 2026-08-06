import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useShopsStore = defineStore('shops', () => {
  const shops = ref([]);
  const isLoading = ref(true);
  const fetchError = ref(null);

  // Filters
  const searchQuery = ref('');
  const itemSearchQuery = ref('');
  const selectedCategory = ref('all');

  // Modal details
  const selectedShop = ref(null);
  const isModalOpen = ref(false);

  async function fetchShops() {
    isLoading.value = true;
    fetchError.value = null;
    try {
      const res = await axios.get(`${API_BASE}/shops`);
      shops.value = Array.isArray(res.data.shops) ? res.data.shops : [];
    } catch (error) {
      console.error('Failed to fetch shops:', error);
      fetchError.value = 'Failed to fetch player shops. Is the backend server online?';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    shops,
    isLoading,
    fetchError,
    searchQuery,
    itemSearchQuery,
    selectedCategory,
    selectedShop,
    isModalOpen,
    fetchShops,
  };
});
