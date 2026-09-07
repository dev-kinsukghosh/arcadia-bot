import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const usePlayersStore = defineStore('players', () => {
  const playersData = ref(null);
  const isLoading = ref(true);
  const fetchError = ref(null);

  // Filters & State
  const searchQuery = ref('');
  const rankFilter = ref('all');
  const selectedPlayer = ref(null);
  const isModalOpen = ref(false);

  async function fetchPlayersData() {
    isLoading.value = true;
    fetchError.value = null;
    try {
      const res = await axios.get(`${API_BASE}/players`);
      playersData.value = res.data;
    } catch (error) {
      console.error('Failed to fetch Players data:', error);
      fetchError.value = 'Failed to load player data. Is the API service online?';
    } finally {
      isLoading.value = false;
    }
  }

  function openPlayerModal(player) {
    selectedPlayer.value = player;
    isModalOpen.value = true;
  }

  function closeModal() {
    selectedPlayer.value = null;
    isModalOpen.value = false;
  }

  return {
    playersData,
    isLoading,
    fetchError,
    searchQuery,
    rankFilter,
    selectedPlayer,
    isModalOpen,
    fetchPlayersData,
    openPlayerModal,
    closeModal,
  };
});
