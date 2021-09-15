const express = require('express')
const { users, articles } = require('./module')
const tokenFun = require('./token_vertify.js')
var expressJwt = require('express-jwt')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { compareSync } = require('bcrypt')
const svgCaptcha = require('svg-captcha')

const storage = multer.diskStorage({
  // 上传图片的存放位置在uploads
  destination: function (req, file, cb) {
    cb(null, './public//uploads/')
  },
  // windows下使用-代替：
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)
  },
})

const fileFilter = (req, file, cb) => {
  //判断上传图片类型
  if (file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

// limit上传图片尺寸限制
const uploads = multer({
  storage: storage,
  // limit: {
  //   fileSize: 1024 * 1024 * 5
  // },
  fileFilter: fileFilter,
})

const app = express()
app.use(express.json())
app.use(require('cors')())
app.use(express.static(path.join(__dirname, 'public')))

// 解析token获取用户信息
// app.use(function(req,res,next){
//   let token = req.headers['authorization'];
// 	if(token == undefined){
// 		return next();
// 	}else{
// 		tokenFun.verToken(token).then((data)=> {
//       console.log(data)
// 			req.data = data;
// 			return next();
// 		}).catch((error)=>{
// 			return next();
// 		})
// 	}
// })

//验证token是否过期并规定哪些路由不用验证
// app.use(expressJwt({
// 	secret: 'qwert',
//   algorithms: ['HS256'],
// }).unless({
// 	path: ['/blog/login','/blog/captcha']//除了这个地址，其他的URL都需要验证
// }));

//当token失效返回提示信息
// app.use(function(err, req, res, next) {
// 	if (err.status == 401) {
// 		return res.status(401).send('token失效');
// 	}
// });

var SECRET = 'qwert'

app.get('/', async (req, res) => {
  res.send('hello world!!!!')
})

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

let captchaTxt = ''

// 登录
app.post('/blog/login', async (req, res) => {
  const user = await users.findOne({ name: req.body.name })
  if (captchaTxt != req.body.code) {
    return res.status(200).send({ errMsg: '验证码错误' })
  }
  if (!user) {
    return res.status(200).send({ errMsg: '用户名不存在' })
  }
  const ispwd = require('bcrypt').compareSync(req.body.pwd, user.pwd)
  if (!ispwd) {
    return res.status(200).send({
      errMsg: '密码错误',
    })
  }
  tokenFun.setToken({ username: user.name, userid: user._id }).then((data) => {
    return res.send({
      errCode: '0',
      user,
      token: data,
    })
  })
})

// 验证码
app.get('/blog/captcha', async (req, res) => {
  let options = {
    size: 4,
    ignoreChars: '0o1il',
    color: true,
    noise: Math.floor(Math.random() * 5),
    width: 100,
    height: 40,
  }
  let captcha = svgCaptcha.create(options)
  res.type('svg')
  captchaTxt = captcha.text
  let succData = {
    errCode: '0',
    data: captcha.data,
  }
  res.send(succData)
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
  let ids = new Date().getTime()
  const obj = await articles.create({
    title: data.title,
    type: data.type,
    label: data.label,
    articleText: data.articleText,
    article: data.article,
    author: data.author,
    timeCreate: timeCreate,
    ids: ids,
    hits: 0,
  })
  res.send({
    errCode: '0',
    id: ids,
  })
})

// 修改文章
app.post('/blog/edit', use, async (req, res) => {
  const data = req.body
  await articles.updateOne(
    { ids: data.id },
    {
      $set: {
        title: data.title,
        type: data.type,
        label: data.label,
        articleText: data.articleText,
        article: data.article,
      },
    }
  )
  res.send({
    errCode: '0',
    id: data.id,
  })
})

// 文章分类展示
app.post('/blog/article', async (req, res) => {
  if (req.body.keywords) {
    req.body.title = eval('/' + req.body.keywords + '/')
    delete req.body.keywords
  }
  const article = await articles.find({ ...req.body }).sort({ ids: -1 })
  return res.send({
    errCode: '0',
    article,
  })
})

// 删除文章
app.post('/blog/delete', async (req, res) => {
  const data = await articles.findOne({ ids: req.body.id })
  console.log(data)
  await data.remove()
  res.send({
    errCode: '0',
  })
})

// 文章详情
app.post('/blog/detail', async (req, res) => {
  const article = await articles.findOne({ ids: req.body.id })
  res.send({
    errCode: '0',
    article,
  })
})

// 文章点击
app.post('/blog/hits', async (req, res) => {
  const data = req.body
  const article = await articles.findOne({ ids: data.id })
  let hits = (article.hits || 0) + 1
  await articles.updateOne({ ids: data.id }, { $set: { hits: hits } })
  res.send({
    errCode: '0',
  })
})

// 上传图片
app.post('/blog/upload', uploads.single('file'), (req, res) => {
  console.log(req.file)
  let times = new Date().getTime()
  let oldPath = req.file.destination + '/' + req.file.filename
  let newPath = req.file.destination + '/' + times + req.file.originalname
  let dataPath = `uploads/${times + req.file.originalname}`
  fs.rename(oldPath, newPath, function (err) {
    return
  })
  res.send({
    errCode: '0',
    imgUrl: dataPath,
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
