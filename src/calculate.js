let gamesById = {};

function extractMalformedPlayes(plays) {
  return Object.values(plays).reduce((result, playsPerDate) => {
    playsPerDate.forEach((play) => {
      const noPlayers = !!(!Array.isArray(play.players) || play.players.length === 0);
      const noLocation = !!(!play.location);
      const noDuration = !!(!Number.isInteger(play.length) || play.length <= 0);

      if (noPlayers || noLocation || noDuration) {
        result.push({ playId: play.id, noPlayers, noLocation, noDuration });
      }
    });

    return result;
  }, []);
}

function generateGamesByIdMap(games) {
  return games.reduce((result, game) => {
    result[game.gameId] = game;

    return result;
  }, {});
}

const basicStats = {
  init(stats) {
    stats._basic = {
      games: new Set(),
      mechanisms: new Set(),
      totalNumberOfPlayers: 0,
      complexitySumTime: 0,
      complexitySumPlays: 0,
      uniqueLocations: new Set(),
    };

    stats.basic = {
      totalTimePlayed: 0,
      totalPlays: 0,
      averagePlayTime: 0,
      averageNumberOfPlayers: 0,
      uniqueGamesPlayed: 0,
      uniqueMechanisms: 0,
      uniqueLocations: 0,
    };
  },
  track(stats, play) {
    stats.basic.totalTimePlayed += +play.length;
    stats.basic.totalPlays += +play.quantity;

    stats._basic.totalNumberOfPlayers += +play.players.length;
    stats._basic.games.add(play.name);
    gamesById[play.gameId].mechanisms.forEach(
      (mechanism) => stats._basic.mechanisms.add(mechanism)
    );

    const weight = +gamesById[play.gameId].weight;
    stats._basic.complexitySumTime += weight * +play.length;
    stats._basic.complexitySumPlays += weight * +play.quantity;

    stats._basic.uniqueLocations.add(play.location);
  },
  aggregate(stats) {
    stats.basic.averagePlayTime = stats.basic.totalTimePlayed / stats.basic.totalPlays;
    stats.basic.uniqueGamesPlayed = stats._basic.games.size;
    stats.basic.uniqueMechanisms = stats._basic.mechanisms.size;
    stats.basic.averageNumberOfPlayers = stats._basic.totalNumberOfPlayers / stats.basic.totalPlays;
    stats.basic.averageComplexityOverTimePlayed = stats._basic.complexitySumTime / stats.basic.totalTimePlayed;
    stats.basic.averageComplexityOverNumberOfPlays = stats._basic.complexitySumPlays / stats.basic.totalPlays;
    stats.basic.uniqueLocations = stats._basic.uniqueLocations.size;

    delete stats._basic;
  },
};

function trackMostComplex(stats, play) {
  const complexity = +gamesById[play.gameId].weight;

  if (stats.most.mostComplexGamePlayed.complexity < complexity) {
    stats.most.mostComplexGamePlayed = { complexity, games: new Set([play.name]) };
  } else if (stats.most.mostComplexGamePlayed.complexity === complexity) {
    stats.most.mostComplexGamePlayed.games.add(play.name);
  }
}

function trackLongestPlay(stats, play) {
  const duration = +play.length / +play.quantity;

  if (stats.most.longestPlay.duration < duration) {
    stats.most.longestPlay = { duration, plays: [{ name: play.name, date: play.date }] };
  } else if (stats.most.longestPlay.duration === duration) {
    stats.most.longestPlay.plays.push({ name: play.name, date: play.date });
  }
}

const mostStats = {
  init(stats) {
    stats.most = {
      mostComplexGamePlayed: { complexity: 0, games: new Set() },
      longestPlay: { duration: 0, plays: [] },
      longestAveragePlay: { duration: 0, games: [] },
      mostPlayedByDuration: { duration: 0, games: [] },
      mostPlayedByNumberOfPlays: { plays: 0, games: [] },
      highestAveragePlayerCount: { players: 0, games: [] },
      mostPlayesAtLocationByPlays: { locations: [], plays: 0 },
      mostPlayesAtLocationByDuration: { locations: [], duration: 0 },
      gamePlayedAtMostLocations: { games: [], locations: 0 },
    };
  },
  track(stats, play) {
    trackMostComplex(stats, play);
    trackLongestPlay(stats, play);
  },
  aggregate(stats) {
    stats.most.mostComplexGamePlayed.games = [...stats.most.mostComplexGamePlayed.games];
  },
}

