import basicStats from './basic.js';
import byGame from './byGame.js';
import byMechanism from './byMechanism.js';
import most from './most.js';


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

function generateGamesById(games) {
  return games.reduce((result, game) => {
    result[game.gameId] = game;

    return result;
  }, {});
}

function normalizePlayerName(name) {
  if (name === 'Sande') {
    return 'Shu_bot';
  }

  if (name === 'Misheto') {
    return 'Misheto Maslarova';
  }

  return name;
}

const stats = [
  basicStats,
  byGame,
  byMechanism,
  most,
];

export default async function generateStats(userName, { plays, games }) {
  const malformedPlays = extractMalformedPlayes(plays);
  const gamesById = generateGamesById(games);

  Object.values(plays).forEach((playsPerDate) => {
    playsPerDate.forEach((play) => {
      play.players.forEach(player => {
        const context = { playerName: normalizePlayerName(player.name), gamesById };
        stats.forEach(stat => {
          stat.track(context, play);
        });
      })
    })
  });
  
  const playerStats = stats.reduce((result, stat) => {
    const stats = stat.aggregate();

    Object.entries(stats).forEach(([playerName, playerStats]) => {
      if (!result[playerName]) {
        result[playerName] = {};
      }

      result[playerName][stat.statName] = playerStats;
    });

    return result;
  }, {});

  return {
    playerStats,
    malformedPlays,
  };
}
