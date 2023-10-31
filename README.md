# OpenID Connect (OIDC) Authorization Code Flow with Node.js

This is a simple Node.js server implementation of the OIDC Authorization Code Flow using the `openid-client` library. This code demonstrates how to authenticate users via an OIDC Provider and retrieve user information after successful authentication.

## Prerequisites

- Node.js installed on your machine.
- An account with an OIDC Provider (e.g., Google, Auth0, Okta, etc.).
- A registered client application with the OIDC provider. Make sure to set the redirect URI in the OIDC provider to point to your server's callback endpoint.

## Installation

1. Clone this repository:

   ```bash
   git clone git@github.com:stratusdata/oidc_express_example.git
   ```

2. Navigate to the repository folder:

   ```bash
   cd oidc_express_example
   ```

3. Install the necessary npm packages:

   ```bash
   npm install
   ```

## Configuration

This application uses environment variables to configure the OIDC client. You can set these variables in a `.env` file in the root directory:

```env
OIDC_METADATA_URL=https://your-oidc-provider.com/.well-known/openid-configuration
OIDC_CLIENT_ID=your-client-id 
OIDC_CLIENT_SECRET=your-client-secret
OIDC_CLIENT_SCOPE=openid profile email
HTTP_PORT=3000
```

Please note: this application demonstrates the **Authorization Code Flow** for OpenID Connect. Only the `OIDC_METADATA_URL`, `OIDC_CLIENT_ID` and callback urls are shared with the OpenID Connect Provider.  All other settings or variables are internal to the application include the `OIDC_CLIENT_SECRET` environment variable.

**Note:** The given default values are placeholders. Replace them with appropriate values from your OIDC provider.

## Running the Application

1. Start the server:

   ```bash
   node server.js
   ```

2. Navigate to `http://localhost:3000` or your specified `HTTP_PORT` in a web browser. This will redirect you to your OIDC provider's authentication page.

3. After successful authentication, you'll be redirected back to your application's callback endpoint and the user's information will be displayed as a JSON response.

## How It Works

1. The app initializes an OIDC client using the configuration from environment variables.
2. When a user navigates to the application's root (`/`), they are redirected to the OIDC provider's authorization endpoint.
3. After authenticating with the OIDC provider, the user is redirected back to the application with an authorization code.
4. The application exchanges this authorization code for an access token and an ID token.
5. Using the access token, the application queries the OIDC provider's userinfo endpoint to retrieve user information.
6. The user's information is then sent as a response to the user.

## Security

Ensure you keep the `.env` file secure and never commit it to public repositories. The client secret should be kept confidential. Consider using other security measures for production, like HTTPS, session management, and token validation.

## Dependencies

- `express`: Web server framework.
- `openid-client`: A certified OIDC and OAuth 2.0 client library.
- `dotenv`: Loads environment variables from a `.env` file.

## Feedback & Contribution

Feel free to fork this repository, submit issues, or send pull requests with improvements or additional features.