const byLocation = {
  init(stats) { stats.byLocation = {}; },
  track(stats, play) {
    if (!stats.byLocation[play.location]) {
      stats.byLocation[play.location] = {
        plays: 0,
        duration: 0,
      };
    }

    stats.byLocation[play.location].plays += +play.quantity;
    stats.byLocation[play.location].duration += +play.length;
  },
  aggregate(stats) {
    Object.entries(stats.byLocation).forEach(([location, { duration, plays }]) => {
      if (plays > stats.most.mostPlayesAtLocationByPlays.plays) {
        stats.most.mostPlayesAtLocationByPlays = { locations: [location], plays };
      } else if (plays === stats.most.mostPlayesAtLocationByPlays.plays) {
        stats.most.mostPlayesAtLocationByPlays.locations.push(location);
      }

      if (duration > stats.most.mostPlayesAtLocationByDuration.duration) {
        stats.most.mostPlayesAtLocationByDuration = { locations: [location], duration };
      } else if (duration === stats.most.mostPlayesAtLocationByDuration.duration) {
        stats.most.mostPlayesAtLocationByDuration.locations.push(location);
      }
    });
  },
};

function aggregateMostTotalPlays(stats, gameStat, name) {
  if (gameStat.totalPlays > stats.most.mostPlayedByNumberOfPlays.plays) {
    stats.most.mostPlayedByNumberOfPlays = { games: [name], plays: gameStat.totalPlays };
  } else if (gameStat.totalPlays === stats.most.mostPlayedByNumberOfPlays.plays) {
    stats.most.mostPlayedByNumberOfPlays.games.push(name);
  }
}

function aggregateMostTotalDuration(stats, gameStat, name) {
  if (gameStat.totalDuration > stats.most.mostPlayedByDuration.duration) {
    stats.most.mostPlayedByDuration = { games: [name], duration: gameStat.totalDuration };
  } else if (gameStat.totalDuration === stats.most.mostPlayedByDuration.duration) {
    stats.most.mostPlayedByDuration.games.push(name);
  }
}

function aggregateMostAverageTime(stats, gameStat, name) {
  if (gameStat.averagePlayTime > stats.most.longestAveragePlay.duration) {
    stats.most.longestAveragePlay = { games: [name], duration: gameStat.averagePlayTime };
  } else if (gameStat.averagePlayTime === stats.most.longestAveragePlay.duration) {
    stats.most.longestAveragePlay.games.push(name);
  }
}

function aggregateMostAveragePlayerCount(stats, gameStat, name) {
  if (gameStat.averageNumberOfPlayers > stats.most.highestAveragePlayerCount.players) {
    stats.most.highestAveragePlayerCount = { games: [name], players: gameStat.averageNumberOfPlayers };
  } else if (gameStat.averageNumberOfPlayers === stats.most.highestAveragePlayerCount.players) {
    stats.most.highestAveragePlayerCount.games.push(name);
  }
}

function aggregateMostPlayedLocationForGame(stats, gameStat, name) {
  Object.entries(gameStat._byLocation).forEach(([location, plays]) => {
    if (plays > gameStat.mostPlayedLocation.plays) {
      gameStat.mostPlayedLocation = { locations: [location], plays };
    } else if (plays === gameStat.mostPlayedLocation.plays) {
      gameStat.mostPlayedLocation.locations.push(location);
    }
  });

  gameStat.playedAtLocations = Object.keys(gameStat._byLocation).length;

  if (gameStat.playedAtLocations > stats.most.gamePlayedAtMostLocations.locations) {
    stats.most.gamePlayedAtMostLocations = { games: [name], locations: gameStat.playedAtLocations };
  } else if (gameStat.playedAtLocations === stats.most.gamePlayedAtMostLocations.locations) {
    stats.most.gamePlayedAtMostLocations.games.push(name);
  }
}

