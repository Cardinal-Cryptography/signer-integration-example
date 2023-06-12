# Aleph Zero Signer integration example

## Intro

In this tutorial we are creating a simple webapp integrated with Signer. Our app:

- imports and displays accounts from Signer
- using those accounts signs simple transfer transaction.

## Requirements

- Aleph Zero Signer {here past links to where you can get signer for different browsers}
- node 14.18+ or 16+ (because we are using `vite` with `react`, but not necessarily required if you are using your framework of choice)

## Create project

We're using `vite` to set up project. Run:

```bash
yarn create vite signer-integration --template react-ts
```

or

```bash
npm create vite@latest signer-integration -- --template react-ts
```

## Install dependency

Aleph Zero Signer exposes polkadot.{js} dapp extension library API. Check out their [docs](https://polkadot.js.org/docs/extension/).

```bash
yarn add @polkadot/extension-dapp
```

```bash
npm install @polkadot/extension-dapp
```

## Check if Signer is injected

First, let's make sure Signer was successfully injected into our website.

If Signer (or any other extension supporting this API) is available it is added to `window.injectedWeb3` object.

You can test it, by running this example

```bash
yarn dev
```

and inspecting `injectedWeb3` object to see if Signer is registered.

![Connect pop-up screenshot][inspect-injected-web3]

Common pitfalls

- Signer extension wasn't successfully installed
- Signer is disabled
- Make sure you site is served from localhost, 127.0.0.1, or over https:// - signer isn't injected in other sites served over http://.

## Connect to Signer

Now we are going to enable injected extensions (API can handle more than one extension at a time, but in our case it's just the Signer). We using `web3Enable` - a util function from @polkadot/extension-dapp. It enables and returns list of all injected extensions.

I'm going to call this method in onClick of button `Connect account`.

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

`APP_NAME` is a string - name of an app that's trying to connect.

Important! You have to call `web3Enable` before any other utility functions.

Now, after clicking the button, after going through `Your privacy is protected` screen, you should see one of those pop-ups:

![Connect pop-up screenshot][no-accounts]
![Connect pop-up screenshot][connect-app-screenshot]

Add an account to Signer if you haven't already and make sure you select the checkbox next to it when connecting. Connecting an account means it's going to be available to a website - we'll be able to get account information and initiate signing transactions.

You can change connected accounts going to:
`settings (top left corner) > Trusted apps > <Your app>`

## Loading accounts

Now we can use `web3Accounts` helper function to get all accounts provided by Signer

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

above, we're filtering to get only accounts from Signer, but you might choose to include all accounts.

## Transaction: prepare accounts

We are making transactions on Aleph Zero Testnet. We need two accounts and some funds. Create a second account in Signer. Accounts have associated networks - we want both our account to be have Aleph Zero Testnet selected. You can either select it in account creator or change it in the settings.

We should add filtering accounts over selected network. `web3Accounts` has a `genesis` param available, for Aleph Zero Testnet we want:

```js
const accounts = await web3Accounts({
  extensions: ["aleph-zero-signer"],
  genesisHash:
    "0x05d5279c52c484cc80396535a316add7d47b1c5b9e0398dd1f584149341460c5",
});
```

We can now pour some money. Copy first account address and paste it in [faucet](https://faucet.test.azero.dev/). You can check you accounts balances e.g. in https://test.azero.dev/#/accounts (this is also an example of Signer integration).

## Transaction: set up API

To create a transaction we are using `@polkadot/api` library - [docs](https://polkadot.js.org/docs/api/).

```bash
yarn add @polkadot/api
```

Let's set it up using Aleph Zero Testnet websocket:

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

## Transaction: Signing transaction

Next we going to sign simple transfer transaction.
For sake of simplicity we are going to transfer `50 tzero` from first account to second.

We should use big number from `@polkadot/util` to make sure we don't exceed JavaScript safe integer range.

```bash
yarn add @polkadot/util
```

The balance on chain is kept in pico tzero (10<sup>-12</sup>), so we need to adjust transferred value. Instead of hardcoding the value we can use information from `api`.

```jsx
import { web3FromAddress } from "@polkadot/extension-dapp";
import { BN } from "@polkadot/util";

const makeTransfer = async () => {
  let first = accounts[0];
  let second = accounts[1];

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

After clicking the button you should see Signer pop-up:

![Connect pop-up screenshot][transfer-authorization]

Confirm and check your accounts balances in https://test.azero.dev/#/accounts.

Important! Just because transaction Promise doesn't throw, doesn't mean it succeeded - see https://polkadot.js.org/docs/api/cookbook/tx/#how-do-i-get-the-decoded-enum-for-an-extrinsicfailed-event.

## Finishing notes

Hope this guide enables you to integrate with Signer smoothly.
In case of questions / bug reports / to find more content go to
`<here some links probably?>`

[no-accounts]: ./screenshots/no-accounts.png
[connect-app-screenshot]: ./screenshots/connect-app-screen.png
[inspect-injected-web3]: ./screenshots/inspect-injected-web3.png
[transfer-authorization]: ./screenshots/transfer-authorization.png
