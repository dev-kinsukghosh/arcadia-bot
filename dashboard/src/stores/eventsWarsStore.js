import { defineStore } from 'pinia';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useEventsWarsStore = defineStore('eventsWars', {
  state: () => ({
    eventsData: null,
    warsData: null,
    isLoading: false,
    fetchError: null,
  }),

  actions: {
    async fetchEventsAndWars() {
      this.isLoading = true;
      this.fetchError = null;

      try {
        const [eventsRes, warsRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/events`),
          axios.get(`${API_BASE}/wars`),
        ]);

        if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
          this.eventsData = eventsRes.value.data;
        }

        if (warsRes.status === 'fulfilled' && warsRes.value.data) {
          this.warsData = warsRes.value.data;
        }
      } catch (err) {
        this.fetchError = err.message || 'Failed to load events and wars telemetry.';
      } finally {
        this.isLoading = false;
      }
    },
  },
});
