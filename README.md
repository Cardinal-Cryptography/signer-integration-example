# Aleph Zero Signer integration example

## Intro

In this tutorial we are creating a simple webapp integrated with the Aleph Zero Signer. Our app will:

- import and display accounts from the Signer;
- sign a simple transfer transaction using those accounts.

## Requirements

- Aleph Zero Signer {here past links to where you can get signer for different browsers}
- `node` 14.18+ or 16+ (required to use `vite` with `react`: your dependencies may vary if you choose to use a different framework).

## Create project

We're using [`vite`](https://vitejs.dev/) to set up the project. Run:

```bash
npm create vite@latest signer-integration -- --template react-ts
```

You will then be able to start the dev server like this:

```bash
cd signer-integration
npm install
npm run dev
```

## Install dependency

Aleph Zero Signer exposes the polkadot.{js} dapp extension library API. You can check out their docs [here](https://polkadot.js.org/docs/extension/).

```bash
npm install @polkadot/extension-dapp
```

## Check if Signer is injected

First, let's make sure Signer was successfully injected into our website.

If Signer (or any other extension supporting this API) is available, it is added to the `window.injectedWeb3` object.

You can test that by running this example:

```bash
npm run dev
```

and, using your browser's developer console, inspect the `window.injectedWeb3` object to see if Signer is registered.

![Connect pop-up screenshot][inspect-injected-web3]

Common pitfalls/troubleshooting

- Signer extension wasn't successfully installed
- Signer is disabled
- Make sure your site is served from localhost, 127.0.0.1, or over https:// - Signer isn't injected on other sites served over http://.

## Connect to Signer

Now we are going to enable injected extensions (the API can handle more than one extension at a time, but in our case it's just the Signer). We will be using `web3Enable` - a util function from `@polkadot/extension-dapp`. It enables the connection and returns a list of all injected extensions.

We're going to call this method in the `onClick` handler of the 'Connect account' button:

```jsx
import { web3Enable } from "@polkadot/extension-dapp";

type InjectedExtension = Awaited<ReturnType<typeof web3Enable>>[number];

const [extensions, setExtensions] = useState<InjectedExtension[]>([]);

const loadAccountsFromExtensions = async () => {
  const injectedExtensions = await web3Enable(APP_NAME);

  setExtensions(injectedExtensions);
};

<button onClick={loadAccountsFromExtensions}>
  Connect to extensions
</button>
```

`APP_NAME` is a string - a name of the app that's trying to connect. This is how your app is going to be represented inside the Signer.

Important! You have to call `web3Enable` before any other utility functions.

Now, after clicking the button and going through the `Your privacy is protected` screen, you should see one of these pop-ups:

![Connect pop-up screenshot][no-accounts]
![Connect pop-up screenshot][connect-app-screenshot]

Add an account to Signer if you haven't already and make sure you select the checkbox next to it when connecting. Connecting an account means it's going to be available to a website - we'll be able to get account information and initiate signing transactions.

You can change connected accounts by going to:
`settings (top left corner) > Trusted apps > <Your app>`

## Loading accounts

Now we can use `web3Accounts` helper function to get all the accounts provided by the Signer:

```jsx
import { web3Accounts } from "@polkadot/extension-dapp";

type InjectedAccountWithMeta = Awaited<ReturnType<typeof web3Accounts>>[number];

const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);

const accounts = await web3Accounts(
  { extensions: ["aleph-zero-signer"] }
);

setAccounts(accounts);

<article>
  <h2>Signer accounts</h2>
  <ul>
    {accounts.map(({ address, meta: { name } }) => (
      <li key={address}>
        <strong>{name || "<unknown>"}</strong> {address}
      </li>
    ))}
  </ul>
</article>
```

Above, we're filtering to get only the accounts from the Signer, but you might choose to include all accounts.

## Transaction: prepare accounts

Since we are going to make transactions on the Aleph Zero Testnet, we are going to need two accounts and some funds (TZERO).
Create a second account in the Signer. Accounts have associated networks and we want both our accounts to have the Aleph Zero Testnet selected. You can either select it in the account creator or change it later in the settings.

We should be able to filter the accounts over selected network. To that end, `web3Accounts` has a `genesisHash` param available and for the Aleph Zero Testnet we want:

```js
const accounts = await web3Accounts({
  extensions: ["aleph-zero-signer"],
  genesisHash:
    "0x05d5279c52c484cc80396535a316add7d47b1c5b9e0398dd1f584149341460c5",
});
```

### Getting the funds

With the accounts ready, we need to set them up with some TZERO (the Aleph Zero Testnet currency). In order to do so, copy first account address and paste it in the address field in the Testnet [Faucet](https://faucet.test.azero.dev/). You'll need to solve a captcha and the system will transfer some TZERO to your account. You can check your accounts' balances e.g. in https://test.azero.dev/#/accounts (which, incidentally, is also an example of a Signer integration).

## Transaction: set up the API

To create a transaction we are going to be using the `@polkadot/api` library - [docs](https://polkadot.js.org/docs/api/).

```bash
npm install @polkadot/api
```

We'll need to set it up and initialize it using the Aleph Zero Testnet websocket:

```js
import { ApiPromise, WsProvider } from "@polkadot/api";

const ALEPH_ZERO_TESTNET_WS_PROVIDER = new WsProvider(
  "wss://ws.test.azero.dev"
);

const API_PROMISE = ApiPromise.create({
  provider: ALEPH_ZERO_TESTNET_WS_PROVIDER,
});

const [api, setApi] = useState<ApiPromise>();

useEffect(() => {
  API_PROMISE.then(setApi);
}, []);
```

## Transaction: sign a transaction

Next, we are going to sign a simple transfer transaction.
For the sake of simplicity we are going to transfer `50 TZERO` from the first account to the second one.

Note that we're using the big number implementation from `@polkadot/util` to make sure we don't exceed JavaScript's safe integer range.

```bash
npm install @polkadot/util
```

The balance on chain is kept in pico TZERO (10<sup>-12</sup>), so we need to adjust the transferred value. Instead of hardcoding the units here, we can get this information from the `api`.

```jsx
import { web3FromAddress } from "@polkadot/extension-dapp";
import { BN } from "@polkadot/util";

const makeTransfer = async () => {
  const [first, second] = accounts;

  const firstAddressInjector = await web3FromAddress(first.address);

  const transferAmount = new BN(50);
  const unitAdjustment = new BN(10).pow(new BN(api.registry.chainDecimals[0]));
  const finalAmount = transferAmount.mul(unitAdjustment);

  await api.tx.balances
    .transfer(second.address, finalAmount)
    .signAndSend(first.address, { signer: firstAddressInjector.signer });
};

<button onClick={makeTransfer}>Make transfer</button>;
```

After clicking the button you should see the Signer pop-up:

![Connect pop-up screenshot][transfer-authorization]

Lastly, you can confirm and check your accounts' balances in https://test.azero.dev/#/accounts.

Important! Just because the transaction Promise doesn't throw an exception, it doesn't mean it succeeded - see https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-get-the-decoded-enum-for-an-extrinsicfailed-event.

## Closing remarks

We hope this guide helps you to seamlessly integrate your app with the Signer.
In case of questions / bug reports / to find more content go to
`<here some links probably?>`

[no-accounts]: ./screenshots/no-accounts.png
[connect-app-screenshot]: ./screenshots/connect-app-screen.png
[inspect-injected-web3]: ./screenshots/inspect-injected-web3.png
[transfer-authorization]: ./screenshots/transfer-authorization.png
