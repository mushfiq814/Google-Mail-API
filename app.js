// DOM
let signInBtn = document.getElementById("signInBtn");
let resultArea = document.getElementById("result");

// Sign-in
signInBtn.addEventListener("click", e => {
  e.preventDefault();
  redirect();
});

// Import CONFIG VARS
import ENV_VARS from "./.config/config.js";
const clientID = ENV_VARS.CLIENT_ID;
const clientSecret = ENV_VARS.CLIENT_SECRET;
const redirectUri = ENV_VARS.REDIRECT_URI;

// global var for accessToken
let accessToken = "";

// check if redirected, then get access token
const url = new URLSearchParams(window.location.search);
// if (refreshToken.length>0) getAcessToken(refreshToken);
if (url.has("code")) getAcessToken(url.get("code"));

function redirect() {
  const oauth2EndPoint = "https://accounts.google.com/o/oauth2/v2/auth";
  const scopes = [
    "https://mail.google.com/", // Full access to the account, including permanent deletion of threads and messages. This scope should only be requested if your application needs to immediately and permanently delete threads and messages, bypassing Trash; all other actions can be performed with less permissive scopes.
    "https://www.googleapis.com/auth/gmail.readonly", // Read all resources and their metadata—no write operations.
    "https://www.googleapis.com/auth/gmail.compose", // Create, read, update, and delete drafts. Send messages and drafts.
    "https://www.googleapis.com/auth/gmail.send", // Send messages only. No read or modify privileges on mailbox.
    "https://www.googleapis.com/auth/gmail.insert", // Insert and import messages only.
    "https://www.googleapis.com/auth/gmail.labels", // Create, read, update, and delete labels only.
    "https://www.googleapis.com/auth/gmail.modify", // All read/write operations except immediate, permanent deletion of threads and messages, bypassing Trash.
    "https://www.googleapis.com/auth/gmail.metadata", // Read resources metadata including labels, history records, and email message headers, but not the message body or attachments.
    "https://www.googleapis.com/auth/gmail.settings.basic", // Manage basic mail settings.
    "https://www.googleapis.com/auth/gmail.settings.sharing" // Manage sensitive mail settings, including forwarding rules and aliases.
  ];

  // If using auth > code > token > API
  let params = `?client_id=${clientID}&redirect_uri=${redirectUri}&response_type=code&access_type=offline&scope=${
    scopes[0]
  }&state=randomNumber`;

  window.location.replace(oauth2EndPoint + params);
}

function getAcessToken(code) {
  const authUrl = "https://www.googleapis.com/oauth2/v4/token";

  const authUrlParams = {
    code: code,
    client_id: clientID,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  };

  const completeUri = `${authUrl}?
  code=${authUrlParams.code}&
  client_id=${authUrlParams.client_id}&
  client_secret=${authUrlParams.client_secret}&
  redirect_uri=${authUrlParams.redirect_uri}&
  grant_type=${authUrlParams.grant_type}`;

  const repairedUri = completeUri.replace(/[\s\n]/g, "");
  return fetch(repairedUri, {
    method: "POST"
  })
    .then(res => res.json())
    .then(data => {
      accessToken = data.access_token;
      getMailList(accessToken, "mushfiq.minds@gmail.com");
    })
    .catch(err => console.log(err));
}

/**
 * getMailList retrieves a list of all emails (Paginated)
 * @param {*} token access token
 * @param {*} userId email id of the user to retrieve information
 */
function getMailList(token, userId) {
  const gMailApiEndPoint = "https://www.googleapis.com/gmail/v1/users/";
  let params = userId + "/messages";

  return fetch(gMailApiEndPoint + params, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.json())
    .then(data => {
      const messages = data.messages;
      console.log("Number of Messages: " + messages.length);
      for (var i = 0; i < 10; i++) {
        getMessage(token, "mushfiq.minds@gmail.com", messages[i].id);
      }
    })
    .catch(err => console.log(err));
}

/**
 * retrieves the exact email message from the message ID
 * @param {*} token access token
 * @param {*} userId email id of the user to retrieve information
 * @param {*} messageId message id for the email thread
 * notes on MIME types
 *
 * text/plain * Most messages composed by people have a plaintext version, for email readers that do not support HTML.
 * text/html * Most rich emails are actually HTML. This one tends to be the most canonical.
 * multipart/related * This type is for message bodies with an embedded image. The ‘parts’ of this component should be the message contents (sometimes, this is just text/plain if this is a plain email or it can be multipart/alternative)
 * multipart/mixed * When messages have an attachment (that could be an image). The parts of this component are usually either multipart/related (if there is an embedded image) or text/html. If there is an attachment, this will likely be at the top level.
 * multipart/alternative * When there are plaintext and html versions of this message. Most emails will have this at the top level, unless there is an attachment.
 */
