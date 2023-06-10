import process from 'process';

import cmd from './cmdUtils.js';
import { timed } from './utils.js';
import fetchData from './fetch.js';
import { storeData, storeStats, storeWeeklyReport } from './store.js';
import generateStats from './statistics/calculate.js';
import generateWeeklyReport from './playsPerWeek.js';
import loadData from './loadData.js';

cmd.command('fetch')
  .arg({ name: 'userName', required: true })
  .arg({ name: 'statsOnly', default: false })
  .do(timed(fetchCmd));

cmd.command('weekly')
  .arg({ name: 'userName', required: true })
  .arg({ name: 'startDate', required: true })
  .arg({ name: 'endDate', required: true })
  .arg({ name: 'statsOnly', default: false })
  .do(timed(weeklyCmd));

cmd.execute();

async function fetchAndStore(userName, loadedData, startDate, endDate) {
  console.log(`Fetching plays for ${userName}. This might take awhile...`);
  const data = await fetchData(userName, startDate, endDate, loadedData.plays, loadedData.games);

  console.log(`Saving data for ${userName}`);
  await storeData(userName, data);

  const failedGames = data.games.filter(g => !g).length;
  if (failedGames > 0) {
    console.error(`Failed to fetch ${failedGames} games. Please re-run the script to continue.`);
    process.exit(1);
  }

  return data;
}

async function fetchCmd({ userName, statsOnly }) {
  let data = await loadData(userName);

  if (!statsOnly) {
    data = await fetchAndStore(userName, data);
  }

  console.log(`Calculating statistics for ${userName}`);
  const stats = await generateStats(userName, data);

  console.log(`Storing stats for ${userName}`);
  await storeStats(userName, stats);
}

async function weeklyCmd({ userName, statsOnly, startDate, endDate }) {
  let data = await loadData(userName);

  if (!statsOnly) {
    data = await fetchAndStore(userName, data, startDate, endDate);
  }

  console.log(`Generating weekly report for ${userName}`);
  const report = generateWeeklyReport(userName, data.games, data.collection, data.plays, startDate, endDate);

  console.log(`Saving weekly report for ${userName}`);
  await storeWeeklyReport(userName, startDate, endDate, report);
}