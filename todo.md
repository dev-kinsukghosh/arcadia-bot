# todo 3

for Shops load in Datbase and update values from main server api every 30min  & make dashboard & api & bot faster
Use 3-4 Api in round robin & save the heads in Cache Forever (store inside mysql database the png inside Binary and when someone opens website load it up for 30min into Redis unless it changes ) and update every head every 6h in Concurrency job using 2-3 api services not just 1( inside database use uuid as primary id as it cant be altered)
fix that if data before certain date in currency not present insted of 0 swich that with the Base Currency value
add a Sepret cmd just to start The bot and 1 cmd just to start the Server
Move local varibles in pages to Global varibles using pinia for bots and Website and document them and use the Unused Npm packages from package.json to make the project better
fix npm run lint errors
# todo 4
