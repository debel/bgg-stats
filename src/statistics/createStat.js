const stats = {};

export default function createStat(statName, init, track, aggregate) {
  const statInitialized = new Set();

  return {
    statName,
    track(context, play) {
      if (!stats[context.playerName]) {
        stats[context.playerName] = {};
      }

      if (!statInitialized.has(context.playerName)) {
        Object.assign(stats[context.playerName], init());
        statInitialized.add(context.playerName);
      }

      track(context, stats[context.playerName], play);
    },
    aggregate() {
      return Object.fromEntries(
        Object.entries(stats).map(
          ([playerName, playerStats]) => [playerName, aggregate(playerStats)]
        )
      );
    },
  };
}

export function determineWinner(play) {
  const winner = new Set(
    play.players.filter(player => player.won).map(player => player.name)
  );

  return winner;
}