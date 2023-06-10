import createStat from './createStat.js';

function trackMostComplex(context, stats, play) {
  const complexity = +context.gamesById[play.gameId].weight;

  if (stats.mostComplexGamePlayed.complexity < complexity) {
    stats.mostComplexGamePlayed = { complexity, games: new Set([play.name]) };
  } else if (stats.mostComplexGamePlayed.complexity === complexity) {
    stats.mostComplexGamePlayed.games.add(play.name);
  }
}

function trackLongestPlay(ctx, stats, play) {
  const duration = +play.length / +play.quantity;

  if (stats.longestPlay.duration < duration) {
    stats.longestPlay = { duration, plays: [{ name: play.name, date: play.date }] };
  } else if (stats.longestPlay.duration === duration) {
    stats.longestPlay.plays.push({ name: play.name, date: play.date });
  }
}

function aggregateMostTotalPlays(buffer, gameName, gameStat) {
  if (gameStat.totalPlays > buffer.mostPlayedByNumberOfPlays.plays) {
    buffer.mostPlayedByNumberOfPlays = { games: [gameName], plays: gameStat.totalPlays };
  } else if (gameStat.totalPlays === buffer.mostPlayedByNumberOfPlays.plays) {
    buffer.mostPlayedByNumberOfPlays.games.push(gameName);
  }
}

function aggregateMostTotalDuration(buffer, gameName, gameStat) {
  if (gameStat.totalDuration > buffer.mostPlayedByDuration.duration) {
    buffer.mostPlayedByDuration = { games: [gameName], duration: gameStat.totalDuration };
  } else if (gameStat.totalDuration === buffer.mostPlayedByDuration.duration) {
    buffer.mostPlayedByDuration.games.push(gameName);
  }
}

function aggregateMostAverageTime(buffer, gameName, gameStat) {
  const gameArgTime = gameStat.totalDuration / gameStat.totalPlays;
  if (gameArgTime > buffer.longestAveragePlay.duration) {
    buffer.longestAveragePlay = { games: [gameName], duration: gameArgTime };
  } else if (gameArgTime === buffer.longestAveragePlay.duration) {
    buffer.longestAveragePlay.games.push(gameName);
  }
}

function aggregateMostAveragePlayerCount(buffer, gameName, gameStat) {
  const gameArgPlayers = gameStat.totalNumberOfPlayers / gameStat.totalPlays;
  if (gameArgPlayers > buffer.highestAveragePlayerCount.players) {
    buffer.highestAveragePlayerCount = { games: [gameName], players: gameArgPlayers };
  } else if (gameArgPlayers === buffer.highestAveragePlayerCount.players) {
    buffer.highestAveragePlayerCount.games.push(gameName);
  }
}

function aggregateMostPlayedLocationForGame(buffer, gameName, gameStat) {
  const gameLocations = Object.keys(gameStat.byLocation).length;

  if (gameLocations > buffer.gamePlayedAtMostLocations.locations) {
    buffer.gamePlayedAtMostLocations = { games: [gameName], locations: gameLocations };
  } else if (gameLocations === buffer.gamePlayedAtMostLocations.locations) {
    buffer.gamePlayedAtMostLocations.games.push(gameName);
  }
}

function aggregateMostWonGame(buffer, gameName, gameStat) {
  const gameWinP = +(gameStat.wins / gameStat.playsWithAWinner * 100) || 0;

  if (gameWinP > buffer.mostWonGame.winPercentage) {
    buffer.mostWonGame = { games: [gameName], winPercentage: gameWinP };
  } else if (gameWinP === buffer.mostWonGame.winPercentage) {
    buffer.mostWonGame.games.push(gameName);
  }
}

function aggregateMostPlayedMechanism(buffer, obj, mechanism) {
  if (obj.plays > buffer.mostPlayedMechanismByPlays.plays) {
    buffer.mostPlayedMechanismByPlays = { mechanisms: [mechanism], plays: obj.plays };
  } else if (obj.plays === buffer.mostPlayedMechanismByPlays.plays) {
    buffer.mostPlayedMechanismByPlays.mechanisms.push(mechanism);
  }

  if (obj.games.size > buffer.mostPlayedMechanismByGames.games) {
    buffer.mostPlayedMechanismByGames = { mechanisms: [mechanism], games: obj.games.size };
  } else if (obj.games.size === buffer.mostPlayedMechanismByGames.games) {
    buffer.mostPlayedMechanismByGames.mechanisms.push(mechanism);
  }
}

const subAggregations = {
  mostPlayedByNumberOfPlays: aggregateMostTotalPlays,
  mostPlayedByDuration: aggregateMostTotalDuration,
  longestAveragePlay: aggregateMostAverageTime,
  highestAveragePlayerCount: aggregateMostAveragePlayerCount,
  gamePlayedAtMostLocations: aggregateMostPlayedLocationForGame,
  mostWonGame: aggregateMostWonGame,
};

function init() {
  return {
    mostComplexGamePlayed: { complexity: 0, games: new Set() },
    longestPlay: { duration: 0, plays: [] },
    longestAveragePlay: { duration: 0, games: [] },
    mostPlayedByDuration: { duration: 0, games: [] },
    mostPlayedByNumberOfPlays: { plays: 0, games: [] },
    highestAveragePlayerCount: { players: 0, games: [] },
    mostPlayesAtLocationByPlays: { locations: [], plays: 0 },
    mostPlayesAtLocationByDuration: { locations: [], duration: 0 },
    gamePlayedAtMostLocations: { games: [], locations: 0 },
    mostWonGame: { games: [], winPercentage: 0 },
  };
}
function track(context, stats, play) {
  trackMostComplex(context, stats, play);
  trackLongestPlay(context, stats, play);
}

function aggregate(buffer) {
  const results = {
    mostComplexGamePlayed: {
      games: [...buffer.mostComplexGamePlayed.games],
      complexity: buffer.mostComplexGamePlayed.complexity,
    },
    gameWithMostMechanisms: {
      mechanisms: buffer.gameWithMostMechanisms.mechanisms,
      games: [...buffer.gameWithMostMechanisms.games],
    },
    mostPlayedMechanismByPlays: buffer.mostPlayedMechanismByPlays,
    mostPlayedMechanismByGames: buffer.mostPlayedMechanismByGames,
  };

  Object.entries(subAggregations).forEach(([attr, subAgg]) => {
    Object.entries(buffer.byGame).forEach(([gameName, gameStat]) => {
      subAgg(buffer, gameName, gameStat);
    });

    results[attr] = buffer[attr];
  });

  Object.entries(buffer.byMechanism).forEach(([mechanism, obj]) => {
    aggregateMostPlayedMechanism(buffer, obj, mechanism);
  });

  results.mostPlayedMechanismByGames = buffer.mostPlayedMechanismByGames;
  results.mostPlayedMechanismByPlays = buffer.mostPlayedMechanismByPlays;

  return results;
}

const most = createStat('most', init, track, aggregate);

export default most;