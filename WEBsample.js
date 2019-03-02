var global_username = '';
var intId=-1;

/*** After successful authentication, show user interface ***/

var showUI = function() {
	$('div#call').show();
	$('form#userForm').css('display', 'none');
	$('div#userInfo').css('display', 'inline');
	$('h3#login').css('display', 'none');
	$('span#username').text(global_username);
}


/*** If no valid session could be started, show the login interface ***/

var showLoginUI = function() {
	$('form#userForm').css('display', 'inline');
}

/*** Set up sinchClient ***/

sinchClient = new SinchClient({
	applicationKey: '98e09fe5-577f-40b7-b39f-8a3b2f261fb0',
	capabilities: {calling: true},
	startActiveConnection: true, /* NOTE: This is required if application is to receive calls / instant messages. */ 
	//Note: For additional loging, please uncomment the three rows below
	onLogMessage: function(message) {
		console.log(message);
	},
});


/*** Name of session, can be anything. ***/

var sessionName = 'sinchSessionWEB-' + sinchClient.applicationKey;


/*** Check for valid session. NOTE: Deactivated by default to allow multiple browser-tabs with different users. ***/

var sessionObj = JSON.parse(localStorage[sessionName] || '{}');
if(false && sessionObj.userId) { 
	sinchClient.start(sessionObj)
		.then(function() {
			global_username = sessionObj.userId;
			//On success, show the UI
			showUI();
			//Store session & manage in some way (optional)
			localStorage[sessionName] = JSON.stringify(sinchClient.getSession());
		})
		.fail(function() {
			//No valid session, take suitable action, such as prompting for username/password, then start sinchClient again with login object
			showLoginUI();
		});
}
else {
	showLoginUI();
}


/*** Create user and start sinch for that user and save session in localStorage ***/

$('button#createUser').on('click', function(event) {
	event.preventDefault();
	$('button#loginUser').attr('disabled', true);
	$('button#createUser').attr('disabled', true);
	clearError();

	var signUpObj = {};
	signUpObj.username = $('input#username').val();
	signUpObj.password = $('input#password').val();

	//Use Sinch SDK to create a new user
	sinchClient.newUser(signUpObj, function(ticket) {
		//On success, start the client
		sinchClient.start(ticket, function() {
			global_username = signUpObj.username;
			//On success, show the UI
			showUI();

			//Store session & manage in some way (optional)
			localStorage[sessionName] = JSON.stringify(sinchClient.getSession());
		}).fail(handleError);
	}).fail(handleError);
});


/*** Login user and save session in localStorage ***/

$('button#loginUser').on('click', function(event) {
	event.preventDefault();
	$('button#loginUser').attr('disabled', true);
	$('button#createUser').attr('disabled', true);
	clearError();

	var signInObj = {};
	signInObj.username = $('input#username').val();
	signInObj.password = $('input#password').val();

	//Use Sinch SDK to authenticate a user
	sinchClient.start(signInObj, function() {
		global_username = signInObj.username;
		//On success, show the UI
		showUI();

		//Store session & manage in some way (optional)
		localStorage[sessionName] = JSON.stringify(sinchClient.getSession());
	}).fail(handleError);
});
/*** Create audio elements for progresstone and incoming sound */
const audioProgress = document.createElement('audio');
const audioRingTone = document.createElement('audio');
const audioIncoming = document.createElement('audio');

/*** Define listener for managing calls ***/

