import createStat, { determineWinner } from './createStat.js';

function init() {
  return {
    byGame: {},
  };
}

function track(context, buffer, play) {
  if (!buffer.byGame[play.name]) {
    buffer.byGame[play.name] = {
      totalDuration: 0,
      totalPlays: 0,
      mostPlayedLocation: { locations: [], plays: 0 },
      playedAtLocations: 0,
      totalNumberOfPlayers: 0,
      wins: 0,
      playsWithAWinner: 0,
      playedWith: new Set(),
      byLocation: {},
    };
  }
  
  if (!buffer.byGame[play.name].byLocation[play.location]) {
    buffer.byGame[play.name].byLocation[play.location] = 0;
  }

  buffer.byGame[play.name].byLocation[play.location] += +play.quantity;

  buffer.byGame[play.name].totalPlays += +play.quantity;
  buffer.byGame[play.name].totalDuration += +play.length;
  buffer.byGame[play.name].totalNumberOfPlayers += play.players.length * +play.quantity;

  play.players.forEach(player => {
    if (player.name !== context.playerName) {
      buffer.byGame[play.name].playedWith.add(player.name);
    }
  });

  const winner = determineWinner(play);

  if (winner.has(context.playerName)) {
    buffer.byGame[play.name].wins += 1;
  }

  if (winner.size > 0) {
    buffer.byGame[play.name].playsWithAWinner += 1;
  }
}

function aggregate(buffer) {
  return Object.entries(buffer.byGame).reduce((results, [gameName, gameStat]) => {
    Object.entries(gameStat.byLocation).forEach(([location, plays]) => {
      if (plays > gameStat.mostPlayedLocation.plays) {
        gameStat.mostPlayedLocation = { locations: [location], plays };
      } else if (plays === gameStat.mostPlayedLocation.plays) {
        gameStat.mostPlayedLocation.locations.push(location);
      }
    });
  
    gameStat.playedAtLocations = Object.keys(gameStat.byLocation).length;

    results[gameName] = {
      averagePlayTime: gameStat.totalDuration / gameStat.totalPlays,
      averageNumberOfPlayers: gameStat.totalNumberOfPlayers / gameStat.totalPlays,
      totalDuration: gameStat.totalDuration,
      totalPlays: gameStat.totalPlays,
      mostPlayedLocation: gameStat.mostPlayedLocation,
      playedAtLocations: gameStat.playedAtLocations,
      byLocation: gameStat.byLocation,
      playedWith: gameStat.playedWith.size,
      playedWithList: [...gameStat.playedWith],
      winPercentage: +(gameStat.wins / gameStat.playsWithAWinner * 100) || 0,
    };
    return results;
  }, {});
}

const byGameStats = createStat('byGame', init, track, aggregate);

export default byGameStats;