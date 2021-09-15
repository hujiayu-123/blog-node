var jwt = require('jsonwebtoken');
var signkey = 'qwert';

exports.setToken = function(user){
	return new Promise((resolve,reject)=>{
    console.log(user)
		const token = jwt.sign({
			name:user.username,
			_id:user.userid
		},signkey,{ expiresIn:'1day' });
		resolve(token);
	})
}

exports.verToken = function(token){
	return new Promise((resolve,reject)=>{
    console.log(token)
		var info = jwt.verify(token.split(' ')[1],signkey);
		resolve(info);
	})
}