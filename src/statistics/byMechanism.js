import createStat from './createStat.js';

function init() {
  return {
    byMechanism: {},
    gameWithMostMechanisms: { games: new Set(), mechanisms: 0 },
    mostPlayedMechanismByPlays: { mechanisms: [], plays: 0 },
    mostPlayedMechanismByGames: { mechanisms: [], games: 0 },
  };
}

function track(context, buffer, play) {
  const gameMechanisms = context.gamesById[play.gameId].mechanisms;

  if (gameMechanisms.length > buffer.gameWithMostMechanisms.mechanisms) {
    buffer.gameWithMostMechanisms = { games: new Set([play.name]), mechanisms: gameMechanisms.length };
  } else if (gameMechanisms.length === buffer.gameWithMostMechanisms.mechanisms) {
    buffer.gameWithMostMechanisms.games.add(play.name);
  }

  gameMechanisms.forEach((mechanism) => {
    if (!buffer.byMechanism[mechanism]) {
      buffer.byMechanism[mechanism] = {
        games: new Set(),
        plays: 0,
      }
    }

    buffer.byMechanism[mechanism].games.add(context.gamesById[play.gameId].name);
    buffer.byMechanism[mechanism].plays += 1;
  });
}

function aggregate(buffer) {
  const results = Object.entries(buffer.byMechanism)
    .sort(([, objA], [, objB]) => objB.plays - objA.plays)
    .reduce((result, [mechanism, obj]) => {
      result[mechanism] = {
        numberOfGames: obj.games.size,
        games: [...obj.games],
        plays: obj.plays,
      };

      return result;
    }, {});

  return results;
}

const mechanismStats = createStat('byMechanism', init, track, aggregate);

export default mechanismStats;