const express = require('express');
const { Issuer, Strategy } = require('openid-client');
const dotenv = require('dotenv');
const app = express();
dotenv.config();

const { env } = process;
let oidcClient = null;

const config = {
  oidc: {
    metadataURL: env.OIDC_METADATA_URL,
    clientID: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    scope: env.OIDC_CLIENT_SCOPE || 'openid profile email',
    authCallbackPath: '/auth/callback',
    authCallbackHost: `http://${env.HTTP_HOSTNAME}:${env.HTTP_PORT}`,
  },
  httpPort: env.HTTP_PORT || 8675

};

// Setup OIDC client
Issuer.discover(config.oidc.metadataURL)
  .then(issuer => {
    console.log('Discovered issuer:', issuer.metadata.issuer);
    
    oidcClient = new issuer.Client({
      client_id: config.oidc.clientID,
      redirect_uris: [`${config.oidc.authCallbackHost}${config.oidc.authCallbackPath}`],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    });
  });

// application landing / home page
app.get('/', (req, res) => {
  const authorizationUrl = oidcClient.authorizationUrl({
    scope: 'openid profile email', // Add other scopes if needed.
    redirect_uri: `${config.oidc.authCallbackHost}${config.oidc.authCallbackPath}`
  });
  res.redirect(authorizationUrl);
});

// OIDC callback endpoint
app.get(config.oidc.authCallbackPath, async (req, res) => {
  const params = oidcClient.callbackParams(req);
  // retrieve the token set by passing the code to the code exchange function
  const tokenSet = await oidcClient.callback(`${config.oidc.authCallbackHost}${config.oidc.authCallbackPath}`, params);

  // decode token
  const userInfo = await oidcClient.userinfo(tokenSet.access_token);
  res.json(userInfo); 
});

app.listen(config.httpPort, () => {
  console.log(`Server is running at http://localhost:${config.httpPort}`);
});
