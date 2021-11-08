import fetch from 'node-fetch';
import { Parser } from 'xml2js';
import { throwIfNot200, withRetry } from './utils.js';

const bggBaseUrl = 'https://api.geekdo.com/xmlapi2';

const bggCollectionUrlParams = 'subtype=boardgame&excludesubtype=boardgameexpansion&stats=1';

const bggCollectionUrl = userName => (
  `${bggBaseUrl}/collection?${bggCollectionUrlParams}&username=${userName}`
);

const bggPlaysUrl = (userName, page = 1) => `${bggBaseUrl}/plays?username=${userName}&page=${page}`;

const bggGamesUrl = id => `${bggBaseUrl}/thing?stats=1&id=${id}`;

const xmlParser = new Parser();

export const fetchCollection = withRetry(userName => fetch(bggCollectionUrl(userName))
  .then(throwIfNot200('Failed to fetch collection'))
  .then(res => res.text())
  .then(txt => xmlParser.parseStringPromise(txt))
  .then(json => json.items.item.reduce((collection, gameJson) => {
    const game = extractGameInCollection(gameJson);

    collection.push(game);

    return collection;
  }, [])));

const extractGameInCollection = (json) => ({
  gameId : json.$.objectid,
  name: json.name[0]._,
  status: json.status[0].$,
  comment: json.comment,
  rating: json.stats[0].rating[0].$.value,
  plays: +json.numplays[0],
  thumbnail: json.thumbnail[0],
});

const extractGame = (json) => {
  const gameId = json.items.item[0].$.id;
  const name = json.items.item[0].name.find(name => name.$.type === 'primary').$.value;
  const published = json.items.item[0].yearpublished[0].$.value;
  const weight = json.items.item[0].statistics[0].ratings[0].averageweight[0].$.value; 
  const mechanisms = json.items.item[0].link
    .filter(link => link.$.type === 'boardgamemechanic')
    .map(link => link.$.value);

  return {
    gameId, name, published, mechanisms, weight,
  };
};

export const fetchGame = withRetry(id =>
  fetch(bggGamesUrl(id))
    .then(res => res.text())
    .then(txt => xmlParser.parseStringPromise(txt))
    .then(extractGame)
);

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

    if (!name || player.$.username === userName) {
      name = userName;
    }

    return { name };
  });

  return normalizedPlayers;
};

const extractPlays = (userName, json) => json.plays.play.map(play => ({
    id: play.$.id,
    name: play.item[0].$.name,
    gameId: play.item[0].$.objectid,
    quantity: play.$.quantity,
    date: play.$.date,
    length: +play.$.length || 0,
    players: normalizePlayers(userName, play.players),
    location: play.$.location,
    incomplete: play.$.incomplete === '0' ? false : true,
  }));

export const fetchPlays = (userName, page = 1, collectedPlays = []) => (
  fetch(bggPlaysUrl(userName, page))
    .then(res => res.text())
    .then(txt => xmlParser.parseStringPromise(txt))
    .then(json => (containsPlays(json)
      ? fetchPlays(userName, page + 1, collectedPlays.concat(extractPlays(userName, json)))
      : collectedPlays)
    ).catch((error => { console.error(error); throw error; }))
);