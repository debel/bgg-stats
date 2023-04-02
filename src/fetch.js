import { fetchCollection, fetchPlays, fetchGame } from './bggClient.js';
import { delay, indexBasedBatch } from './utils.js';

function groupPlaysByDate(plays) {
  return plays.reduce((result, play) => {
    if (!result[play.date]) {
      result[play.date] = [];
    }

    result[play.date].push(play);

    return result;
  }, {});
}

function mergePlays(savedPlays) {
  return function (fetchedPlays) {
    return {
      ...savedPlays,
      ...fetchedPlays,
    };
  }
}

export default async function fetch(userName, startDate, endDate, savedPlays, savedGames) {
  const gamesById = savedGames.reduce((result, game) => {
    result[game.gameId] = game;

    return result;
  }, {});

  const [plays, collection] = await Promise.all([
    fetchPlays(userName, startDate, endDate)
      .then(groupPlaysByDate)
      .then(mergePlays(savedPlays)),
    fetchCollection(userName),
  ]);

  const gameIds = [...Object.values(plays).reduce((result, playsForDate) => {
    playsForDate.forEach((play) => {
      result.add(play.gameId);
    });

    return result;
  }, new Set())];

  const games = await Promise.all(gameIds.map((id, index) => gamesById[id]
    ? gamesById[id]
    : delay(indexBasedBatch(index, 10, 2000))
      .then(() => console.log(`fetching game ${id}`))
      .then(() => fetchGame(id))
      .catch(() => console.warn(`failed to fetch game ${id}`))
  ));

  return {
    games,
    plays,
    collection,
  };
}