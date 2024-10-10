import pgPromise, { ITask } from 'pg-promise';

const pgp = pgPromise();

const config = {
  host: 'localhost',
  port: 5432,
  database: 'github_fetch',
  user: 'postgres',
  password: 'yapostgres'
};

interface IUser {
  username: string;
  email: string;
  location: string;
  external_id?: number;
  created_at: string;
}

export interface User extends IUser {
  id: number;
  languages: string[];
}
interface UserFieldSearch {
  column: string;
  value: string | number;
}
type UserSearch = UserFieldSearch | string[];
class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

class InvalidColumnError extends Error {
  constructor(column: string) {
    super(`Invalid column name: ${column}`);
    this.name = 'InvalidColumnError';
  }
}
export type FetchUsersResult = User[] | DatabaseError | InvalidColumnError;

/**
 * Inserts a user along with their programming languages into the database.
 * 
 * @param user - The user object containing user details.
 * @param languages - An array of programming languages
 *  associated with the user.
 * @returns A promise that resolves
 *  when the user and languages are successfully inserted.
 * @throws Will throw an error if there is an issue with the database operation.
 */
async function insertUserWithLanguages(
  user: IUser,
  languages: string[],
  db: pgPromise.IDatabase<object> = pgp(config)
): Promise<any> {
  try {
    // Start a transaction to ensure data integrity
    const result = await db.tx(async t => {
      // Insert user
      // * Using pgp.as.name sanitizes the values to prevent SQL injection
      const columns = Object.keys(user).map(pgp.as.name).join(', ');
      const values = Object.keys(user).map(key => `$(${key})`).join(', ');

      const userResult = await t.one(`
        INSERT INTO users (${columns})
        VALUES (${values})
        RETURNING id, location, username, email, external_id
      `, user);

      // Insert or get programming language IDs
      // * deduplicates and removes null values from languages
      const languageIds = 
        await Promise.all([...new Set(languages)]
          .filter(Boolean).map(async (language) => {
            const result = await t.one<{ id: number }>(`
              INSERT INTO languages (name)
              VALUES ($1)
              ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
              RETURNING id
            `, language);
            return result.id;
          }));

      // Insert user programming languages
      // * unnest() is used to insert multiple rows at once from laguageIds
      await t.none(`
        INSERT INTO user_languages (user_id, language_id)
        SELECT $1, unnest($2::int[])
      `, [userResult.id, languageIds]);
      return {
        ...userResult,
        languages: [...new Set(languages)].filter(Boolean)
      }
    });
    return result
  } catch (error) {
    // Tricky any here, a error wrapper should be created
    // to manage PgPromise Errors
    if ((error as any).constraint === 'users_external_id_key') {
      console.log('User already exists');
      return;
    }
  
    console.error('Error inserting user with languages:', error);
    throw error;
  }
}

/**
 * Gets a single user along with their programming languages from the database.
 * 
 * @param username - The key to search for the user.
 *  associated with the user.
 * @returns A promise that resolves
 *  when the user is fetched with success.
 * @throws Will throw an error if there is an issue with the database operation.
 */
async function getUserWithLanguages(
  username: string,
  db: pgPromise.IDatabase<object> = pgp(config)
): Promise<User | null> {
  try {
    const user = await db.task(async t => {
      // Query for the user
      const userResult = await t.oneOrNone<User>(`
        SELECT id, username, email, external_id
        FROM users
        WHERE username = $1
      `, username);

      if (!userResult) {
        return null;
      }

      // Query for the user's programming languages
      const languages = await t.many<{ name: string }>(`
        SELECT l.name
        FROM languages l
        JOIN user_languages ul ON l.id = ul.language_id
        WHERE ul.user_id = $1
      `, userResult.id);

      // Combine user data with languages
      return {
        ...userResult,
        languages: languages.map(lang => lang.name)
      };
    });

    return user;
  } catch (error) {
    // Todo: Needs more error handling here

    console.error('Error querying user with languages:', error);
    throw error;
  }
}

// Helper to short circuit the type of the search params
function isUserFieldSearch(search: UserSearch): search is UserFieldSearch {
  return (search as UserFieldSearch).column !== undefined;
}
// Valid columns to search for users. Can be expanded as needed
const validUserColumns = ['location', 'id', 'username'];

/**
 * Gets a list of users from the database.
 * 
 * @param search - Either an object defining the column on which to search
 *  or an array of programming languages
 * @returns A promise that resolves
 *  when the users are fetched with success.
 * @throws Will throw an error if there is an issue with the database operation.
 */
async function fetchUsers(
  search: UserSearch | null,
  db: pgPromise.IDatabase<object> = pgp(config)
): Promise<FetchUsersResult> {
  return db.task(async (t: ITask<object>) => {
    try {
      let query = `
        SELECT u.id, u.username, u.email, u.external_id, u.location,
          array_agg(DISTINCT l.name) FILTER (WHERE l.name IS NOT NULL)
            AS languages
        FROM users u
        LEFT JOIN user_languages ul ON u.id = ul.user_id
        LEFT JOIN languages l ON ul.language_id = l.id
      `;

      let whereClause = '';
      let params: any[] = [];

      // Check if the search is by user field/column or programming languages
      if (search && isUserFieldSearch(search)) {
        // Searching by user field
        if (!validUserColumns.includes(search.column)) {
          return new InvalidColumnError(search.column);
        }
        whereClause =
          pgp.as.format('WHERE u.$1:name = $2', [search.column, search.value]);
      } else if (Array.isArray(search) && search.length > 0) {
        
        // Searching by programming languages

        whereClause = `
          WHERE u.id IN (
            SELECT ul.user_id
            FROM user_languages ul
            JOIN languages l ON ul.language_id = l.id
            WHERE l.name IN ($1:csv)
            GROUP BY ul.user_id
            HAVING COUNT(DISTINCT l.name) = $2
          )
        `;
        params = [search, search.length];
        
      }

      query += whereClause + ' GROUP BY u.id ORDER BY u.id';

      const users: User[] = await t.any(query, params);

      // Filter out users with empty language arrays
      return users.filter(user => user.languages.length > 0);

    } catch (error) {
      console.error('Database error:', error);
      return new DatabaseError((error as Error).message);
    }
  });
}

export { insertUserWithLanguages, getUserWithLanguages, fetchUsers }