import { OTServer } from './OTServer.js';
import { config } from 'dotenv';

config();

/**
 * main function
 */
function main(): void {
  const otServer = new OTServer();

  otServer.start();
}

main();
