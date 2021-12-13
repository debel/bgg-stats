import process from 'process';

import fetchData from './fetch.js';
import { storeData, storeStats } from './store.js';
import generateStats from './calculate.js';

function parseCmdLineArgs() {
  const args = process.argv
    .reduce((result, arg) => {
      if (arg === '--stats-only') {
        result.statsOnly = true;
      } else {
        result.userName = arg;
      }

      return result;
    }, {});


  if (!args.userName) {
    throw new Error('No username provided');
  }

  return args;
}

(async function main() {
  const { userName, statsOnly } = parseCmdLineArgs();
  let data;

  if (statsOnly) {
    const plays = (await import(`../data/${userName}-plays.json`)).default;
    const games = (await import(`../data/${userName}-games.json`)).default;
    data = { plays, games };
  } else {
    console.log(`Fetching plays for ${userName}. This might take awhile...`);
    data = await fetchData(userName);

    console.log(`Saving data for ${userName}`);
    await storeData(userName, data);
  }

  console.log(`Calculating statistics for ${userName}`);
  const stats = await generateStats(userName, data);

  console.log(`Storing stats for ${userName}`);
  await storeStats(userName, stats);  
}());
