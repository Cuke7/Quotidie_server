const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const Parser = require("rss-parser");
let parser = new Parser();
require('dotenv').config()

admin.initializeApp({
  credential: admin.credential.cert(
    {
      "type": process.env.type,
      "project_id": process.env.project_id,
      "private_key_id": process.env.private_key_id,
      "private_key": process.env.private_key,
      "client_email": process.env.client_email,
      "client_id": process.env.client_id,
      "auth_uri": process.env.auth_uri,
      "token_uri": process.env.token_uri,
      "auth_provider_x509_cert_url": process.env.auth_provider_x509_cert_url,
      "client_x509_cert_url": process.env.client_x509_cert_url
    }
  ),
  databaseURL: "https://quotidie-282b4-default-rtdb.europe-west1.firebasedatabase.app"
});

app.get("/", async (req, res) => {
  let feed = await parser.parseURL("https://rss.aelf.org/evangile");
  let title = "";
  if (feed.items.length == 1 || feed.items.length == 2) {
    title = feed.items[0].title;
  } else {
    title = feed.items[3].title;
  }

  const notification = {
    title: "Évangile du jour",
    body: title,
    icon: "./quotidieIcon.png",
    click_action: "https://quotidie.fr",
    requireInteraction: true,
    link: "https://quotidie.fr"
  };

  var db = admin.database();
  var ref = db.ref("/users");
  ref.once("value", function (snapshot) {
    let users = snapshot.val()
    for (let index = 0; index < Object.values(users).length; index++) {
      const user = Object.values(users)[index];
      if (user.isSubscribed) sendFCMMessage(user.key, notification).catch(err => console.error(err))
    }
  });
  res.send(JSON.stringify({ title }))

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

async function sendFCMMessage(fcmToken, msg) {
  try {
    const res = await getMessaging().send({
      webpush: {
        notification: {
          ...msg,
          icon: './quotidieIcon.png',
          requireInteraction: msg.requireInteraction ?? false,
          actions: [{
            title: 'Open',
            action: 'open',
          }],
          data: {
            link: msg.link,
          },
        },
      },
      token: fcmToken,
    });
  } catch (e) {
    console.error('sendFCMMessage error', e);
  }
}
