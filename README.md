# LovelyStay Home task

## Introduction
Goal is to develop a command-line application using NodeJS + TypeScript + PostgreSQL.

1. Fetch information about a given GitHub user (passed as a command-line argument) using the [GitHub API](https://docs.github.com/en/rest), and store it on one or more database tables - the mandatory fields are Name and Location, but you will get bonus points for additional fields;
2. Using a different command-line option, it should be possible to fetch and display all users already on the database (showing them on the command line);
3. Improving on the previous requirement, it should also be possible to list users only from a given location (again, using a command-line option);
4. Finally, the application should also query the programming languages this user seems to know/have repositories with, and store them on the database as well - allowing to query a user per location and/or programming languages;

### Requirements
There are some mandatory requirements:
- You must use NodeJS, TypeScript, and PostgreSQL;
- You should setup the database using migrations, if possible (preferably using SQL, but not mandatory) - feel free to use external tools or libraries for this purpose;
- Code should be split into database functions and general processing functions, when possible;
- For database access, you must use this library: https://github.com/vitaly-t/pg-promise
- For the processing (business logic) functions you should use either native ES6 functions or the library https://ramdajs.com/docs/ (or both);
- All async functions must be composable, meaning you can call them in sequence without asynchronicity issues;
- You shall have one main function and you should avoid process.exit() calls to the bare minimum;
- You must not use classes, as it is not justified for such a small app (we use almost no classes on our code);
- Your code must be safe, assume all input strings as insecure and avoid SQL injections;
- Each line shall not exceed 80 characters (bonus points if you include/follow some eslint rules), and it should use 2 spaces instead of tabs;
- Your code must be uploaded to GitHub, GitLab, or bitbucket, and you shall present it as a Pull Request over your very first commit;
- And finally, very important, don't forget to include a proper ReadMe.md, that documents your application and tells us how to use it.
- Also, bonus points if you include relevant tests on your submission.

## Features
This CLI allows for retrieval of github users data via it's API, storage of the data received for further processing and inspection.
It allows all user listing, filtering by columns (eg user's location) and user's known languages.

## Getting Started

### Prerequisities
1. Docker is installed
2. Nodejs is installed
3. Get a github token here 👉 [https://github.com/settings/tokens]https://github.com/settings/tokens
4. Create a `.env` file in the root of the project and assign it to the variable `GITHUB_TOKEN`. The file should look like this:
```sh
GITHUB_TOKEN=ghp_llkJG ...
```

### Installation

1. Initialise database and spin up a container with postgres
```sh
npm install
docker run --name lovelystay-home-task -p 5432:5432 -e POSTGRES_PASSWORD=yapostgres -e POSTGRES_DB=lovelystay -d postgres
```

2. Setup database
```sh
npm run run-migrations
```

3. Compile typescript
```sh
npm run build
```

### Usage

Run the CLI either by running it in dev mode with the following examples
```sh
npm run dev -- fetch -u jose-jacinto
npm run dev -- list -loc Portugal
npm run dev -- list -lang TypeScript
```

Or install the CLI globally with
```sh
npm install -g .
```

And it's syntax is
```sh
github-fetch fetch jose-jacinto
github-fetch list -loc Portugal
github-fetch list -lang TypeScript
```

### Test

Unit tests can be run with
```sh
npm run test
```

## Design Decisions

### Github
Octokit was used to manage Github's Rest API. It provides type safety with all the best practices.
> [!IMPORTANT]
> Currently by fetching the user's repositories is enough to get the `main` programming language used.
> It is, however, possible to also get the complete set of languages used in the repo. This involves additional GETs for each repository
> I make the (dabatable) decision to not go through with these requests since just having the main language for each repo is enough in moste cases

### Database

Database was designed to store user's pertinent data for this project. Especially location and programming languages.
Programming languages are stored in a junction table, indexed to the user's id and language id.
Programming languages are also being stored in their own table providing an unique id for the junction table. This table can also be used to infer which languages are one record for the users, since no duplicate languages are allowed.

A migration script was developed to vertically deploy the database schema and any required future update. It uses a migrations table to store which migration was already deployed.
Two migration scripts were used for exemplification.
Migrations are not being tested as their own deployment mechanics are not in the scope of project.

## Challenges & Improvements

1. PgPromise needs some extra work for error handling especially during type-guarding error messages and codes. A wrapper could be beneficial in the long run.
2. Proper dependency injection could be produced to decouple database functions from actual database connection implementation.
3. A (wrong) decision to use `pg-mem` made me rework and lose a bit of time during tests creation. Although using an in-memory database for tests was a good idea, pg-mem does not support some postgres functions which were required in my code

```console
 🔨 Not supported 🔨 : unnest is not supported
    👉 pg-mem is work-in-progress, and it would seem that you've hit one of its limits.
```
I decided against refactoring database function's code and went to use the same db instance with a database especific for tests (github_fetch_test).

