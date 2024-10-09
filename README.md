# LovelyStay Home task

## Introduction

## Features

## Getting Started

### Prerequisities
### Installation
### Usage

## Design Decisions

## Challenges & Improvements

Goal is to develop a command-line application using NodeJS + TypeScript + PostgreSQL.

1. Fetch information about a given GitHub user (passed as a command-line argument) using the [GitHub API](https://docs.github.com/en/rest), and store it on one or more database tables - the mandatory fields are Name and Location, but you will get bonus points for additional fields;
2. Using a different command-line option, it should be possible to fetch and display all users already on the database (showing them on the command line);
3. Improving on the previous requirement, it should also be possible to list users only from a given location (again, using a command-line option);
4. Finally, the application should also query the programming languages this user seems to know/have repositories with, and store them on the database as well - allowing to query a user per location and/or programming languages;

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
