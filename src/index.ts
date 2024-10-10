import 'dotenv/config';
import { Command } from 'commander';
import process from 'node:process';
import { Endpoints, OctokitResponse } from "@octokit/types";

import { insertUserWithLanguages } from './database';

const program = new Command();
const gitHubUsernameRegex =
  new RegExp(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i)

program
  .version('1.0.0')
  .description('GitHub CLI');

program
  .command('fetch')
  .description('Fetches and stores a GitHub profile')
  .option('-u, --username <username>', 'Github username')
  .action(async (options) => {
    console.log(`Trying to fetch github profile '${options.username}'!`);

    if (!gitHubUsernameRegex.test(options.username) || !options.username) {
      console.log('Invalid username. Exiting...');
      return;
    }

    // Octokit needs to be a ESM module however will not change
    // the initial setup to accomodate this, so we will use dynamic imports
    const { Octokit, RequestError } = await import('octokit');
    type listUserReposResponse =
      Endpoints["GET /users/{username}/repos"]["response"];

    // Extract the element type from the response array
    type ExtractArrayType<T> =
      T extends OctokitResponse<infer U, any> ? U : never;
    type ArrayType = ExtractArrayType<listUserReposResponse>;
    
    // Extract the element type from the array
    type ExtractElementType<T> = T extends (infer U)[] ? U : never;
    type ElementType = ExtractElementType<ArrayType>;

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    try {
      const user = await octokit.request(`GET /users/${options.username}`, {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      // Grab data from public repositories from this user
      // * We could fetch further the repository to get a full set of
      // * languages used by the user. Now we only have the main language
      // * of the repository
      let knownLanguages = [];
      if (user.data.public_repos > 0) {
        const repos = await octokit.request(
          `GET /users/${options.username}/repos`, {
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
        knownLanguages =
          repos.data.map((repo: ElementType) => repo.language)
      }
     
      // Convert github user id to external_id to our users table
      await insertUserWithLanguages({
        email: user.data.email,
        username: options.username,
        external_id: user.data.id,
        location: user.data.location,
        created_at: user.data.created_at
      }, knownLanguages);

    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        console.log('User not found');
        return;
      }
      console.error('An unhandled error occurred:', error);
      return;
    }
    process.exit(0);
  })

program
  .command('ls')
  .action(async () => {

  })

async function main() {
  program.parse(process.argv);
}
main();