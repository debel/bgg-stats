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