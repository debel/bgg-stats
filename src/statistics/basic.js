import createStat, { determineWinner } from './createStat.js';

function init() {
  return {
    totalTimePlayed: 0,
    totalPlays: 0,
    games: new Set(),
    mechanisms: new Set(),
    totalNumberOfPlayers: 0,
    complexitySumTime: 0,
    complexitySumPlays: 0,
    uniqueLocations: new Set(),
    playedWith: new Set(),
    wins: 0,
    playsWithAWinner: 0,
  };
}

function track(context, buffer, play) {
  buffer.totalTimePlayed += +play.length;
  buffer.totalPlays += +play.quantity;

  buffer.totalNumberOfPlayers += +play.players.length;
  buffer.games.add(play.name);

  context.gamesById[play.gameId].mechanisms.forEach(
    (mechanism) => buffer.mechanisms.add(mechanism)
  );
  
  play.players.forEach(player => {
    if (player.name !== context.playerName) {
      buffer.playedWith.add(player.name);
    }
  });

  const winner = determineWinner(play);

  if (winner.has(context.playerName)) {
    buffer.wins += 1;
  }

  if (winner.size > 0) {
    buffer.playsWithAWinner += 1;
  }

  const weight = +context.gamesById[play.gameId].weight;
  buffer.complexitySumTime += weight * +play.length;
  buffer.complexitySumPlays += weight * +play.quantity;

  buffer.uniqueLocations.add(play.location);
}

function aggregate(buffer) {
  return {
    totalPlays: buffer.totalPlays,
    totalTimePlayed: buffer.totalTimePlayed,
    averagePlayTime: buffer.totalTimePlayed / buffer.totalPlays,
    uniqueGamesPlayed: buffer.games.size,
    uniqueMechanisms: buffer.mechanisms.size,
    averageNumberOfPlayers: buffer.totalNumberOfPlayers / buffer.totalPlays,
    averageComplexityOverTimePlayed: buffer.complexitySumTime / buffer.totalTimePlayed,
    averageComplexityOverNumberOfPlays: buffer.complexitySumPlays / buffer.totalPlays,
    uniqueLocations: buffer.uniqueLocations.size,
    playedWith: buffer.playedWith.size,
    playedWithList: [...buffer.playedWith],
    winPercentage: +(buffer.wins / buffer.playsWithAWinner * 100) || 0,
  };
}

const basicStats = createStat('basic', init, track, aggregate);

export default basicStats;

// const byLocation = {
//   name: 'byLocation',
//   init(stats) { stats.byLocation = {}; },
//   track(stats, play) {
//     if (!stats.byLocation[play.location]) {
//       stats.byLocation[play.location] = {
//         plays: 0,
//         duration: 0,
//       };
//     }

//     stats.byLocation[play.location].plays += +play.quantity;
//     stats.byLocation[play.location].duration += +play.length;
//   },
//   aggregate(stats) {
//     Object.entries(stats.byLocation).forEach(([location, { duration, plays }]) => {
//       if (plays > stats.most.mostPlayesAtLocationByPlays.plays) {
//         stats.most.mostPlayesAtLocationByPlays = { locations: [location], plays };
//       } else if (plays === stats.most.mostPlayesAtLocationByPlays.plays) {
//         stats.most.mostPlayesAtLocationByPlays.locations.push(location);
//       }

//       if (duration > stats.most.mostPlayesAtLocationByDuration.duration) {
//         stats.most.mostPlayesAtLocationByDuration = { locations: [location], duration };
//       } else if (duration === stats.most.mostPlayesAtLocationByDuration.duration) {
//         stats.most.mostPlayesAtLocationByDuration.locations.push(location);
//       }
//     });
//   },
// };

// const uniqueGamesPerYear = {
//   name: 'uniqueGamesPerYear',
//   init(stats) {
//     stats.years = {};
//   },
//   track(stats, play) {
//     const playYear = play.date.substr(0, 4);
//     if (!stats.years[playYear]) {
//       stats.years[playYear] = new Set();
//     }

