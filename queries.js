const Client = require('pg').Client;
const bcrypt = require('bcrypt');

const saltRounds = 10;
const client = new Client({
  user: "admin",
  host: "localhost",
  database: "tweetar",
  password: "admin",
  port: 5432
});

client.connect(err => {
  if (err) {
    console.error('connection error', err.stack)
  } else {
    console.log('connected')
  }
})

client.query(
  `CREATE TABLE IF NOT EXISTS users(
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(30) NOT NULL,
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR NOT NULL
  );`, (error, results) => {
  if(error){
    console.error(error.stack);
  }
  console.log("Table users created");
});

client.query(
  `CREATE TABLE IF NOT EXISTS tweets(
    tweet_id SERIAL PRIMARY KEY NOT NULL,
    tweet VARCHAR(241) NOT NULL,
    tweet_time TIMESTAMP,
    edited BOOLEAN
  );`, (error, results) => {
    if(error){
      console.error(error.stack);
    }
    console.log("Table tweets created");
});

client.query(
  `CREATE TABLE IF NOT EXISTS users_tweets(
    user_tweet_id SERIAL PRIMARY KEY NOT NULL,
    user_id INT,
    tweet_id INT,
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tweet FOREIGN KEY(tweet_id) REFERENCES tweets(tweet_id) ON DELETE CASCADE
  );`, (error, results) => {
    if(error){
      console.error(error.stack);
    }
    console.log("Table users_tweets created");
  }
)

const getUserByUsername = username => {
  return client.query('SELECT * FROM users WHERE username = $1', [username]);
}

const getUserByEmail = email => {
  return client.query('SELECT * FROM users WHERE email = $1', [email]);
}

const signIn = (request, response, next) => {
  const {username, password} = request.body;

  getUserByUsername(username)
  .then((user) => {
    const hash = user.rows[0].password;

    bcrypt.compare(password, hash).then((results) => {
      if(results){
        response.status(200).json({
          message: "Welcome back!"
        });
      }else{
        response.status(401).json({
          message: "Wrong password"
        });
      }
    });
  })
  .catch((error) => {
    response.status(401).json({
      message: "Wrong username"
    });
  })
}

const signUp = (request, response, next) => {
  const {email} = request.body;

  getUserByEmail(email)
  .then((user) => {
    if(user.rows.length > 0){
      response.status(401).json({
        message: "Email has already been taken"
      });
    }else{
      createUser(request, response);
    }
  })
  .catch((error) => {
    response.status(500).json({
      message: "Oops...something went wrong",
      error: error.stack
    });
  })
}

const getUserById = (request, response) => {
  const id = parseInt(request.params.id);

  client.query('SELECT * FROM users WHERE user_id = $1', [id], (error, results) => {
    if(error){
      throw error;
    }
    response.status(200).json(results.rows);
  });
}

const createUser = (request, response) => {
  const {name, username, email, password} = request.body;

  bcrypt.genSalt(saltRounds, function(error, salt){
    bcrypt.hash(password, salt, function(error, hash){
      client.query(
        'INSERT INTO users (name, username, email, password) VALUES($1, $2, $3, $4)', 
        [name, username, email, hash], 
        (error, results) => {
          if(error){
            response.status(401).json({
              message: "Username has already been taken"
            })
          }
          response.status(201).json({
            message: "User created"
          });
        }
      );
    });
  });
}

const getTweets = (request, response) => {
  client.query(
    `SELECT user_tweet_id, name, username, tweet, tweet_time, edited FROM users_tweets 
    JOIN users ON users_tweets.user_id = users.user_id
    JOIN tweets ON users_tweets.tweet_id = tweets.tweet_id
    ORDER BY tweet_time DESC`, 
    (error, results) => {
      if(error){
        throw error;
      }
      response.status(200).json(results.rows);
    }
  );
}

const getTweetById = (request, response) => {
  const id = parseInt(request.params.id);

  client.query(
    `SELECT user_tweet_id, name, username, tweet, tweet_time, edited FROM users_tweets 
    JOIN users ON users_tweets.user_id = users.user_id
    JOIN tweets ON users_tweets.tweet_id = tweets.tweet_id
    WHERE user_tweet_id = $1`, 
    [id], 
    (error, results) => {
      if(error){
        throw error;
      }
      response.status(200).json(results.rows);
  });
}

const createTweet = (request, response) => {
  const tweet_time = new Date();
  const {tweet, user_id} = request.body;
  let tweet_id;

  client.query(
    'INSERT INTO tweets (tweet, tweet_time, edited) VALUES($1, $2, false) RETURNING tweet_id', 
    [tweet, tweet_time], 
    (error, results) => {
      if(error){
        throw error;
      }

      tweet_id = results.rows[0].tweet_id;

      client.query(
        'INSERT INTO users_tweets (user_id, tweet_id) VALUES($1, $2)',
        [user_id, tweet_id],
        (error, results) => {
          if(error){
            console.log(error);
          }
          response.status(201);
        }
      );

      response.status(201).json({
        message: "Tweet created"
      });
    }
  );
}

const updateTweet = (request, response) => {
  const tweet_id = parseInt(request.params.id);
  const tweet_time = new Date();
  const {tweet} = request.body;

  client.query(
    'UPDATE tweets SET tweet = $1, tweet_time = $2, edited = true WHERE tweet_id = $3', 
    [tweet, tweet_time, tweet_id], 
    (error, results) => {
      if(error){
        throw error;
      }
      response.status(200).json({
        message: "Tweet updated"
      });
  });
}

const deleteTweet = (request, response) => {
  const tweet_id = parseInt(request.params.id);

  client.query('DELETE FROM tweets WHERE tweet_id = $1', [tweet_id], (error, results) => {
    if(error){
      console.log(error.stack);
    }
    response.status(200).json({
      message: "Tweet deleted"
    });
  });

  client.query('DELETE FROM users_tweets WHERE tweet_id = $1', [tweet_id], (error, results) => {
    if(error){
      console.log(error.stack);
    }
    response.status(200);
  });
}

module.exports = {
  signUp,
  signIn, 
  getUserById, 
  createUser, 
  getTweets, 
  getTweetById, 
  createTweet, 
  updateTweet, 
  deleteTweet
}