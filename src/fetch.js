import { fetchCollection, fetchPlays, fetchGame } from './bggClient.js';
import { delay, between } from './utils.js';

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
  return function(fetchedPlays) {
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

  const games = await Promise.all(gameIds.map(id => gamesById[id]
    ? gamesById[id]
    : delay(between(1000,5000)).then(() => fetchGame(id).catch((err) => {
      console.error(`failed to fetch game ${id}`, err);
    }))
  ));

  return {
    games,
    plays,
    collection,
  };
}