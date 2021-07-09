// script.js

// ======================================
// ============ GLOBAL VARS =============
// ======================================

// player vars
const players = [];	
var minPlayers = 2;	
var maxPlayers = 4;	
var activePlayers = 2;
const playerKeys = [
	[65, 65, 65],		// player 0: A, A, A
	[76, 71, 70], 		// player 1: L, G, F
	[null, 76, 72], 	// player 2: null, L, H
	[null, null, 76]	// player 3: null, null, L
];

// game vars
var startScore = 0;
var winScore = 10;
var winScoreMin = 1;
var winScoreMax = 999;
var startKey = 32;	// spacebar
var holdTime = 500;
var fadeTime = 800;
var countdownOn = false;
const countdownTimes = [1200, 1800, 2400, 3000];
var gameOn = false;

// settings/instructions vars
var windowHoverTimer = null;
var windowHoverTimerTime = 400;
var keyConfigure = false;
var settingsHover = false;
var colorAnimations = true;

// style vars
var font = 'Garamond';
var letterSpacing = '0.5px';
var textColor = '#333333';
var backgroundColor = '#FFFFFF';
var lossColor = '#EC0B43';
var borderRadius = '10px';
var activeOpacity = 1;
var inactiveOpacity = 0.5;
var hiddenOpacity = 0;
var pressedScale = 0.95;
var releasedScale = 1;
var pressedShadow = '0 0 3px rgba(0, 0, 0, 0.2)';
var releasedShadow = '0 0 4px rgba(0, 0, 0, 0.2)';

// ======================================
// =========== INIT FUNCTIONS ===========
// ======================================

$(document).ready(function() {
	setPlayersArray();
	setPlayersDisplay();
	setPageContent();
	setEventResponses();
});

function setPlayersArray() {
	for (let i = 0; i < maxPlayers; i++) {
		players.push({
			number: i,
			active: null,			// true when player is active (onscreen)
			key: null,				// gives points when pressed
			score: null,			// current score
			down: null,				// true when player's key is held down
			holding: null,			// true when player's key is held down past the hold time limit
			holdingTimer: null,		// setTimeout function for holding
			keyChanging: null,		// true when new key is being selected

			// selectors for jquery
			playerDisplayId: '#player-' + i + '-player-display',
			scoreDisplayId: '#player-' + i + '-score-display',
			mScoreDisplayId: '#m-player-' + i + '-score-display',
			keyDisplayId: '#player-' + i + '-key-display',
			mKeyDisplayId: '#m-player-' + i + '-key-display',
			keyConfigureButtonId: '#player-' + i + '-key-configure-button'
		});
	}
}

function setPlayersDisplay() {
	$('.player-display, .key-configure-button').css('display', 'none');

	players.forEach((player, i) => {
		player.key = playerKeys[i][activePlayers-2];
		player.score = startScore;
		player.down = false;
		player.holding = false;
		player.keyChanging = false;

		// if we haven't reached the number of active players, set this player as active and display it
		if (i < activePlayers) {
			player.active = true;
			$(player.playerDisplayId).css('display', 'inline-block');
			$(player.scoreDisplayId).add(player.mScoreDisplayId).text(startScore);
			$(player.keyDisplayId).add(player.mKeyDisplayId).css({
				'border-radius': borderRadius,
				'box-shadow': releasedShadow
			});
			$(player.keyDisplayId).text(String.fromCharCode(player.key));
			$(player.keyConfigureButtonId).css('display', 'inline-block').text(String.fromCharCode(player.key)).click(function() { changeKey(player); });
		}
		else player.active = false;
	});
}

function setPageContent() {
	// main screen content
	$('.title-number').text(winScore);
	$('.countdown-number').hide();
	$('body, #new-win-score').css('background-color', backgroundColor);
	$('body').css({
		'color': textColor,
		'font-family': font,
		'letter-spacing': letterSpacing
	});

	// window content
	$('#instructions-window, #settings-window').hide();
	$('#new-win-score').css('font-family', font).val(winScore);
	if (activePlayers == minPlayers) { $('#number-players-decrease-button').css('opacity', inactiveOpacity).removeClass('button'); }
	if (activePlayers == maxPlayers) { $('#number-players-increase-button').css('opacity', inactiveOpacity).removeClass('button'); }
	
	if (colorAnimations) { $('#color-animations-on-button').css('opacity', inactiveOpacity).removeClass('button'); }
	else $('#color-animations-off-button').css('opacity', inactiveOpacity).removeClass('button');
}

