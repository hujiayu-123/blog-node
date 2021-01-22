const express = require('express')
const { users, articles } = require('./module')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())
app.use(require('cors')())

var SECRET = 'qwert'

// 注册
app.post('/blog/register', async (req, res) => {
  const data = req.body
  console.log(data)
  const obj = await users.create({
    name: data.name,
    pwd: data.pwd,
  })
  console.log(obj)
  res.send(obj)
})

// 登录
app.post('/blog/login', async (req, res) => {
  console.log(req.body)
  const user = await users.findOne({ name: req.body.name })
  if (!user) {
    return res.status(200).send({ errMsg: '用户名不存在' })
  }
  const ispwd = require('bcrypt').compareSync(req.body.pwd, user.pwd)
  if (!ispwd) {
    return res.status(200).send({
      errMsg: '密码错误',
    })
  }

  const token = jwt.sign({ id: String(user._id) }, SECRET)
  res.send({
    errCode: '0',
    user,
    token,
  })
})

const use = function (req, res, next) {
  // 这里必须是Response响应的定时器【120秒】
  res.setTimeout(120 * 1000, function () {
    console.log('Request has timed out.')
    return res.status(408).send('请求超时')
  })
  next()
}

// 发布文章
app.post('/blog/put', use, async (req, res) => {
  const data = req.body
  let timeCreate = new Date().toLocaleString()
  console.log(timeCreate)
  const obj = await articles.create({
    title: data.title,
    type: data.type,
    article: data.article,
    author: data.author,
    timeCreate: timeCreate,
  })
  res.send({
    errCode: '0',
  })
})

// 文章分类展示
app.post('/blog/article', async (req, res) => {
  const article = await articles.find({ type: req.body.type })
  if (article.length == 0) {
    return res.status(200).send({ errMsg: '该栏目暂未发布文章' })
  }
  res.send({
    errCode: '0',
    article,
  })
})

// 删除文章
app.post('/blog/delete', async (req, res) => {
  const data = await articles.findById({ _id: req.body.id })
  console.log(data)
  await data.remove()
  res.send({
    errCode: '0',
  })
})

// 文章详情
app.post('/blog/detail', async (req, res) => {
  const article = await articles.findById({ _id: req.body.id })
  res.send({
    errCode: '0',
    article,
  })
})

// 使用中间件
const auth = async (req, res, next) => {
  const raw = String(req.headers.authorization).split(' ').pop()
  const { id } = jwt.verify(raw, SECRET)
  req.user = await users.findById(id)
  next()
}

// 个人信息
app.get('/blog/userinfo', auth, async (req, res) => {
  res.send(req.user)
})

app.listen('3000', () => {
  console.log('http://localhost:3000')
})
