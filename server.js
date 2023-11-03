const express = require("express");
const { Issuer, Strategy } = require("openid-client");
const dotenv = require("dotenv");
const app = express();
const jwt = require("jsonwebtoken");
const jwksRSA = require("jwks-rsa");

dotenv.config();

const { env } = process;
let oidcClient = null;
let jswksClient = null;

const config = {
  oidc: {
    metadataURL: env.OIDC_METADATA_URL,
    clientID: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    scope: env.OIDC_CLIENT_SCOPE || "openid profile email",
    authCallbackPath: "/auth/callback",
    authCallbackHost: `http://${env.HTTP_HOSTNAME}:${env.HTTP_PORT}`,
  },
  httpPort: env.HTTP_PORT || 8675,
};

// Function to get the signing key
const getSigningKey = async (header) => {
  return new Promise((resolve, reject) => {
    jswksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key.publicKey || key.rsaPublicKey;
      resolve(signingKey);
    });
  });
};

// Setup OIDC client
Issuer.discover(config.oidc.metadataURL).then((issuer) => {
  console.log("Discovered issuer:", issuer.metadata.issuer);

  // create an instance of openid-client
  oidcClient = new issuer.Client({
    client_id: config.oidc.clientID,
    redirect_uris: [
      `${config.oidc.authCallbackHost}${config.oidc.authCallbackPath}`,
    ],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });

  // Create a JWKS client
  jswksClient = jwksRSA({
    jwksUri: issuer.metadata.jwks_uri,
  });
});

// application landing / home page
app.get("/", (req, res) => {
  const authorizationUrl = oidcClient.authorizationUrl({
    scope: "openid profile email", // Add other scopes if needed.
    redirect_uri: `${config.oidc.authCallbackHost}${config.oidc.authCallbackPath}`,
  });
  res.redirect(authorizationUrl);
});

// OIDC callback endpoint
app.get(config.oidc.authCallbackPath, async (req, res) => {
  const params = oidcClient.callbackParams(req);
  // retrieve the token set by passing the code to the code exchange function
  const tokenSet = await oidcClient.callback(
    `${config.oidc.authCallbackHost}${config.oidc.authCallbackPath}`,
    params
  );

  try {
    // Decode the JWT header to get the kid
    const header = JSON.parse(
      Buffer.from(tokenSet.id_token.split(".")[0], "base64").toString()
    );

    // Get the signing key
    const signingKey = await getSigningKey(header);
    
    try {
      // Verify the JWT with the public key
      jwt.verify(tokenSet.id_token, signingKey, {
        algorithms: ["RS256"],
      });

      // Get user info and respond
      const userInfo = await oidcClient.userinfo(tokenSet.access_token);
      res.json(userInfo);
    } catch (error) {
      console(err);
      res.status(401).send("Invalid ID Token");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Invalid Token Header or Key");
  }
});

app.listen(config.httpPort, () => {
  console.log(`Server is running at http://localhost:${config.httpPort}`);
});
