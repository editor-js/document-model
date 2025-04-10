import { OTServer } from './OTServer.js';
import { config } from 'dotenv';
import HawkCatcher from '@hawk.so/nodejs';
import process from 'process';

config();

/**
 * main function
 */
function main(): void {
  if (process.env.NODE_ENV === 'production' && process.env.HAWK_TOKEN !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    HawkCatcher.init(process.env.HAWK_TOKEN);
  }

  const otServer = new OTServer();

  otServer.start();
}

main();
