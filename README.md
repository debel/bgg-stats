# Fetch and calculate stats for a BGG user

## Install dependencies
```
npm install
```

## Running the script
```
npm run bgg Your-BGG-User-Name
```

You can also only run the statistics calculation using
```
npm run bgg -- --stats-only Your-BGG-User-Name
```

## Explore the stats
Look at the `Your-BGG-User-Name-stats.json` file in the `data` directory 

You can also see which of your plays don't have recored players, length or location in the `Your-BGG-User-Name-malformed.json`