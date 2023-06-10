import { fetchGame } from '../src/bggClient.js';

fetchGame(-1).then(console.log, console.error);