# Todo

1. Currency monitor and Exchange rate cmd
2. graph with Arc value of currency
3. Add a feature to track historical exchange rates
4. add cmds for /api/towny
5. add cmds for /api/currencies

# todo 2

1. add Maintence mode to main bot so can work on it

# todo 3 (Vue.js Dashboard)

1. Create a Vue.js + Vite dashboard in the `dashboard/` directory.
2. Stability and Value calculation logic for stable, high-value currencies (configurable limits: Top 5, Top 10, Top 20, or a Custom user input count) using weighted metrics:
   - `arc_per_unit_base`
   - `arc_per_unit_live`
   - `avg_arc_per_unit_live` (running average of daily scans)
   - Other stability indexes (e.g., volatility, standard deviation from base rate, min/max spread)
3. Dashboard UI/UX features:
   - Filters: Best Performing, Worst Performing, High Volatility, Low Volatility.
   - Limit configuration (Top 5, Top 10, Top 20, Custom limits).
   - Multi-tag filters (e.g. by backing items, nations).
   - Dynamic charts/visualizations of historical rate telemetry.
4. Proposed Premium Dashboard Features:
   - **Interactive Exchange Calculator Widget**: Fast, on-the-fly currency converter between any two nation currencies.
   - **Favorites & Pinned List**: Save and pin specific currencies for easy monitoring.
   - **Exporting Options**: Download history or list data as CSV or JSON.
   - **Volatility Highlight & Threshold Alerts**: Visual indicators when a currency moves beyond a custom percentage threshold.