function setEventResponses() {
	// key/touchscreen presses/releases
	$(document).keydown(function(event) { pressHandler(event.which); })
			   .keyup(function(event) { releaseHandler(event.which); });
	$('.m-key-display').on('touchstart', function() { pressHandler('#' + this.id); })
					   .on('touchend', function() { releaseHandler('#' + this.id); });

	// main screen items
	$('.play-button').click(function() { initGame(); });
	$('#instructions-button, #instructions-window').mouseover(function() {
		openWindow('#instructions-button', '#instructions-window');
	}).mouseout(function() {
		closeWindow('#instructions-button', '#instructions-window');
	});
	$('#settings-button, #settings-window').mouseover(function() {
		settingsHover = true;
		openWindow('#settings-button', '#settings-window');
	}).mouseout(function() {
		settingsHover = false;
		closeWindow('#settings-button', '#settings-window');
	});

	// settings window events
	$('#new-win-score').on('input', function() { newWinScore($(this).val()) });
	$('#number-players-decrease-button').click(function() { changeNoPlayers('decrease'); });
	$('#number-players-increase-button').click(function() { changeNoPlayers('increase'); });
	$('#color-animations-on-button').click(function() { changeColorAnimations('on'); });
	$('#color-animations-off-button').click(function() { changeColorAnimations('off'); });
}

// ======================================
// =========== GAME FUNCTIONS ===========
// ======================================

// set/reset game variables, change display for game start
function initGame() {
	if (gameOn || countdownOn || keyConfigure) { return; }

	// reset all score displays
	players.forEach((player) => {
		if (player.score != startScore) {
			player.score = startScore;			
			$(player.scoreDisplayId).add(player.mScoreDisplayId).fadeTo(fadeTime/2, hiddenOpacity, function() {
				$(this).text(startScore).fadeTo(fadeTime/2, activeOpacity);
			});
		}
	});

	// fade everything but scores and key displays
	$('h1').fadeTo(fadeTime, hiddenOpacity);
	$('#menu').fadeOut(fadeTime, function() { $('#space-prompt').css('visibility', 'hidden'); });
	$('#m-play-button, .window').fadeOut(fadeTime);

	$('.play-button, #number-players-increase-button, #number-players-decrease-button, .key-configure-button').removeClass('button');	

	// countdown, then game starts
	countdownOn = true;
	$('.countdown-number').show().text('');
	setTimeout(function() { $('.countdown-number').text('3'); }, countdownTimes[0]);
	setTimeout(function() { $('.countdown-number').text('2'); }, countdownTimes[1]);
	setTimeout(function() { $('.countdown-number').text('1'); }, countdownTimes[2]);
	setTimeout(function() { 
		countdownOn = false;
		$('.countdown-number').hide().text('');
		startGame(); 
	}, countdownTimes[3]);
}

function startGame() {
	gameOn = true;	
	players.forEach((player) => {
		$(player.keyDisplayId).add(player.mKeyDisplayId).css({ 'transform': 'scale(' + releasedScale + ')', 'box-shadow': releasedShadow });
	});
}

// when any key or the touchscreen is pressed (except for keyconfigure or changing winscore)
function pressHandler(eventKey) {
	if (keyConfigure || $('#new-win-score').is(':focus')) { return; }

	// spacebar: either start or abort game
	if (eventKey == startKey) {
		if (gameOn && checkAbort()) { endGame(); }
		else initGame();
		return;
	}

	// other key: check if key matches a player key/mobile button and respond 
	players.forEach((player) => {
		if ((eventKey == player.key || eventKey == player.mKeyDisplayId) && player.active && !player.down) {
			player.down = true;
			$(player.keyDisplayId).add(player.mKeyDisplayId).css({ 'transform': 'scale(' + pressedScale + ')', 'box-shadow': pressedShadow });

			// if the game is on, start holding timer, change scores, then check if win
			if (gameOn) {
				modScore(player);
				if (player.score >= winScore) { 
					endGame();
					return;
				}
				setHoldingTimer(player, $(player.keyDisplayId));
			}
			else { player.holding = true; } // prevent holding before game begins
		}
	});
}

