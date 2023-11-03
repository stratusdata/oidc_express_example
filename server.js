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
    scope: env.OIDC_CLIENT_SCOPE || "openid profile email",
    authCallbackPath: "/auth/callback",
    authCallbackHost: `http://${env.HTTP_HOSTNAME}:${env.HTTP_PORT}`,
  },
  httpPort: env.HTTP_PORT || 8675,
};

/**
 * Method to validate the token using the public key
 * @param {*} tokenSet 
 * @returns 
 */
const validateToken = async (tokenSet) => {
  try {
    // Decode the JWT header to get the kid
    const header = JSON.parse(
      Buffer.from(tokenSet.id_token.split(".")[0], "base64").toString()
    );

    // Get the signing key
    let signingKey = await new Promise((resolve, reject) => {
      jswksClient.getSigningKey(header.kid, (err, key) => {
        if (err) return reject(err);
        const signingKey = key.publicKey || key.rsaPublicKey;
        resolve(signingKey);
      });
    });

    // Verify the JWT with the public key
    jwt.verify(tokenSet.id_token, signingKey, {
      algorithms: ["RS256"],
    });

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
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

  // Create a JWKS client (only needed if validating the token)
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
    // validate the token with the public key
    if (!await validateToken(tokenSet)) {
      throw new Error("Unable to verify token signature");
    }

    // Get user info and respond
    const userInfo = await oidcClient.userinfo(tokenSet.access_token);
    res.json(userInfo);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(config.httpPort, () => {
  console.log(`Server is running at http://localhost:${config.httpPort}`);
});
