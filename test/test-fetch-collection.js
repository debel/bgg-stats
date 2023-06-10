import { fetchCollection, fetchPlays, fetchGame } from '../src/bggClient.js';

fetchCollection('debelbot')
  .then(console.log, console.error);