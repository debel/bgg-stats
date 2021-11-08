import fetchAndSave from './fetchAndStorePlays.js';
import generateStats from './calculateStats.js';

(async function () {
  await fetchAndSave()
  await generateStats();
}());
