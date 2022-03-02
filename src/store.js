import { writeFile } from 'fs';
import { promisify } from 'util';

const storeFile = promisify(writeFile);

export function storeData(userName, { games, plays, collection }) {
  return Promise.all([
    storeFile(`./data/${userName}-collection.json`, JSON.stringify(collection)),
    storeFile(`./data/${userName}-plays.json`, JSON.stringify(plays)),
    storeFile(`./data/${userName}-games.json`, JSON.stringify(games)),
  ]);
}

export function storeStats(userName, { playerStats, malformedPlays }) {
  return Promise.all([
    storeFile(`./data/${userName}-malformed-plays.json`, JSON.stringify(malformedPlays)),
    storeFile(`./data/${userName}-stats.json`, JSON.stringify(playerStats)),
  ]);
}

export function storeWeeklyReport(userName, startDate, endDate, report) {
  return storeFile(`./data/${userName}-weekly-plays-${startDate}-${endDate}.txt`, report);
}