import fetch from 'node-fetch';
import { Parser } from 'browser-xml2js';
import { throwIfNot200, withRetry, CancelError } from './utils.js';

const bggBaseUrl = 'https://api.geekdo.com/xmlapi2';

const bggCollectionUrlParams = 'subtype=boardgame&excludesubtype=boardgameexpansion&stats=1';

const bggCollectionUrl = userName => (
  `${bggBaseUrl}/collection?${bggCollectionUrlParams}&username=${userName}`
);

const bggPlaysUrl = (userName, startDate, endDate, page) => {
  const start = startDate ? `&mindate=${startDate}` : '';
  
  const end = endDate ? `&maxdate=${endDate}` : '';

  return `${bggBaseUrl}/plays?username=${userName}${start}${end}&page=${page}`;
};

const bggGamesUrl = id => `${bggBaseUrl}/thing?stats=1&id=${id}`;

const xmlParser = new Parser();

if (typeof xmlParser.parseStringPromise !== 'function') {
  xmlParser.parseStringPromise = function (str) {
    return new Promise((resolve, reject) => {
      xmlParser.parseString(str, (err, result) => {
        if (err) { return reject(err); }

        resolve(result);
      });
    });
  }
}

const extractGameInCollection = (json) => {
  return {
    gameId : json.$.objectid,
    name: json.name[0]._,
    status: json.status[0].$,
    comment: json.comment,
    rating: json.stats[0].rating[0].$.value,
    plays: +json.numplays[0],
    thumbnail: json.thumbnail[0],
  };
};

const extractGame = (id, json) => {
  if (!json.items || !json.items.item) {
    throw new CancelError(`failed to fetch game ${id}`);
  }

  const gameId = json.items.item[0].$.id;
  const name = json.items.item[0].name.find(name => name.$.type === 'primary').$.value;
  const published = json.items.item[0].yearpublished[0].$.value;
  const weight = json.items.item[0].statistics[0].ratings[0].averageweight[0].$.value;
  const thumbnail = json.items.item[0].thumbnail[0];

  const mechanisms = json.items.item[0].link
    .filter(link => link.$.type === 'boardgamemechanic')
    .map(link => link.$.value);

  const categories = json.items.item[0].link
  .filter(link => link.$.type === 'boardgamecategory')
  .map(link => link.$.value);

  const families = json.items.item[0].link
  .filter(link => link.$.type === 'boardgamefamily')
  .map(link => link.$.value);

  const designers = json.items.item[0].link
  .filter(link => link.$.type === 'boardgamedesigner')
  .map(link => link.$.value);

  return {
    gameId, name, published, mechanisms, categories, families, designers, weight, thumbnail,
  };
};

const containsPlays = json => (
  json && json.plays && json.plays.play && Array.isArray(json.plays.play) && json.plays.play.length > 0
);

const normalizePlayers = (userName, players) => {
  if (!players || !Array.isArray(players) || players.length === 0) {
    const players = [{ name: userName }];

    players.error = { error: 'NO PLAYERS LOGGED' };

    return players;
  }

  const normalizedPlayers = players[0].player.map(player => {
    let name = player.$.name;
    
    if (!name) {
      if (player.$.username === userName) {
        name = userName;
      } else if (player.$.username) {
        name = player.$.username;
      } else {
        name = 'Unknown guest';
      }
    }

    const normalizedPlayer = {
      name,
      won: !!(player.$.win != '0'),
      new: !!(player.$.new == '1'),
    };

    if (player.$.username) {
      normalizedPlayer.userName = player.$.username;
    }

    return normalizedPlayer;
  });

  return normalizedPlayers;
};

const isFirstPlay = (userName, normalizedPlayers) => (
  normalizedPlayers.reduce((result, player) => {
    if (player.userName === userName && player.new === true) {
      result = true;
    }

    return result;
  }, false)
);

const extractPlays = (userName, json) => (
  json.plays.play.map(play => {
    const players = normalizePlayers(userName, play.players);

    return {
      id: play.$.id,
      name: play.item[0].$.name,
      gameId: play.item[0].$.objectid,
      quantity: play.$.quantity,
      date: play.$.date,
      length: +play.$.length || 0,
      players,
      location: play.$.location,
      incomplete: play.$.incomplete === '0' ? false : true,
      new: isFirstPlay(userName, players),
    };
  })
);

const fetchPlaysPages = (userName, page, collectedPlays, startDate, endDate) => (
  fetch(bggPlaysUrl(userName, startDate, endDate, page))
    .then(res => res.text())
    .then(txt => xmlParser.parseStringPromise(txt))
    .then(json => (containsPlays(json)
      ? fetchPlaysPages(userName, page + 1, collectedPlays.concat(extractPlays(userName, json)), startDate, endDate)
      : collectedPlays)
    ).catch((error => { console.error(error); throw error; }))
);

export const fetchGame = withRetry(id =>
  fetch(bggGamesUrl(id))
    .then(res => res.text())
    .then(txt => xmlParser.parseStringPromise(txt))
    .then(json => extractGame(id, json))
);

export const fetchCollection = withRetry(userName => fetch(bggCollectionUrl(userName))
  .then(throwIfNot200('Failed to fetch collection'))
  .then(res => res.text())
  .then(txt => xmlParser.parseStringPromise(txt))
  .then(json => json.items.item.reduce((collection, gameJson) => {
    collection.push(extractGameInCollection(gameJson));

    return collection;
  }, []))
);

export const fetchPlays = (userName, startDate, endDate) => {
  return fetchPlaysPages(userName, 1, [], startDate, endDate);
};