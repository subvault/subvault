# Subvault

Subvault is a simple command-line wallet management tool for Substrate.

## Warning

This is pre-production software. It's currently mostly for the author's personal use and for many commands it lacks sufficient sanity checks. Don't use Subvault for wallets that may be valuable to you. The software is provided in hope that it will be useful for others, without warranty.

## Get started

Install Subvault via `npm`:

```
npm install -g subvault
```

Then you can use Subvault to create a vault:

```
subvault create polkadot.subvault
```

Enter the network name `polkadot` to finish creation.

Subsequently, use the following command to open an existing vault:

```
subvault open polkadot.subvault
```

### Commands

#### `wallet add external <name> <address>`

Add an external wallet by its address without the private keys. This is basically the `viewonly` mode.

#### `wallet add polkadotjs <json>`

Add a wallet encoded in the polkadot.js json format.

#### `wallet remove <name>`

Remove a wallet from the vault.

#### `addressbook add <name> <address>`

Add an address to the address book.

#### `addressbook remove <name>`

Remove an address from the address book.

#### `balance [address]`

Get the balance of an address. If `address` is unspecified, it returns balances of all wallets in the vault.

#### `payout list`

List currently available payouts, with any wallets in the vault as the validator stashes.

#### `payout execute using <address>`

Sign the extrinsic to execute all pending payout, using `address`.

#### `transfer from <from> to <to> value <value>`

Transfer balance from address to another address, using `transferKeepAlive`.