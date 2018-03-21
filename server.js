// server.js
// where your node app starts
// Diagram: https://www.draw.io/#G1nB9Ej2tU7lEbJvR39t49EQjLhnO6b0tg

// init project
const express = require('express');
const ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const Map = require('es6-map');

// Pretty JSON output for logs
const prettyjson = require('prettyjson');
// Join an array of strings into a sentence
// https://github.com/epeli/underscore.string#tosentencearray-delimiter-lastdelimiter--string
const toSentence = require('underscore.string/toSentence');

app.use(bodyParser.json({type: 'application/json'}));

// This boilerplate uses Express, but feel free to use whatever libs or frameworks
// you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// Uncomment the below function to check the authenticity of the API.AI requests.
// See https://docs.api.ai/docs/webhook#section-authentication
/*app.post('/', function(req, res, next) {
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});
  
  // Throw an error if the request is not valid.
  if(assistant.isRequestFromApiAi(process.env.API_AI_SECRET_HEADER_KEY, 
                                  process.env.API_AI_SECRET_HEADER_VALUE)) {
    next();
  } else {
    console.log('Request failed validation - req.headers:', JSON.stringify(req.headers, null, 2));
    
    res.status(400).send('Invalid request');
  }
});*/

// Handle webhook requests
app.post('/', function(req, res, next) {
  // Log the request headers and body, to aide in debugging. You'll be able to view the
  // webhook requests coming from API.AI by clicking the Logs button the sidebar.
  logObject('Request headers: ', req.headers);
  logObject('Request body: ', req.body);
    
  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({request: req, response: res});

  // Declare constants for your action and parameter names
  // values in quotes come from DialogFlow Intent configuration "Actions and Parameters" field
  const WELCOME_ACTION = 'input.welcome'
  
  // Create functions to handle intents here
  function welcome(assistant) {
    // currently unused - returns single answer without dialog
    // eventually, this will welcome users and have a dialog
    console.log('Handling action: ' + WELCOME_ACTION);
    assistant.tell('Hello, welcome to is school open');
  }
    
  function lookupPan(assistant,getpan) {
          var request = require('request');
          var url = 'https://paol.snb.ca/pas-shim/api/paol/search';
        // https://paol.snb.ca/pas-shim/api/paol/dossier/00xxxxxx
          var dossierurl='https://paol.snb.ca/pas-shim/api/paol/dossier';
          var address=req.body.result.parameters.address;
          console.log(typeof(req.body));
          var getData = "?s="+address;
          url = url+getData;
          var pan;
          var options = {
              method: 'get',
              uri: url,
              headers: {
                  "Cookie": "paolLicenseAccepted=accepted",
              }
          };
          request(options, function (error, response) {
              if (!error && response.statusCode == 200) {
                  //Retrieve PAN from JSON
                  // /SearchResultsByGroup/0/results/0/pan
                  var json=JSON.parse(response.body);
                  pan=json.searchResultsByGroup[0].results[0].pan;
                  var location=json.searchResultsByGroup[0].results[0].location;
                  logObject('Results from PAOL WS: ', json);
                  console.log('Request for PAN Succeeded: ', address,"=",pan);
                  }
                  else {
                    let json = JSON.parse(response.body);
                    console.log('Request Failed: ' + response.header + json);
                    assistant.tell("Request for PAN failed with HTTP response: "+response.statusCode);
                  }
    
          dossierurl=dossierurl+"/"+pan;
          console.log("Getting URL: ",dossierurl);
          var options = {
              method: 'get',
              uri: dossierurl,
              headers: {
                  "Cookie": "paolLicenseAccepted=accepted",
              }
          }
          request(options, function (error, response) {
              if (!error && response.statusCode == 200) {
                  var dosierjson=JSON.parse(response.body);
                  logObject('Results from PAOL Dossier WS: ', dosierjson);
                  var current_assessment=dosierjson.summary.currAsst;
                  var current_taxes=dosierjson.summary.curLevy;
                  console.log('Request for Dossier Succeeded: Assessment= $', current_assessment," and taxes = $",current_taxes);
                  assistant.tell("The Pan for "+location+" is "+pan+
                                 " and the current assessment is $"+current_assessment+
                                 " with taxes of $"+current_taxes);
                  }
                  else {
                    let json = JSON.parse(response.body);
                    console.log('Request Failed: ' + response.header + json);
                    assistant.tell("Request for Dossier failed with HTTP response: "+response.statusCode);
                  }
          });
      });
  }
    
  
  // Add handler functions to the action router.
  let actionRouter = new Map();
  
  // Map all the ACTIONs to the functions to handle them
  //actionRouter.set(WELCOME_ACTION, welcome);
  actionRouter.set("lookup.pan", lookupPan);

  // Route requests to the proper handler functions via the action router.
  assistant.handleRequest(actionRouter);
});

// Handle errors.
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Pretty print objects for logging.
function logObject(message, object, options) {
  console.log(message);
  console.log(prettyjson.render(object, options));
}

// Listen for requests.
let server = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + server.address().port);
});

