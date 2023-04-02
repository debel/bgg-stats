import { fetchGame } from './bggClient.js';

fetchGame(-1).then(console.log, console.error);