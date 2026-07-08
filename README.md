# n8n-nodes-termii

This is an n8n community node for [Termii](https://termii.com/). It integrates with Termii's official API for SMS messaging, OTP token verification, account balance checks, and sender ID listing.

Termii helps businesses send messages and verification tokens across supported messaging channels. This package implements only the MVP operations listed below.

## Supported Operations

### Message
- **Send SMS**: Send an SMS message to one recipient.
- **Send Bulk SMS**: Send an SMS message to multiple recipients.

### OTP / Token
- **Send Token**: Send a Termii OTP token to a recipient.
- **Verify Token**: Verify a token using the PIN ID and PIN.

### Account
- **Get Balance**: Retrieve your Termii wallet balance.

### Sender ID
- **List Sender IDs**: Retrieve sender IDs associated with your Termii account.

## Installation

Follow the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

For local development or testing:

```bash
npm install
npm run build
npm link
```

Then, from your local n8n custom nodes directory:

```bash
npm link n8n-nodes-termii
```

Restart n8n after linking the package.

## Credentials

To use this node, you need a Termii account, account base URL, and API key.

1. Log in to your [Termii dashboard](https://app.termii.com/).
2. Copy your account **Base URL** from the dashboard. Termii's current docs say each account has its own base URL.
3. Go to **Settings**.
4. Open the **API token** tab.
5. Copy your API key.
6. In n8n, create a new **Termii API** credential.
7. Paste the dashboard base URL into **Base URL**.
8. Paste the API key into **API Key**.

The credential is reused by all Termii node operations. The node sends the API key using the request shape documented by Termii.

## Example Workflows

### Send a Single SMS
Use the **Message** resource with **Send SMS**. Provide the recipient phone number, sender ID, message text, channel, and message type.

### Send a Bulk SMS
Use the **Message** resource with **Send Bulk SMS**. Add up to 100 phone numbers, then provide the sender ID, message text, channel, and message type.

### Send and Verify an OTP
Use **OTP / Token > Send Token** to send a token. Store the returned `pinId` or `pin_id`, then use **OTP / Token > Verify Token** with the PIN entered by the recipient.

### Check Wallet Balance
Use **Account > Get Balance** to retrieve your Termii wallet balance and currency.

### Review Sender IDs
Use **Sender ID > List Sender IDs** to retrieve the sender IDs and statuses on your Termii account.

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Run in development mode:

```bash
npm run dev
```

Format TypeScript files:

```bash
npm run format
```

## Documentation Sources

Endpoint and request-field decisions are based on Termii's official documentation:

- [Termii Documentation](https://termii.com/docs)
- [Introduction / API Endpoint](https://developers.termii.com/)
- [Authentication](https://developer.termii.com/authentication)
- [Messaging API](https://developers.termii.com/messaging-api)
- [Send Token](https://developer.termii.com/send-token)
- [Verify Token](https://developers.termii.com/verify-token)
- [Balance](https://developer.termii.com/balance)
- [Sender ID API](https://developers.termii.com/sender-id)
- Termii's official Postman collection linked from the documentation introduction

## Disclaimer

This is a community node package for n8n. It is not an official Termii product unless Termii later approves or adopts it.

## License

[MIT](LICENSE)
