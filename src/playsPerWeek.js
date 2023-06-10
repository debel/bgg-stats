const arrayOfWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isWithin(startDate, endDate) {
  return function ([day]) {
    const date = new Date(day);
    return !!(date >= startDate && date <= endDate);
  }
}

const ratings = {
  "N/A": '[BGCOLOR=#ffffff][b] N/A [/b][/BGCOLOR]',
  1: '[BGCOLOR=#ff0000][b] 1 [/b][/BGCOLOR]',
  3: '[BGCOLOR=#ff6699][b] 3 [/b][/BGCOLOR]',
  4: '[BGCOLOR=#ff66cc][b] 4 [/b][/BGCOLOR]',
  5: '[BGCOLOR=#cc99ff][b] 5 [/b][/BGCOLOR]',
  6: '[BGCOLOR=#9999ff][b] 6 [/b][/BGCOLOR]',
  7: '[BGCOLOR=#99ffff][b] 7 [/b][/BGCOLOR]',
  8: '[BGCOLOR=#66ff99][b] 8 [/b][/BGCOLOR]',
  9: '[BGCOLOR=#33cc99][b] 9 [/b][/BGCOLOR]',
  10: '[BGCOLOR=#00cc00][b] 10 [/b][/BGCOLOR]',
}

function formatPlaysReport(games, collection, plays) {
  return plays.reduce((result, play) => {
    let game = collection[play.name]
      ? `[thing=${collection[play.name].gameId}]${play.name}[/thing]`
      : null;

    if (game === null) {
      game = games[play.name]
        ? `[thing=${games[play.name].gameId}][/thing]`
        : play.name;
    }

    let rating;

    try {
      rating = ratings[collection[play.name].rating];
    } catch (ex) {
      console.error(play.name)
      rating = ratings['N/A'];
    }

    const players = play.players.length === 1
      ? 'solo'
      : `${play.players.length} players`;

    const plays = play.quantity === "1"
      ? ''
      : `, ${play.quantity} plays`;

    let totalPlays;
    let isNew;

    try {
      totalPlays = ` ([size=7]all time plays: ${collection[play.name].plays}[/size])`;
      isNew = play.new === true
        ? ', [color=#ff5100][size=9]new[/size][/color]'
        : '';
    } catch (ex) {
      totalPlays = '';
      isNew = '';
    }

    result += `${rating} ${game}${totalPlays} - ${players}${plays}${isNew}\n`;

    return result;
  }, '');
}

function formatPlayImages(games, collection, plays) {
  const uniqueGames = [...plays.reduce((result, play) => {
    result.add(play.name);

    return result;
  }, new Set())];

  const images = uniqueGames.reduce((result, game) => {
    let imgSrc = null
    if (collection[game]) {
      imgSrc = collection;
    } else if (games[game]) {
      imgSrc = games;
    } else {
      return result;
    }

    const thumb = imgSrc[game].thumbnail;
    const img = thumb.substring(thumb.lastIndexOf('/pic') + 4, thumb.length - 4);

    result += `[imageid=${img} small inline]`

    return result;
  }, '');

  return `${images}\n`;
}

function producePlaysReport(games, collection, playsByDay) {
  const sortedPlaysByDay = playsByDay.sort(
    ([day1], [day2]) => new Date(day1) - new Date(day2)
  );

  return sortedPlaysByDay.reduce((result, [day, plays]) => {
    const dayName = arrayOfWeekdays[new Date(day).getDay()]
    result += `[b][u]${dayName}[/u][/b]\n`;

    result += formatPlayImages(games, collection, plays);

    result += formatPlaysReport(games, collection, plays);

    result += '\n';

    return result;
  }, '');
}

function produceWeeklyStats(userName, games, collection, playsByDay, startDate, endDate) {
  const blankStats = { totalPlays: 0, totalTime: 0, totalComplexity: 0, uniqueTitles: new Set(), totalPlayers: 0, own: new Set(), newGames: 0, myWins: 0, };
  const weeklyStats = playsByDay.reduce((result, [_, plays]) => {
    plays.forEach(play => {
      result.totalPlays += +play.quantity;
      result.totalTime += +play.length;
      result.totalPlayers += play.players.length * +play.quantity;
      result.uniqueTitles.add(play.name);
      result.totalComplexity += +games[play.name].weight * +play.length;
      if (collection[play.name] && collection[play.name].status.own != '0') {
        result.own.add(play.name);
      }

      if (play.new) {
        result.newGames += 1;
      }

      result.myWins += play.players.reduce((result, player) => {
        if (player.userName === userName && player.won == true) {
          result += 1;
        }

        return result;
      }, 0);
    });

    return result;
  }, blankStats);

  const averageComplexity = (weeklyStats.totalComplexity / weeklyStats.totalTime).toFixed(2);
  const averagePlayTime = Math.round(weeklyStats.totalTime / weeklyStats.totalPlays);
  const averagePlayers = (weeklyStats.totalPlayers / weeklyStats.totalPlays).toFixed(2);

  let weeklyStatsReport = `[u][b]Weekly stats ${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}[/b][/u]\n`;
  weeklyStatsReport += `Total plays: ${weeklyStats.totalPlays}\n`;
  weeklyStatsReport += `Unique titles: ${weeklyStats.uniqueTitles.size}\n`;
  weeklyStatsReport += `New games: ${weeklyStats.newGames}\n`;
  weeklyStatsReport += `Average play duration: ${averagePlayTime} min\n`;
  weeklyStatsReport += `Average number of players: ${averagePlayers}\n`;
  weeklyStatsReport += `Average complexity: ${averageComplexity}\n`;
  weeklyStatsReport += `Own games played: ${(weeklyStats.own.size / weeklyStats.uniqueTitles.size * 100).toFixed(2)}%\n`;
  weeklyStatsReport += `My weekly win percentage: ${(weeklyStats.myWins / weeklyStats.totalPlays * 100).toFixed(2)}%\n`;
  weeklyStatsReport += `\n`;

  return weeklyStatsReport;
}

export default function (userName, games, collection, plays, startDate, endDate) {
  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const collectionByName = collection.reduce((result, game) => {
    result[game.name] = game;

    return result;
  }, {});

  const gamesByName = games.reduce((result, game) => {
    result[game.name] = game;

    return result;
  }, {});

  const playsByDay = Object.entries(plays)
    .filter(isWithin(startDate, endDate));

  const weeklyStats = produceWeeklyStats(userName, gamesByName, collectionByName, playsByDay, startDate, endDate);
  const playsReport = producePlaysReport(gamesByName, collectionByName, playsByDay);
  return `${weeklyStats}${playsReport}`;
}