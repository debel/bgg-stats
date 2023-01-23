import { fetchCollection, fetchPlays, fetchGame } from './bggClient.js';

fetchCollection('debelbot')
  .then(console.log, console.error);