//     stats.years[playYear].add(play.name);
//   },
//   aggregate(stats) {
//     stats.byYear = Object.entries(stats.years).reduce((result, [year, games]) => {
//       result[year] = { uniqueGames: [...games], uniqueGamesCount: games.size };
//       return result;
//     }, {});

//     Object.keys(stats.byYear).forEach((thisYear) => {
//       const allPreviousYearsCombined = new Set(Object.keys(stats.years).reduce((result, year) => {
//         if (Number.parseInt(year) < Number.parseInt(thisYear)) {
//           return result.concat(stats.byYear[year].uniqueGames);
//         }
//         return result;
//       }, []));

//       stats.byYear[thisYear].newThisYear = stats.byYear[thisYear].uniqueGames.filter(g => !allPreviousYearsCombined.has(g));
//       stats.byYear[thisYear].notPlayedThisYear = [...allPreviousYearsCombined].filter(g => !stats.years[thisYear].has(g));

//       stats.byYear[thisYear].newThisYearCount = stats.byYear[thisYear].newThisYear.length;
//       stats.byYear[thisYear].notPlayedThisYearCount = stats.byYear[thisYear].notPlayedThisYear.length;
//     });

//     delete stats.years;
//   }
// };

// const yearlyChallenges = {
//   name: 'yearlyChallenges',
//   init(stats) {
//     stats._years = {};
//   },
//   track(stats, play) {
//     const playYear = play.date.substr(0, 4);
//     if (!stats._years[playYear]) {
//       stats._years[playYear] = {};
//     }

//     if (!stats._years[playYear][play.name]) {
//       stats._years[playYear][play.name] = 0;
//     }

//     stats._years[playYear][play.name] += +play.quantity;
//   },
//   aggregate(stats) {
//     stats.yearlyChallenges = Object.entries(stats._years).reduce((result, [year, gamesMap]) => {
//       if (!result[year]) {
//         result[year] = {};
//       }

//       const [uniquePerYear, exactlyOnce, over2, over10, over20] = Object.entries(gamesMap).reduce((rzlt, [game, plays]) => {
//         rzlt[0] += 1;

//         if (plays == 1) {
//           rzlt[1].push(game);
//         }

//         if (plays >= 2) {
//           rzlt[2].push(game);
//         }

//         if (plays >= 10) {
//           rzlt[3].push(game);
//         }

//         if (plays >= 20) {
//           rzlt[4].push(game);
//         }

//         return rzlt;
//       }, [0, [], [], [], []]);

//       result[year]['uniqueThisYear'] = uniquePerYear;

//       result[year]['exactlyOnce'] = exactlyOnce.length;

//       result[year]['exactlyOnce'] = exactlyOnce.length;

//       result[year]['moreThanOnce'] = over2.length;

//       if (over10.length >= 10) {
//         result[year]['10x10'] = true;
//       }

//       if (over20.length >= 20) {
//         result[year]['20x20'] = true;
//       }

//       result[year].over10 = over10;
//       result[year].over20 = over20;

//       return result;
//     }, {});

//     delete stats._years;
//   },
// };

// const gamesPerYearPublished = {
//   name: 'gamesPerYearPublished',
//   init(stats) {
//     stats._byYearPublished = {};
//   },
//   track(stats, play) {
//     const yearPublished = gamesById[play.gameId].published;
//     if (!stats._byYearPublished[yearPublished]) {
//       stats._byYearPublished[yearPublished] = {
//         games: new Set(),
//         plays: 0,
//       }
//     }

//     stats._byYearPublished[yearPublished].games.add(gamesById[play.gameId].name);
//     stats._byYearPublished[yearPublished].plays += 1;
//   },
//   aggregate(stats) {
//     stats.byYearPublished = Object.entries(stats._byYearPublished)
//       .sort(([, objA], [, objB]) => objB.plays - objA.plays)
//       .reduce((result, [year, obj]) => {
//         result.push({
//           year,
//           games: [...obj.games],
//           numberOfGames: obj.games.size,
//           plays: obj.plays,
//         });

//         return result;
//       }, []);

//     stats.basic.gamesPublishInDifferentYears = stats.byYearPublished.length;

//     delete stats._byYearPublished;
//   },
// };