function getMessage(token, userId, messageId) {
  const getMsgUrl =
    "https://www.googleapis.com/gmail/v1/users/" +
    userId +
    "/messages/" +
    messageId;
  let params = "?/format=raw"; // "full", "metadata", "minimal" or "raw"

  return fetch(getMsgUrl + params, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.json())
    .then(data => {
      var body = "";
      var mimeType = data.payload.mimeType; // see notes on MIME types above

      if (mimeType == "text/html") body = data.payload.body.data;
      else if (mimeType == "multipart/alternative")
        body = data.payload.parts[1].body.data;
      else if (mimeType == "multipart/mixed") {
        for (var i = 0; i < data.payload.parts.length; i++) {
          var innerMimeType = data.payload.parts[i].mimeType;
          if (innerMimeType == "text/html" || innerMimeType == "text/plain")
            body = data.payload.parts[i].body.data;
          else if (innerMimeType == "multipart/alternative")
            body = data.payload.parts[i].parts[1].body.data;
          // else if (innerMimeType=="application/pdf") {
          //   var attachmentId=data.payload.parts[i].body.attachmentId;
          //   console.log('attachmentId: ' + attachmentId);
          //   console.log('messageId: ' + messageId);
          // }
        }
      }

      var formattedBody = body.replace(/-/g, "+").replace(/_/g, "/"); // format base64encoded string to use window.atob()
      var decodedBody = atob(formattedBody); // use window.atob() to decode
      var cleanHTMLoutput = '';
      for (var j=0; j<decodedBody.length; j++) {
        if (decodedBody.charCodeAt(j) <= 127) {
          cleanHTMLoutput += decodedBody.charAt(j);
        }
      }
    
      var messageFrom = '';
      var messageHeaders = data.payload.headers;
      for (var k=0; k<messageHeaders.length; k++) {
        if (messageHeaders[k].name == "From") messageFrom = messageHeaders[k].value;
      }

      // console.log(decodedBody);
      createMessageCard("Subject", "from: "+messageFrom, cleanHTMLoutput);
    
    })
    .catch(err => console.log(err));
}

/**
 * creates card element to display email message
 * @param {string} subjectText subject line for email message
 * @param {string} fromText from: sender's email
 * @param {string} bodyText html to put into the card body 
 */
function createMessageCard(subjectText, fromText, bodyText) {
  // create Message card
  var emailMsgCard = document.createElement("div");
  emailMsgCard.classList.add("email-msg");

  // create messageHeader div
  var msgHeader = document.createElement("div");
  msgHeader.classList.add("msg-header");

  // create messageSubject div
  var msgSubject = document.createElement("div");
  msgSubject.classList.add("msg-subject");

  // create messageSubject Text
  var msgSubjectText = document.createElement("h3");
  msgSubjectText.classList.add("msg-subject-text");

  // create messageFrom div
  var msgFrom = document.createElement("div");
  msgFrom.classList.add("msg-from");

  // create messageFrom Text
  var msgFromText = document.createElement("h4");
  msgFromText.classList.add("msg-from-text");

  // create messageBody div
  var msgBody = document.createElement("div");
  msgBody.classList.add("msg-body");

  // create messageBody Text
  var msgBodyText = document.createElement("p");
  msgBodyText.classList.add("msg-body-text");

  // add the text nodes
  msgSubjectText.innerText = subjectText;
  msgFromText.innerText = fromText;
  msgBodyText.innerHTML = bodyText;

  // arrange parent-children tree
  // add the text elements to their parent elements
  msgSubject.appendChild(msgSubjectText);
  msgFrom.appendChild(msgFromText);
  msgBody.appendChild(msgBodyText);

  // add the subject and from to the header element
  msgHeader.appendChild(msgSubject);
  msgHeader.appendChild(msgFrom);

  // add the header and body element to the card element
  emailMsgCard.appendChild(msgHeader);
  emailMsgCard.appendChild(msgBody);

  // add the card element to the results area
  resultArea.appendChild(emailMsgCard);
}