const byGame = {
  init(stats) { stats.byGame = {}; },
  track(stats, play) {
    if (!stats.byGame[play.name]) {
      stats.byGame[play.name] = {
        totalDuration: 0,
        totalPlays: 0,
        mostPlayedLocation: { locations: [], plays: 0 },
        playedAtLocations: 0,
        _totalNumberOfPlayers: 0,
        _byLocation: {},
      };
    }

    if (!stats.byGame[play.name]._byLocation[play.location]) {
      stats.byGame[play.name]._byLocation[play.location] = 0;
    }

    stats.byGame[play.name]._byLocation[play.location] += +play.quantity;

    stats.byGame[play.name].totalPlays += +play.quantity;
    stats.byGame[play.name].totalDuration += +play.length;
    stats.byGame[play.name]._totalNumberOfPlayers += play.players.length * +play.quantity;
  },
  aggregate(stats) {
    Object.entries(stats.byGame).forEach(([name, gameStat]) => {
      gameStat.averagePlayTime = gameStat.totalDuration / gameStat.totalPlays;
      gameStat.averageNumberOfPlayers = gameStat._totalNumberOfPlayers / gameStat.totalPlays;

      aggregateMostTotalPlays(stats, gameStat, name);
      aggregateMostTotalDuration(stats, gameStat, name);
      aggregateMostAverageTime(stats, gameStat, name);
      aggregateMostAveragePlayerCount(stats, gameStat, name);
      aggregateMostPlayedLocationForGame(stats, gameStat, name);

      delete gameStat._byLocation;
      delete gameStat._totalNumberOfPlayers;
    });
  }
};

function aggregateMostPlayedMechanism(stats, obj, mechanism) {
  if (obj.plays > stats.most.mostPlayedMechanismByPlays.plays) {
    stats.most.mostPlayedMechanismByPlays = { mechanisms: [mechanism], plays: obj.plays };
  } else if (obj.plays === stats.most.mostPlayedMechanismByPlays.plays) {
    stats.most.mostPlayedMechanismByPlays.mechanisms.push(mechanism);
  }

  if (obj.games.size > stats.most.mostPlayedMechanismByGames.games) {
    stats.most.mostPlayedMechanismByGames = { mechanisms: [mechanism], games: obj.games.size };
  } else if (obj.games.size === stats.most.mostPlayedMechanismByGames.games) {
    stats.most.mostPlayedMechanismByGames.mechanisms.push(mechanism);
  }
}

const byMechanism = {
  init(stats) {
    stats._byMechanism = {};
    stats.most.gameWithMostMechanisms = { games: new Set(), mechanisms: 0 };
    stats.most.mostPlayedMechanismByPlays = { mechanisms: [], plays: 0 };
    stats.most.mostPlayedMechanismByGames = { mechanisms: [], games: 0 };
  },
  track(stats, play) {
    const gameMechanisms = gamesById[play.gameId].mechanisms;

    if (gameMechanisms.length > stats.most.gameWithMostMechanisms.mechanisms) {
      stats.most.gameWithMostMechanisms = { games: new Set([play.name]), mechanisms: gameMechanisms.length };
    } else if (gameMechanisms.length === stats.most.gameWithMostMechanisms.mechanisms) {
      stats.most.gameWithMostMechanisms.games.add(play.name);
    }

    gameMechanisms.forEach((mechanism) => {
      if (!stats._byMechanism[mechanism]) {
        stats._byMechanism[mechanism] = {
          games: new Set(),
          plays: 0,
        }
      }

      stats._byMechanism[mechanism].games.add(gamesById[play.gameId].name);
      stats._byMechanism[mechanism].plays += 1;
    });
  },
  aggregate(stats) {
    stats.most.gameWithMostMechanisms.games = [...stats.most.gameWithMostMechanisms.games];

    stats.ByMechanism = Object.entries(stats._byMechanism)
      .sort(([, objA], [, objB]) => objB.plays - objA.plays)
      .reduce((result, [mechanism, obj]) => {
        aggregateMostPlayedMechanism(stats, obj, mechanism);

        result[mechanism] = {
          numberOfGames: obj.games.size,
          plays: obj.plays,
        };

        return result;
      }, {}); 
    
    delete stats._byMechanism;
  },
};

const uniqueGamesPerYear = {
  init(stats) {
    stats.years = {};
  },
  track(stats, play) {
    const playYear = play.date.substr(0, 4);
    if (!stats.years[playYear]) {
      stats.years[playYear] = new Set();
    }

    stats.years[playYear].add(play.name);
  },
  aggregate(stats) {
    stats.byYear = Object.entries(stats.years).reduce((result, [year, games]) => {
      result[year] = { uniqueGames: [...games], uniqueGamesCount: games.size };
      return result;
    }, {});

    Object.keys(stats.byYear).forEach((thisYear) => {
      const allPreviousYearsCombined = new Set(Object.keys(stats.years).reduce((result, year) => {
        if (Number.parseInt(year) < Number.parseInt(thisYear)) {
          return result.concat(stats.byYear[year].uniqueGames);
        }
        return result;
      }, []));

      stats.byYear[thisYear].newThisYear = stats.byYear[thisYear].uniqueGames.filter(g => !allPreviousYearsCombined.has(g));
      stats.byYear[thisYear].notPlayedThisYear = [...allPreviousYearsCombined].filter(g => !stats.years[thisYear].has(g));

      stats.byYear[thisYear].newThisYearCount = stats.byYear[thisYear].newThisYear.length;
      stats.byYear[thisYear].notPlayedThisYearCount = stats.byYear[thisYear].notPlayedThisYear.length;
    });

    delete stats.years;
  }
};