// when any key or the touchscreen is released
function releaseHandler(eventKey) {
	if (keyConfigure || $('#new-win-score').is(':focus')) { return; }

	// check if key matches a player key/mobile button and respond accordingly
	players.forEach((player) => {
    	if ((eventKey == player.key || eventKey == player.mKeyDisplayId) && player.active && player.down) {
			player.down = false;
			player.holding = false;
			clearTimeout(player.holdingTimer);
			player.holdingTimer = null;
			$(player.keyDisplayId).add(player.mKeyDisplayId).css({ 'transform': 'scale(' + releasedScale + ')', 'box-shadow': releasedShadow });
    	}
	});
}

function setHoldingTimer(player, keyDisplayId) {
	player.holdingTimer = setTimeout(function() {
		player.holding = true;
   		$(player.keyDisplayId).add(player.mKeyDisplayId).css({ 'transform': 'scale(' + releasedScale + ')', 'box-shadow': releasedShadow });
	}, holdTime);
}

// give 1 point to player who pressed, or resets all scores
function modScore(player) {
	let getPoint = true;
	players.forEach((oppt, i) => {
		// if any other players are down, no one gets a point, reset other players' scores
		if (oppt.number != player.number && oppt.active && oppt.down && !oppt.holding) {
			getPoint = false;
			oppt.score = startScore;
			$(oppt.scoreDisplayId).add(oppt.mScoreDisplayId).text(oppt.score);
			if (colorAnimations) { $(oppt.scoreDisplayId).add(oppt.mScoreDisplayId).stop().css('color', lossColor).animate({ color: textColor, }, fadeTime/2); }
		}
	});
	// if no other player is holding, add a point to total
	if (getPoint) {
		player.score++;
    	$(player.scoreDisplayId).add(player.mScoreDisplayId).text(player.score);
    }
    // otherwise, player score resets
    else {
    	player.score = startScore;
    	$(player.scoreDisplayId).add(player.mScoreDisplayId).text(player.score);
		if (colorAnimations) { $(player.scoreDisplayId).add(player.mScoreDisplayId).stop().css('color', lossColor).animate({ color: textColor, }, fadeTime/2); }
    }
}

function endGame() {
	gameOn = false;
	$('h1').fadeTo(fadeTime, activeOpacity);
	$('#menu, #m-play-button').fadeIn(fadeTime);
	$('.play-button, #number-players-increase-button, #number-players-decrease-button, .key-configure-button').addClass('button');	
	setPageContent();
}

// ends game if all scores are startscore
function checkAbort() {
	players.forEach((player) => {
		if (player.active == true && player.score != startScore) { return false; }
	});
	return true;
}

// =======================================
// === INSTRUCTIONS/SETTINGS FUNCTIONS ===
// =======================================

function openWindow(openingWindowButton, openingWindow) {
	if (gameOn || countdownOn || keyConfigure) { return; }

	if (openingWindow == '#settings-window') { $('#new-win-score').val(winScore); }
	clearTimeout(windowHoverTimer);
	$('.window').hide();
	$(openingWindow).show();
}

function closeWindow(closingWindowButton, closingWindow) {
	if (gameOn || countdownOn || keyConfigure) { return; }

	// windowHoverTimer = setTimeout(function() { $(closingWindow).fadeOut(fadeTime/2); }, windowHoverTimerTime);
	windowHoverTimer = setTimeout(function() { $(closingWindow).hide(); }, windowHoverTimerTime);
}

