function isWithin(startDate, endDate) {
  return function ([day]) {
    const date = new Date(day);
    return !!(date >= startDate && date <= endDate);
  }
}

const ratings = {
  "N/A": '[BGCOLOR=#ffffff][b]&nbsp;N/A&nbsp;[/b][/BGCOLOR]',
  1: '[BGCOLOR=#ff0000][b]&nbsp;1&nbsp;[/b][/BGCOLOR]',
  3: '[BGCOLOR=#ff6699][b]&nbsp;3&nbsp;[/b][/BGCOLOR]',
  4: '[BGCOLOR=#ff66cc][b]&nbsp;4&nbsp;[/b][/BGCOLOR]',
  5: '[BGCOLOR=#cc99ff][b]&nbsp;5&nbsp;[/b][/BGCOLOR]',
  6: '[BGCOLOR=#9999ff][b]&nbsp;6&nbsp;[/b][/BGCOLOR]',
  7: '[BGCOLOR=#99ffff][b]&nbsp;7&nbsp;[/b][/BGCOLOR]',
  8: '[BGCOLOR=#66ff99][b]&nbsp;8&nbsp;[/b][/BGCOLOR]',
  9: '[BGCOLOR=#33cc99][b]&nbsp;9&nbsp;[/b][/BGCOLOR]',
  10: '[BGCOLOR=#00cc00][b]&nbsp;10&nbsp;[/b][/BGCOLOR]',
}


function formatPlaysReport(collection, plays) {
  return plays.reduce((result, play) => {
  const game = collection[play.name]
    ? `[thing=${collection[play.name].gameId}][/thing]`
    : play.name;
  
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
    totalPlays = `([size=7]all time plays: ${collection[play.name].plays}[/size])`;
    isNew = collection[play.name].plays === 1
    ? ', [color=#ff5100][size=9]new[/size][/color]'
    : '';
  } catch (ex) {
    totalPlays = '';
    isNew = '';
  }

  result += `${rating} ${game} ${totalPlays} - ${players}${plays}${isNew}\n`;

  return result;
  }, '');
}

function formatPlayImages(collection, plays) {
  const games = [...plays.reduce((result, play) => {
    result.add(play.name);

    return result;
  }, new Set())];

  const images = games.reduce((result, game) => {
    if (!collection[game]) {
      return result;
    }

    const thumb = collection[game].thumbnail;
    const img = thumb.substring(thumb.lastIndexOf('/pic') + 4, thumb.length - 4);

    result += `[imageid=${img} micro inline]`

    return result;
  }, '');

  return `${images}\n`;
}

const arrayOfWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function producePlaysReport(collection, playsByDay) {
  const sortedPlaysByDay = playsByDay.sort(
    ([day1], [day2]) => new Date(day1) - new Date(day2)
  );
  
  return sortedPlaysByDay.reduce((result, [day, plays]) => {
    const dayName = arrayOfWeekdays[new Date(day).getDay()]
    result += `[b][u]${dayName}[/u][/b]\n`;

    result += formatPlayImages(collection, plays);

    result += formatPlaysReport(collection, plays);

    result += '\n';

    return result;
  }, '');
}

function produceWeeklyStats(games, collection, playsByDay, startDate, endDate) {
  const weeklyStats = playsByDay.reduce((result, [_, plays]) => {
    plays.forEach(play => {
      result.totalPlays += +play.quantity;
      result.totalTime += +play.length;
      result.totalPlayers += play.players.length * +play.quantity;
      result.uniqueTitles.add(play.name);
      result.totalComplexity += +games[play.name].weight * +play.length;
    });

    return result;
  }, { totalPlays: 0, totalTime: 0, totalComplexity: 0, uniqueTitles: new Set(), totalPlayers: 0, });

  const averageComplexity = (weeklyStats.totalComplexity / weeklyStats.totalTime).toFixed(2);
  const averagePlayTime = Math.round(weeklyStats.totalTime / weeklyStats.totalPlays);
  const averagePlayers = (weeklyStats.totalPlayers / weeklyStats.totalPlays).toFixed(2);

  let weeklyStatsReport = `[u][b]Weekly stats ${startDate.toLocaleDateString('de-DE')} - ${endDate.toLocaleDateString('de-DE')}[/b][/u]\n`;
  weeklyStatsReport += `Total plays: ${weeklyStats.totalPlays}\n`;
  weeklyStatsReport += `Unique titles: ${weeklyStats.uniqueTitles.size}\n`;
  weeklyStatsReport += `Average play duration: ${averagePlayTime} min\n`;
  weeklyStatsReport += `Average number of players: ${averagePlayers}\n`;
  weeklyStatsReport += `Average complexity: ${averageComplexity}\n`;
  weeklyStatsReport += `\n`;

  return weeklyStatsReport;
}

export default function(games, collection, plays, startDate, endDate) {
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

  return `${produceWeeklyStats(gamesByName, collectionByName, playsByDay, startDate, endDate)}${producePlaysReport(collectionByName, playsByDay)}`;
}