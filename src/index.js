import process from 'process';

import fetchData from './fetch.js';
import { storeData, storeStats, storeWeeklyReport } from './store.js';
import generateStats from './statistics/calculate.js';
import generateWeeklyReport from './playsPerWeek.js';
import importData from './importData.js';

function parseCmdLineArgs() {
  const args = process.argv
    .reduce((result, arg) => {
      if (arg === '--weekly-report') {
        result.weeklyReport = true;
      } else if (arg.startsWith('--start-date=')) {
        result.startDate = arg.substring('--start-date='.length);
      } else if (arg.startsWith('--end-date=')) {
        result.endDate = arg.substring('--end-date='.length);
      } else if (arg === '--stats-only') {
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
  const startTimeStamp = new Date();
  const { userName, statsOnly, weeklyReport, startDate, endDate } = parseCmdLineArgs();

  let data = await importData(userName);

  if (!statsOnly) {
    console.log(`Fetching plays for ${userName}. This might take awhile...`);
    data = await fetchData(userName, startDate, endDate, data.plays, data.games);

    console.log(`Saving data for ${userName}`);
    await storeData(userName, data);
  }

  if (weeklyReport) {
    const report = generateWeeklyReport(userName, data.games, data.collection, data.plays, startDate, endDate);
    console.log(`Saving weekly report for ${userName}`);
    await storeWeeklyReport(userName, startDate, endDate, report);
  }

  const failedGames = data.games.filter(g => !g).length;
  if (failedGames > 0) {
    console.error(`Failed to fetch ${failedGames} games. Please re-run the script to continue.`);
    return;
  }

  console.log(`Calculating statistics for ${userName}`);
  const stats = await generateStats(userName, data);

  console.log(`Storing stats for ${userName}`);
  await storeStats(userName, stats);

  const endTimeStamp = new Date();
  console.log("Finished in ", endTimeStamp - startTimeStamp);
}());
