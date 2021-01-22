const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/test', {
  useCreateIndex: true,
  useNewUrlParser: true,
})
const userParam = new mongoose.Schema({
  name: { type: String, unique: true },
  pwd: {
    type: String,
    set(val) {
      return require('bcrypt').hashSync(val, 10)
    },
  },
})
const users = mongoose.model('users', userParam)

const articleParam = new mongoose.Schema({
  title: { type: String },
  type: { type: String },
  article: { type: String },
  author: { type: String },
  timeCreate: { type: String },
})
const articles = mongoose.model('articles', articleParam)

module.exports = { users, articles }