var callListeners = {
	onCallProgressing: function(call) {
		audioProgress.src = 'style/ringback.wav';
		audioProgress.loop = true;
		audioProgress.play();

		//Report call stats
		$('div#callLog').append('<div id="stats">Ringing...</div>');
	},
		onCallEstablished: function(call) {
			audioIncoming.srcObject = call.incomingStream;
			console.log("CALL OBJECT : ", call)
			console.log("AUDIO INCOMING OBJECT : ", audioIncoming)

			audioIncoming.play();
			audioProgress.pause();
			audioRingTone.pause();
			console.log("HI");
			var device=navigator.mediaDevices.getUserMedia({ audio: true }).then();
			console.log("Outer recorder ");
		    var stream = call.outgoingStream.getAudioTracks()[0];
			
	  		device.then(stream => {
			    const mediaRecorder = new MediaRecorder(stream);
			    mediaRecorder.start();
			    console.log(mediaRecorder.state);
				console.log("recorder started");

			    const audioChunks = [];
			    mediaRecorder.addEventListener("dataavailable", event => {
			      audioChunks.push(event.data);
			    });

			    mediaRecorder.addEventListener("stop", () => {
			      const audioBlob = new Blob(audioChunks);
			      const audioUrl = URL.createObjectURL(audioBlob);
			      console.log("audioUrl : ", audioUrl);
			      const audio = new Audio(audioUrl);
			      //audio.play();
			    });

			    setTimeout(() => {
			      mediaRecorder.stop();
			      console.log("recorder stopped");
			    }, 7000);
	  		});
			intId=setInterval(() => {
			    console.log("Outer recorder ");
			    var stream = call.outgoingStream.getAudioTracks()[0];
				
		  		device.then(stream => {
				    const mediaRecorder = new MediaRecorder(stream);
				    mediaRecorder.start();
				    console.log(mediaRecorder.state);
					console.log("recorder started");

				    const audioChunks = [];
				    mediaRecorder.addEventListener("dataavailable", event => {
				      audioChunks.push(event.data);
				    });

				    mediaRecorder.addEventListener("stop", () => {
				      const audioBlob = new Blob(audioChunks);
				      const audioUrl = URL.createObjectURL(audioBlob);
				      console.log("audioUrl : ", audioUrl);
				      const audio = new Audio(audioUrl);
				      audio.play();
				    });

				    setTimeout(() => {
				      mediaRecorder.stop();
				      console.log("recorder stopped");
				    }, 3000);
		  		});
	  		}, 3000);



		//Report call stats
		var callDetails = call.getDetails();
		$('div#callLog').append('<div id="stats">Answered at: '+(callDetails.establishedTime && new Date(callDetails.establishedTime))+'</div>');
	},
	onCallEnded: function(call) {
		audioProgress.pause();
		audioRingTone.pause();
		audioIncoming.srcObject = null;

		$('button').removeClass('incall');
		$('button').removeClass('callwaiting');
		if(intId!=-1)
		clearInterval(intId)
		//Report call stats
		var callDetails = call.getDetails();
		$('div#callLog').append('<div id="stats">Ended: '+new Date(callDetails.endedTime)+'</div>');
		$('div#callLog').append('<div id="stats">Duration (s): '+callDetails.duration+'</div>');
		$('div#callLog').append('<div id="stats">End cause: '+call.getEndCause()+'</div>');
		if(call.error) {
			$('div#callLog').append('<div id="stats">Failure message: '+call.error.message+'</div>');
		}
	}
}

/*** Set up callClient and define how to handle incoming calls ***/

var callClient = sinchClient.getCallClient();
callClient.initStream().then(function() { // Directly init streams, in order to force user to accept use of media sources at a time we choose
	$('div.frame').not('#chromeFileWarning').show();
}); 
var call;

callClient.addEventListener({
  onIncomingCall: function(incomingCall) {
	//Play some groovy tunes 
	audioRingTone.src = 'style/phone_ring.wav';
	audioRingTone.loop = true;
	audioRingTone.play();

	//Print statistics
	$('div#callLog').append('<div id="title">Incoming call from ' + incomingCall.fromId + '</div>');
	$('div#callLog').append('<div id="stats">Ringing...</div>');
	$('button').addClass('incall');

	//Manage the call object
    call = incomingCall;
    call.addEventListener(callListeners);
	$('button').addClass('callwaiting');
  }
});

$('button#answer').click(function(event) {
	event.preventDefault();

	if($(this).hasClass("callwaiting")) {
		clearError();

		try {
			call.answer();
			$('button').removeClass('callwaiting');
		}
		catch(error) {
			handleError(error);
		}
	}
});

/*** Make a new data call ***/

$('button#call').click(function(event) {
	event.preventDefault();

	if(!$(this).hasClass("incall") && !$(this).hasClass("callwaiting")) {
		clearError();

		$('button').addClass('incall');

		$('div#callLog').append('<div id="title">Calling ' + $('input#callUserName').val()+'</div>');

		console.log('Placing call to: ' + $('input#callUserName').val());
		call = callClient.callUser($('input#callUserName').val());

		call.addEventListener(callListeners);
	}
});

/*** Hang up a call ***/

$('button#hangup').click(function(event) {
	event.preventDefault();

	if($(this).hasClass("incall")) {
		clearError();
		
		console.info('Will request hangup..');

		call && call.hangup();
	}
});

/*** Log out user ***/

$('button#logOut').on('click', function(event) {
	event.preventDefault();
	clearError();

	//Stop the sinchClient
	sinchClient.terminate();
	//Note: sinchClient object is now considered stale. Instantiate new sinchClient to reauthenticate, or reload the page.

	//Remember to destroy / unset the session info you may have stored
	delete localStorage[sessionName];

	//Allow re-login
	$('button#loginUser').attr('disabled', false);
	$('button#createUser').attr('disabled', false);
	
	//Reload page.
	window.location.reload();
});


/*** Handle errors, report them and re-enable UI ***/

var handleError = function(error) {
	//Enable buttons
	$('button#createUser').prop('disabled', false);
	$('button#loginUser').prop('disabled', false);

	//Show error
	$('div.error').text(error.message);
	$('div.error').show();
}

/** Always clear errors **/
var clearError = function() {
	$('div.error').hide();
}

/** Chrome check for file - This will warn developers of using file: protocol when testing WebRTC **/
if(location.protocol == 'file:' && navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
	$('div#chromeFileWarning').show();
}

$('button').prop('disabled', false); //Solve Firefox issue, ensure buttons always clickable after load



