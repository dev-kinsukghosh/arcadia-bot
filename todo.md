# todo 3

/towny history cmd like currency history but for towny data
Add graph to Town and nations in towny for Towns the graph is Residents only for nation its Residents and town


FIX Heads test
 FAIL  tests/heads.test.js > Player Heads Manager Suite > should successfully trigger the concurrent player heads background update job
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/heads.test.js:69:3
     67|   });
     68|
     69|   it('should successfully trigger the concurrent player heads background update job', async () => {
       |   ^
     70|     await updateAllHeadsBatch();
     71|     logger.success('Background player heads updates batch job executed successfully.');


# todo 4

Concept: On the currency list dashboard (dashboard/src/components/MarketMonitor.vue), we display rates, standard deviation, and stability index. We should display color-coded trend arrows or inline sparklines representing the 24-hour and 7-day rate direction.
Interactive Slash Command /exchange Reverse Resolution  
Core Performance Profiler & Developer Latency Command (/profile) For bot dev and remove old /healthz Shows more data etc
A profiler for Discord And Website seeing where most of the time is taken and fixing those speeds