const yearlyChallenges = {
  init(stats) {
    stats._years = {};
  },
  track(stats, play) {
    const playYear = play.date.substr(0, 4);
    if (!stats._years[playYear]) {
      stats._years[playYear] = {};
    }

    if (!stats._years[playYear][play.name]) {
      stats._years[playYear][play.name] = 0;
    }

    stats._years[playYear][play.name] += +play.quantity;
  },
  aggregate(stats) {
    stats.yearlyChallenges = Object.entries(stats._years).reduce((result, [year, gamesMap]) => {
      if (!result[year]) {
        result[year] = {};
      }

      const [uniquePerYear, exactlyOnce, over2, over10, over20] = Object.entries(gamesMap).reduce((rzlt, [game, plays]) => {
        rzlt[0] += 1;

        if (plays == 1) {
          rzlt[1].push(game);
        }

        if (plays >= 2) {
          rzlt[2].push(game);
        }

        if (plays >= 10) {
          rzlt[3].push(game);
        }

        if (plays >= 20) {
          rzlt[4].push(game);
        }

        return rzlt;
      }, [0, [], [], [], []]);

      result[year]['uniqueThisYear'] = uniquePerYear;

      result[year]['exactlyOnce'] = exactlyOnce.length;

      result[year]['exactlyOnce'] = exactlyOnce.length;

      result[year]['moreThanOnce'] = over2.length;

      if (over10.length >= 10) {
        result[year]['10x10'] = true;
      }

      if (over20.length >= 20) {
        result[year]['20x20'] = true;
      }

      result[year].over10 = over10;
      result[year].over20 = over20;

      return result;
    }, {});

    delete stats._years;
  },
};

const gamesPerYearPublished = {
  init(stats) {
    stats._byYearPublished = {};
  },
  track(stats, play) {
    const yearPublished = gamesById[play.gameId].published;
    if (!stats._byYearPublished[yearPublished]) {
      stats._byYearPublished[yearPublished] = {
        games: new Set(),
        plays: 0,
      }
    }

    stats._byYearPublished[yearPublished].games.add(gamesById[play.gameId].name);
    stats._byYearPublished[yearPublished].plays += 1;
  },
  aggregate(stats) {
    stats.byYearPublished = Object.entries(stats._byYearPublished)
      .sort(([, objA], [, objB]) => objB.plays - objA.plays)
      .reduce((result, [year, obj]) => {
        result.push({
          year,
          games: [...obj.games],
          numberOfGames: obj.games.size,
          plays: obj.plays,
        });

        return result;
      }, []);

    stats.basic.gamesPublishInDifferentYears = stats.byYearPublished.length;

    delete stats._byYearPublished;
  },
};

const stats = [
  basicStats,
  mostStats,
  byLocation,
  byGame,
  byMechanism,
  gamesPerYearPublished,
  uniqueGamesPerYear,
  yearlyChallenges,
];

function normalizePlayerName(name) {
  if (name === 'Sande') {
    return 'Shu_bot';
  }

  if (name === 'Misheto') {
    return 'Misheto Maslarova';
  }

  return name;
}

export default async function generateStats(userName, { plays, games }) {
  const malformedPlays = extractMalformedPlayes(plays);
  gamesById = generateGamesByIdMap(games);

  const playerStats = Object.values(plays).reduce((result, playsPerDate) => {
    playsPerDate.forEach((play) => {
      play.players.forEach(player => {
        const playerName = normalizePlayerName(player.name);
        if (!result[playerName]) {
          result[playerName] = {};
          stats.forEach(stat => stat.init(result[playerName]));
        }

        stats.forEach(stat => stat.track(result[playerName], play));
      });
    });

    return result;
  }, {});

  Object.values(playerStats).forEach(ps => stats.forEach(stat => stat.aggregate(ps)));

  return {
    playerStats,
    malformedPlays,
  };
}
