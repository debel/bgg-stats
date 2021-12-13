import { fetchCollection, fetchPlays, fetchGame } from './bggClient.js';

export default async function fetchAndSave(userName) {
  const [plays, collection] = await Promise.all([
    fetchPlays(userName),
    fetchCollection(userName),
  ]);

  const gameIds = [...plays.reduce((result, play) => {
    result.add(play.gameId);
    return result;
  }, new Set())];

  const games = await Promise.all(gameIds.map(id => fetchGame(id)));

  return {
    games,
    plays,
    collection,
  };
}