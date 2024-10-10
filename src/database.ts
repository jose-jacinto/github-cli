import pgPromise from 'pg-promise';

const pgp = pgPromise();

const config = {
  host: 'localhost',
  port: 5432,
  database: 'github_profiler',
  user: 'postgres',
  password: 'yapostgres'
};

const db = pgp(config);

interface IUser {
  username: string;
  email: string;
  location: string;
  external_id?: string;
  created_at: number;
}

interface User extends IUser {
  id: number;
  languages: string[];
}

async function insertUserWithLanguages(
  user: IUser,
  languages: string[]
): Promise<void> {
  try {

    // Start a transaction to ensure data integrity
    await db.tx(async t => {
      // Insert user
      // * Using pgp.as.name sanitizes the values to prevent SQL injection
      const columns = Object.keys(user).map(pgp.as.name).join(', ');
      const values = Object.keys(user).map(key => `$(${key})`).join(', ');

      const userResult = await t.one(`
        INSERT INTO users (${columns})
        VALUES (${values})
        RETURNING id
      `, user);

      // Insert or get programming language IDs
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

      console.log(`User inserted successfully with id: ${userResult.id}`);
    });
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

async function getUserWithLanguages(
  username: string
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

export { insertUserWithLanguages, getUserWithLanguages }