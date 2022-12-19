const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//Body Parser
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

//Mongoose connection
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true })


//Database User Schema
let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
})

///Database User Model
let User = mongoose.model('User', userSchema);

//Create User
const createAndSaveUser = async (username) => {
  return new Promise((resolve, reject) => {
    const user = new User({
      username: username
    })
    user.save((err, doc) => {
      if (err) reject(err)
      if (doc) resolve(doc)
    })
  })
}

//Get list of Users
const getUsers = async () => {
  return new Promise((resolve, reject) => {
    User.find({},(err, data) => {
      if(err) reject(err)
      if(data) resolve(data)
    })
  })
}

//You can POST to /api/users with form data username to create a new user.
app.route('/api/users').post(async (req, res) => {
  try {
    const doc = await createAndSaveUser(req.body.username)
    //The returned response from POST /api/users with form data username will be an object with username and _id properties
    if (doc)
      res.json({"username": doc.username, "_id": doc._id})
  } catch (err) {
    console.log(err)
  }
})

//You can make a GET request to /api/users to get a list of all users.
//Each element in the array returned from GET /api/users is an object literal containing a user's username and _id.
app.route('/api/users').get(async (req, res) => {
  try {    
    const users = await getUsers()
    if(users)
      res.json(users) //The GET request to /api/users returns an array.
  } catch(err) {
    console.log(err)
  }
})