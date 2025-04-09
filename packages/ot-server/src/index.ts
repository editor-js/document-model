import { OTServer } from './OTServer.js';

/**
 * main function
 */
function main(): void {
  const otServer = new OTServer();

  otServer.start();
}

main();
