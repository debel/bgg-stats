import { promisify } from 'util';
import { readFile } from 'fs';

const readF = promisify(readFile);

export default async function importData(userName) {
  let plays, games, collection;

  try {
    plays = JSON.parse(await readF(`./data/${userName}-plays.json`));
    games = JSON.parse(await readF(`./data/${userName}-games.json`));
    collection = JSON.parse(await readF(`./data/${userName}-collection.json`));
  } catch (ex) {
    plays = plays || (console.warn('Failed to load plays stored data', ex), []);
    games = games || (console.warn('Failed to load games stored data', ex), []);
    collection = collection || (console.warn('Failed to load collection stored data', ex), []);
  }

  return { plays, games, collection };
}