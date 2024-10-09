import { Command } from 'commander';
import process from 'node:process';

const program = new Command();

program
  .version('1.0.0')
  .description('GitHub CLI')
  .option('-n, --id <id>', 'Github ID')
  .action((options) => {
    console.log(`Trying to fetch github profile '${options.id}'!`);
  });

program.parse(process.argv);