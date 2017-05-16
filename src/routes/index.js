//	index.js – handles home	page
let express = require('express');
let router = express.Router();

//	set home page route
router.get('/', function (req, res, next) {
    //res.send('INDEX PAGE');
    res.render('Client.html');
});
module.exports = router;