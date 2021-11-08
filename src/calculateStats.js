import { writeFile } from 'fs';
import { reportToConsole } from './utils.js';

let gamesById = {};

function extractMalformedPlayes(plays) {
  return plays.reduce((result, play) => {
    const noPlayers = !!(!Array.isArray(play.players) || play.players.length === 0);
    const noLocation = !!(!play.location);
    const noDuration = !!(!Number.isInteger(play.length) || play.length <= 0);

    if (noPlayers || noLocation || noDuration) {
      result.push({ playId: play.id, noPlayers, noLocation, noDuration });
    }

    return result;
  }, []);
}

function generateGamesByIdMap(games) {
  return games.reduce((result, game) => {
    result[game.gameId] = game;

    return result;
  }, {});
}

const timePlayed = {
  init(stats) { stats.timePlayed = 0; },
  track(stats, play) { stats.timePlayed += +play.length; },
  aggregate() { },
}

const gamesPlayed = {
  init(stats) { stats.gamesPlayed = 0; },
  track(stats, play) { stats.gamesPlayed += +play.quantity; },
  aggregate() { },
}

const mostComplexGamePlayed = {
  init(stats) { stats.mostComplexGamePlayed = { complexity: 0, games: new Set() }; },
  track(stats, play) {
    const complexity = +gamesById[play.gameId].weight;

    if (stats.mostComplexGamePlayed.complexity < complexity) {
      stats.mostComplexGamePlayed = { complexity, games: new Set([play.name]) };
    } else if (stats.mostComplexGamePlayed.complexity === complexity) {
      stats.mostComplexGamePlayed.games.add(play.name);
    }
  },
  aggregate(stats) {
    stats.mostComplexGamePlayed.games = [...stats.mostComplexGamePlayed.games];
  },
};

const playsPerLocation = {
  init(stats) { stats.playsPerLocation = {}; },
  track(stats, play) {
    if (!stats.playsPerLocation[play.location]) {
      stats.playsPerLocation[play.location] = 0;
    }

    stats.playsPerLocation[play.location] += +play.quantity;
  },
  aggregate() { },
};

const averagePlayTime = {
  init() { },
  track() { },
  aggregate(stats) {
    stats.averagePlayTime = stats.timePlayed / stats.gamesPlayed;
  },
};

const longestPlay = {
  init(stats) { stats.longestPlay = { duration: 0, plays: [] }; },
  track(stats, play) {
    const duration = +play.length / +play.quantity;
    if (stats.longestPlay.duration < duration) {
      stats.longestPlay = { duration, plays: [{ name: play.name, date: play.date }] };
    } else if (stats.longestPlay.duration === duration) {
      stats.longestPlay.plays.push({ name: play.name, date: play.date });
    }
  },
  aggregate() { },
}

const playsPerGame = {
  init(stats) { stats.playsPerGame = {}; },
  track(stats, play) {
    if (!stats.playsPerGame[play.name]) {
      stats.playsPerGame[play.name] = { totalTime: 0, totalCount: 0 };
    }

    stats.playsPerGame[play.name].totalCount += +play.quantity;
    stats.playsPerGame[play.name].totalTime += +play.length;
  },
  aggregate(stats) {
    stats.uniqueGames = Object.keys(stats.playsPerGame).length;
    Object.values(stats.playsPerGame).forEach(stat => {
      stat.averagePlayTime = stat.totalTime / stat.totalCount;
    });
  }
};

const averageComplexity = {
  init(stats) { stats.__complexitySumTime = 0; stats.__complexitySumPlays = 0; },
  track(stats, play) {
    const weight = +gamesById[play.gameId].weight;
    stats.__complexitySumTime += weight * +play.length;
    stats.__complexitySumPlays += weight * +play.quantity;
  },
  aggregate(stats) {
    stats.averageComplexityOverTimePlayed = stats.__complexitySumTime / stats.timePlayed;
    stats.averageComplexityOverNumberOfPlays = stats.__complexitySumPlays / stats.gamesPlayed;
    delete stats.__complexitySumTime;
    delete stats.__complexitySumPlays;
  }
}

const mostPlayed = {
  init(stats) {
    stats.mostPlayedCount = { games: [], timesPlayed: 0 };
    stats.mostPlayedTime = { games: [], timePlayed: 0 };
  },
  track(stats, play) { },
  aggregate(stats) {
    Object.entries(stats.playsPerGame).forEach(([name, stat]) => {
      if (stat.totalCount > stats.mostPlayedCount.timesPlayed) {
        stats.mostPlayedCount = { games: [name], timesPlayed: stat.totalCount };
      } else if (stat.totalCount === stats.mostPlayedCount.timesPlayed) {
        stats.mostPlayedCount.games.push(name);
      }

      if (stat.totalTime > stats.mostPlayedTime.timePlayed) {
        stats.mostPlayedTime = { games: [name], timePlayed: stat.totalTime };
      } else if (stat.totalTime === stats.mostPlayedTime.timePlayed) {
        stats.mostPlayedTime.games.push(name);
      }
    });
  }
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

const gamesPerMechanism = {
  init(stats) {
    stats._byMechanism = {};
  },
  track(stats, play) {
    gamesById[play.gameId].mechanisms.forEach((mechanism) => {
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
    stats.ByMechanism = Object.entries(stats._byMechanism)
      .sort(([, objA], [, objB]) => objB.plays - objA.plays)
      .reduce((result, [mechanism, obj]) => {
        result[mechanism] = {
          games: [...obj.games],
          numberOfGames: obj.games.size,
          plays: obj.plays,
        };

        return result;
      }, {});

    stats.uniqueMechanisms = Object.keys(stats.ByMechanism).length;

    delete stats._byMechanism;
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

    stats.uniqueYearsPublished = stats.byYearPublished.length;

    delete stats._byYearPublished;
  },
};

const stats = [
  timePlayed,
  gamesPlayed,
  mostComplexGamePlayed,
  playsPerLocation,
  averagePlayTime,
  longestPlay,
  playsPerGame,
  averageComplexity,
  mostPlayed,
  gamesPerMechanism,
  gamesPerYearPublished,
  uniqueGamesPerYear,
  yearlyChallenges,
];

export default async function generateStats() {
  console.log('Generating stats...');

  const plays = (await import('../data/plays.json')).default;
  const games = (await import('../data/games.json')).default;

  const malformedPlays = extractMalformedPlayes(plays);
  gamesById = generateGamesByIdMap(games);

  const playerStats = plays.reduce((result, play) => {
    play.players.forEach(player => {
      if (!result[player.name]) {
        result[player.name] = {};
        stats.forEach(stat => stat.init(result[player.name]));
      }

      stats.forEach(stat => stat.track(result[player.name], play));
    });

    return result;
  }, {});

  Object.values(playerStats).forEach(ps => stats.forEach(stat => stat.aggregate(ps)));

  writeFile('./data/malformed.json', JSON.stringify(malformedPlays), reportToConsole);
  writeFile('./data/stats.json', JSON.stringify(playerStats), reportToConsole);

  return playerStats;
}
