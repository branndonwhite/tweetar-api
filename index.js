const express = require('express');
const query = require('./queries');
// const cors = require('cors');

const app = express();
const port = 3000;

app.use(function(req, res, next){
  res.set({
    'Access-Control-Allow-Origin': 'http://localhost:5000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers'
  });
  next();
});
// app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

app.post('/signin', query.signIn);
app.post('/signup', query.signUp);

app.get('/user/:id', query.getUserById);
app.post('/user', query.createUser);
app.get('/tweet', query.getTweets);
app.get('/tweet/:id', query.getTweetById);
app.post('/tweet', query.createTweet);
app.put('/tweet/:id', query.updateTweet);
app.delete('/tweet/:id', query.deleteTweet);

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})