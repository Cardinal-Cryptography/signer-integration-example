import { useEffect, useState } from "react";
import "./App.css";

import { ApiPromise, WsProvider } from "@polkadot/api";

import {
  web3Enable,
  web3Accounts,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { BN } from "@polkadot/util";

type InjectedAccountWithMeta = Awaited<ReturnType<typeof web3Accounts>>[number];

const ALEPH_ZERO_TESTNET_WS_PROVIDER = new WsProvider(
  "wss://ws.test.azero.dev"
);

const API_PROMISE = ApiPromise.create({
  provider: ALEPH_ZERO_TESTNET_WS_PROVIDER,
});

const APP_NAME = "Signer integration";

function App() {
  const [api, setApi] = useState<ApiPromise>();
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);

  useEffect(() => {
    API_PROMISE.then(setApi);
  }, []);

  if (!api) {
    return "Connecting to Aleph Zero Testnet...";
  }

  const loadAccountsFromExtensions = async () => {
    // Returned value is an array of injected extensions.
    // Be careful, Signer is injected only to sites served through `https://` with exceptions for localhost and 127.0.0.1.
    // If extension hasn't connected to your domain before, it will show pop-up for user, to confirm connection.
    const injectedExtensions = await web3Enable(APP_NAME);

    console.log({ injectedExtensions });

    // Return list of accounts imported from extensions
    // You can filter by different parameters, here we filter over extension name and import only Signer accounts:
    const accounts = await web3Accounts({
      extensions: ["aleph-zero-signer"],
      genesisHash:
        "0x05d5279c52c484cc80396535a316add7d47b1c5b9e0398dd1f584149341460c5",
    });

    console.log({ accounts });
    // for sake of brevity we skip checking if unmounted
    setAccounts(accounts);
  };

  const makeTransfer = async () => {
    const [first, second] = accounts;

    const firstAddressInjector = await web3FromAddress(first.address);

    const transferAmount = new BN(50);
    const unitAdjustment = new BN(10).pow(
      new BN(api.registry.chainDecimals[0])
    );
    const finalAmount = transferAmount.mul(unitAdjustment);

    await api.tx.balances
      .transfer(second.address, finalAmount)
      .signAndSend(first.address, { signer: firstAddressInjector.signer });
  };

  return (
    <>
      <h1>Signer Integration</h1>
      <button onClick={loadAccountsFromExtensions}>
        Load account from extensions
      </button>
      <button onClick={makeTransfer}>Make transfer</button>
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
    </>
  );
}

export default App;
