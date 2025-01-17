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

//Database User Schema
let exerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  }
})

///Database User Model
let Exercise = mongoose.model('Exercise', exerciseSchema);

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

//Find one user by ID
const findUserById = (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .select("-__v")
      .lean()
      .exec((err, user) => {
        if (err) reject(err)
        if (user) resolve(user)
      })
  })
}

//Get list of Users
const getUsers = async () => {
  return new Promise((resolve, reject) => {
    User.find({}, (err, doc) => {
      if (err) reject(err)
      if (doc) resolve(doc)
    })
  })
}

//Create Execise
const createAndSaveExercise = async (user_id, date, duration, description) => {
  return new Promise((resolve, reject) => {
    const exercise = new Exercise({
      user_id: user_id,
      date: date,
      duration: duration,
      description: description
    })
    exercise.save((err, doc) => {
      if (err) reject(err)
      if (doc) resolve(doc)
    })
  })
}

//Find Exercises
const findExercisesByUserId = async (user_id, date_from, date_to, limit) => {
  return new Promise((resolve, reject) => {
    Exercise.find({
      user_id: user_id,
      date: { $gte: date_from, $lte: date_to }
    })
      .select("-_id -user_id -__v")
      .limit(limit)
      .lean()
      .exec((err, doc) => {
        if (err) reject(err)
        if (doc) resolve(doc)
      })
  })
}

//You can POST to /api/users with form data username to create a new user.
app.route('/api/users').post(async (req, res) => {
  try {
    const doc = await createAndSaveUser(req.body.username)
    //The returned response from POST /api/users with form data username will be an object with username and _id properties
    if (doc)
      res.json({ "username": doc.username, "_id": doc._id })
  } catch (err) {
    console.log(err)
  }
})

//You can make a GET request to /api/users to get a list of all users.
//Each element in the array returned from GET /api/users is an object literal containing a user's username and _id.
app.route('/api/users').get(async (req, res) => {
  try {
    const users = await getUsers()
    if (users)
      res.json(users) //The GET request to /api/users returns an array.
  } catch (err) {
    console.log(err)
  }
})

//You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.
app.route('/api/users/:_id/exercises').post(async (req, res) => {
  try {
    //Find user
    let user = await findUserById(req.params._id)
    if (!user)
      throw new Error('user not found!')

    const user_id = req.params._id
    const duration = req.body.duration
    const description = req.body.description
    const date = (req.body.date) ? new Date(req.body.date) : new Date()

    //Create exercise
    const exercise = await createAndSaveExercise(user_id, date, duration, description)
    if (!exercise)
      throw new Error('exercise not created!')

    //The response returned from POST /api/users/:_id/exercises will be the user object with the exercise fields added.
    user.date = exercise.date.toDateString()
    user.duration = exercise.duration
    user.description = exercise.description
    res.json(user)

  } catch (err) {
    console.log(err)
  }
})

//You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user.
//You can add from, to and limit parameters to a GET /api/users/:_id/logs request to retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. limit is an integer of how many logs to send back.
app.route('/api/users/:_id/logs').get(async (req, res) => {
  try {
    const date_from = req.query.from || new Date(0)
    const date_to = req.query.to || new Date(Date.now())
    const limit = Number(req.query.limit) || 10

    const user = await findUserById(req.params._id)
    if (!user)
      throw new Error('user not found!')

    const exercises = await findExercisesByUserId(user._id, date_from, date_to, limit)

    if (!exercises)
      throw new Error('no exercises found!')

    exercises.forEach((ex) => {
      ex.date = ex.date.toDateString()
    })

    user.count = exercises.length
    user.log = exercises
    res.json(user)

  } catch (err) {
    console.log(err)
  }
})