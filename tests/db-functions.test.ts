import pgPromise from 'pg-promise';
import { expect, it, describe, beforeEach, afterAll } from '@jest/globals';

import {
  insertUserWithLanguages,
  fetchUsers,
  User
} from '../src/database';

describe('Database Functions', () => {
  let db: pgPromise.IDatabase<object>;
  let pgp: pgPromise.IMain;

  beforeAll(async () => {
    pgp = pgPromise();

    const config = {
      host: 'localhost',
      port: 5432,
      database: 'github_fetch_test',
      user: 'postgres',
      password: 'yapostgres'
    };
    db = pgp(config);
  });

  afterAll(() => {
    pgp.end();
  });

  beforeEach(async () => {
    // Reset the database before each test
    await db.none(`
      DROP TABLE IF EXISTS user_languages;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS languages;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        external_id INTEGER UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE languages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );

      CREATE TABLE user_languages (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        language_id INTEGER REFERENCES languages(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, language_id)
      );
    `);
  });

  describe('insertUserWithLanguages', () => {
    it('should insert a user with languages', async () => {
      const user = {
        username: 'testuser',
        email: 'test@example.com',
        external_id: 134,
        location: 'Portugal',
        created_at: new Date(Date.now()).toISOString()
      };
      const languages = ['TypeScript', 'C++']

      const result = await insertUserWithLanguages(user, languages, db);

      expect(result.username).toBe(user.username);
      expect(result.email).toBe(user.email);
      expect(result.external_id).toBe(user.external_id);
      expect(result.languages).toEqual(expect.arrayContaining(languages));
    });

    it('should handle duplicate language insertion', async () => {
      const user1 = {
        username: 'user1',
        email: 'user1@example.com',
        external_id: 13457,
        location: 'Portugal',
        created_at: new Date(Date.now()).toISOString()
      };
      const user1Langs = ['TypeScript', 'C++']
      const user2 = {
        username: 'user2',
        external_id: 1342,
        email: 'user2@example.com',
        location: 'Los Angeles, CA',
        created_at: new Date(Date.now()).toISOString()
      };
      const user2Langs = ['TypeScript', 'Java']

      await insertUserWithLanguages(user1, user1Langs, db);
      const result = await insertUserWithLanguages(user2, user2Langs, db);

      expect(result.username).toBe(user2.username);
      expect(result.languages).toEqual(
        expect.arrayContaining(user2Langs)
      );

      // Check that we don't have duplicate 'TypeScript'
      // entries in the languages table
      const languageCount =
        await db.one<{ count: string }>
        ('SELECT COUNT(*) FROM languages WHERE name = $1', 'TypeScript');
      expect(parseInt(languageCount.count)).toBe(1);
    });
  });

  describe('fetchUsers', () => {
    beforeEach(async () => {
      // Clear the tables before each test
      await db.none('TRUNCATE users, languages, user_languages CASCADE');

      // Insert some test data
      await insertUserWithLanguages({ 
        username: 'user1',
        email: 'user1@example.com',
        external_id: 1,
        location: 'Los Angeles, CA',
        created_at: new Date(Date.now()).toISOString()
      }, ['TypeScript', 'C++', 'Python'], db);
      await insertUserWithLanguages({
        username: 'user2',
        email: 'user2@example.com',
        external_id: 2,
        location: 'Los Angeles, CA',
        created_at: new Date(Date.now()).toISOString()
      }, ['TypeScript', 'C++', 'Java'], db);
      await insertUserWithLanguages({
        username: 'user3',
        email: 'user3@example.com',
        external_id: 3,
        location: 'Los Angeles, CA',
        created_at: new Date(Date.now()).toISOString()
      }, ['Scala', 'Dockerfile'], db);
    });

    it('should fetch users by username', async () => {
 
      const result =
        await fetchUsers({ column: 'username', value: 'user1' }, db);
      expect((result as User[]).length).toBe(1);
    });

    it('should fetch users by languages', async () => {
      const result = await fetchUsers(['Dockerfile'], db);
      expect((result as User[]).length).toBe(1);
      expect((result as User[])[0].username).toBe('user3');
    });

    it('should return empty array for non-existent languages',
      async () => {
        const result = await fetchUsers(['Husky']);
        expect((result as User[]).length).toBe(0);
      });

    it('should fetch all users when searching by a common language',
      async () => {
        const result = await fetchUsers(['TypeScript'], db);
        expect((result as User[]).length).toBe(2);
        expect((result as User[]).map(u => u.username)).toEqual(
          expect.arrayContaining(['user1', 'user2'])
        );
      });
  });
});