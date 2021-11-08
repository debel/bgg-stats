import process from 'process';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { reportToConsole } from './utils.js';
import { fetchCollection, fetchPlays, fetchGame } from './bggClient.js';

const storeFile = promisify(writeFile);

function userNameFromArgsOrCmdLine(userName) {
  userName = userName || process.argv[2];

  if (!userName) {
    throw new Error('No username provided');
  }

  return userName;
}

export default async function fetchAndSave(userName) {
  userName = userNameFromArgsOrCmdLine(userName);
  console.log(`Fetching plays for ${userName}. This might take awhile...`);

  const plays = await fetchPlays(userName);

  const gameIds = [...plays.reduce((result, play) => {
    result.add(play.gameId);
    return result;
  }, new Set())];

  const games = await Promise.all(gameIds.map(id => fetchGame(id)));

  const collection = await fetchCollection(userName);

  return await Promise.all([
    storeFile('./data/collection.json', JSON.stringify(collection)),
    storeFile('./data/plays.json', JSON.stringify(plays)),
    storeFile('./data/games.json', JSON.stringify(games)),
  ]).then(reportToConsole);
}