function newWinScore(entry) {
	if (gameOn || countdownOn || keyConfigure) { return; }

	entry = Number(entry);	
	if (Number.isInteger(entry) && entry >= winScoreMin && entry <= winScoreMax) {
		winScore = entry;
		$('.title-number').text(winScore);
	}
}

function changeNoPlayers(action) {
	if (gameOn || countdownOn || keyConfigure) { return; }

	if (action == 'decrease' && activePlayers > minPlayers) { activePlayers--; }
	else if (action == 'increase' && activePlayers < maxPlayers) { activePlayers++; }
	else return;

	setPlayersDisplay(activePlayers);
	if (activePlayers == minPlayers) { $('#number-players-decrease-button').removeClass('button').fadeTo(fadeTime/2, inactiveOpacity); }
	else if (activePlayers == maxPlayers) { $('#number-players-increase-button').removeClass('button').fadeTo(fadeTime/2, inactiveOpacity); }
	else { $('#number-players-decrease-button, #number-players-increase-button').addClass('button').fadeTo(fadeTime/2, activeOpacity); }
}

function changeColorAnimations(action) {
	if (gameOn || countdownOn || keyConfigure) { return; }

	if (action == 'on' && !colorAnimations) {
		colorAnimations = true;
		$('#color-animations-on-button').css('opacity', inactiveOpacity).removeClass('button');
		$('#color-animations-off-button').addClass('button').fadeTo(fadeTime/2, activeOpacity);
	}

	if (action == 'off' && colorAnimations) {
		colorAnimations = false;
		$('#color-animations-off-button').css('opacity', inactiveOpacity).removeClass('button');
		$('#color-animations-on-button').addClass('button').fadeTo(fadeTime/2, activeOpacity);
	}
}

function changeKey(keyChangePlayer) {
	if (gameOn || countdownOn || keyConfigure) { return; }

 	// fade everything to inactive opacity
 	keyConfigure = true;
 	$('#title, #menu, #number-players-configure, #color-animations-configure, #win-score-configure').fadeTo(fadeTime/2, inactiveOpacity);
 	$('#new-win-score').attr('disabled', 'disabled');
 	$('#key-configure-prompt').text('press new key');
 	$('.button').removeClass('button').addClass('deactivated-button');
 	$(keyChangePlayer.keyConfigureButtonId).text('_');
 	keyChangePlayer.keyChanging = true;
  	players.forEach((player) => {
    	if (player.active && !player.keyChanging) { $(player.playerDisplayId).fadeTo(fadeTime/2, inactiveOpacity); }
	});

 	// when a key is pressed during keyConfigure
 	$(document).on('keypress', function(event) {
 		let keycode = null;
 		let keyAvailable = true;
 		if (event.which >= 97 && event.which <= 122) { keyCode = event.which - 32; }
 		else { keyCode = event.which; }

 		// new key must not be active opponent's key
		players.forEach((oppt, i) => {
			if (oppt.number != keyChangePlayer.number && oppt.active && keyCode == oppt.key) { keyAvailable = false; }
		});

 		// new key must be a letter or number
 	    if (((keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57)) && keyAvailable ) {
	    	keyChangePlayer.key = keyCode;

	   		$(keyChangePlayer.keyDisplayId).text(String.fromCharCode(keyCode));

	   		// fade everything to active opacity
	    	keyConfigure = false;
 			$('#title, #menu, #number-players-configure, #color-animations-configure, #win-score-configure').fadeTo(fadeTime/2, activeOpacity);
 			$('#new-win-score').removeAttr('disabled');
 			$('#key-configure-prompt').text('');
 			$('.deactivated-button').removeClass('deactivated-button').addClass('button');
 			$(keyChangePlayer.keyConfigureButtonId).text(String.fromCharCode(keyCode));
  			players.forEach((player) => {
    			if (player.active && !player.keyChanging) { $(player.playerDisplayId).fadeTo(fadeTime/2, activeOpacity); }
			});
			keyChangePlayer.keyChanging = false;

 			if (!settingsHover) { closeWindow('#settings-button', '#settings-window'); } // in case cursor has left settings window

 			$(document).off('keypress');
	    }
 	});
}