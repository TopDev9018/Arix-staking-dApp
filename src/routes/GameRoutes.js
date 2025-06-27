
const express = require('express');
const gameController = require('../controllers/gameController'); 


const router = express.Router();


router.post('/coinflip/bet', gameController.handleCoinflipBet);





module.exports = router;