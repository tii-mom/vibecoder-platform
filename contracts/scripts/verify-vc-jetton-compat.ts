import { Address, beginCell, Cell } from '@ton/core';
import { TonClient } from '@ton/ton';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const NETWORK = process.env.TON_NETWORK || 'testnet';
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const MANIFEST = process.env.DEPLOYMENT_MANIFEST || resolve(process.cwd(), 'deployments', `${NETWORK}.platform.json`);
const OWNER_RAW = process.env.VC_BALANCE_OWNER || process.argv[2];
if (!OWNER_RAW) {
    throw new Error('Set VC_BALANCE_OWNER or pass owner address as argv[2].');
}
const OWNER = Address.parse(OWNER_RAW);
const EXPECT_ADMIN_REVOKED = process.env.EXPECT_VC_ADMIN_REVOKED === '1';

if (NETWORK === 'mainnet' && process.env.ALLOW_MAINNET_VERIFY !== '1') {
    throw new Error('Refusing mainnet verification unless ALLOW_MAINNET_VERIFY=1 is set.');
}

function endpoint() {
    const base = NETWORK === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? `${base}/api/v2/jsonRPC?api_key=${TONCENTER_KEY}` : `${base}/api/v2/jsonRPC`;
}

function readManifest() {
    return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
}

function readAddress(name: string, manifest: any): Address {
    const raw = process.env[`${name}_ADDRESS`] || process.env[name] || manifest?.contracts?.[name]?.address;
    if (!raw) throw new Error(`Missing ${name} address in env or ${MANIFEST}`);
    return Address.parse(raw);
}

async function tryRun(client: TonClient, address: Address, method: string, args: any[] = []) {
    try {
        return { ok: true as const, value: await client.runMethod(address, method, args) };
    } catch (error) {
        return { ok: false as const, error };
    }
}

function decodeOffchainContent(cell: Cell): string | null {
    const slice = cell.beginParse();
    if (slice.remainingBits < 8) return null;
    const marker = slice.loadUint(8);
    if (marker !== 1) return null;

    const chunks: Buffer[] = [];
    let current = slice;
    while (true) {
        const byteLength = Math.floor(current.remainingBits / 8);
        if (byteLength > 0) {
            chunks.push(current.loadBuffer(byteLength));
        }
        if (current.remainingRefs === 0) break;
        current = current.loadRef().beginParse();
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function fetchJson(url: string) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const text = await response.text();
    let json: any = null;
    try {
        json = JSON.parse(text);
    } catch {
        json = text;
    }
    return { ok: response.ok, status: response.status, json };
}

function vc(amount: bigint) {
    return (amount / 1_000_000_000n).toString();
}

async function main() {
    const manifest = readManifest();
    const master = readAddress('VC_JETTON', manifest);
    const client = new TonClient({ endpoint: endpoint() });
    const ownerArg = [{ type: 'slice', cell: beginCell().storeAddress(OWNER).endCell() }];

    const snakeData = await tryRun(client, master, 'get_jetton_data');
    const camelData = await tryRun(client, master, 'getJettonData');
    const dataResult = snakeData.ok ? snakeData : camelData;
    if (!dataResult.ok) throw new Error('Neither get_jetton_data nor getJettonData worked on VC_JETTON.');

    const stack = dataResult.value.stack;
    const totalSupply = stack.readBigNumber();
    const mintable = stack.readBigNumber();
    const admin = stack.readAddress();
    const content = stack.readCell();
    const walletCode = stack.readCell();

    const snakeWallet = await tryRun(client, master, 'get_wallet_address', ownerArg);
    const camelWallet = await tryRun(client, master, 'getWalletAddress', ownerArg);
    const walletResult = snakeWallet.ok ? snakeWallet : camelWallet;
    if (!walletResult.ok) throw new Error('Neither get_wallet_address nor getWalletAddress worked on VC_JETTON.');
    const wallet = walletResult.value.stack.readAddress();

    const snakeWalletData = await tryRun(client, wallet, 'get_wallet_data');
    const camelWalletData = await tryRun(client, wallet, 'getWalletData');
    const walletDataResult = snakeWalletData.ok ? snakeWalletData : camelWalletData;
    if (!walletDataResult.ok) throw new Error('Neither get_wallet_data nor getWalletData worked on VC jetton wallet.');

    const walletStack = walletDataResult.value.stack;
    const balance = walletStack.readBigNumber();
    const walletOwner = walletStack.readAddress();
    const walletMaster = walletStack.readAddress();
    const walletCodeFromWallet = walletStack.readCell();

    const metadataUri = decodeOffchainContent(content);
    const metadata = metadataUri ? await fetchJson(metadataUri) : null;
    const tonapiBase = NETWORK === 'mainnet' ? 'https://tonapi.io' : 'https://testnet.tonapi.io';
    const tonapiJetton = await fetchJson(`${tonapiBase}/v2/jettons/${master.toString({ bounceable: false })}`);
    const tonapiBalances = await fetchJson(`${tonapiBase}/v2/accounts/${OWNER.toString({ bounceable: false })}/jettons`);
    const tonapiBalanceFound = Array.isArray(tonapiBalances.json?.balances)
        && tonapiBalances.json.balances.some((item: any) => {
            const raw = item?.jetton?.address || item?.jetton?.master || item?.jetton?.address_raw || '';
            try {
                return raw && Address.parse(raw).equals(master);
            } catch {
                return false;
            }
        });

    const report = {
        network: NETWORK,
        master: master.toString({ bounceable: false }),
        owner: OWNER.toString({ bounceable: false }),
        ownerRaw: OWNER.toRawString(),
        standardGetters: {
            masterGetJettonData: snakeData.ok,
            masterGetWalletAddress: snakeWallet.ok,
            walletGetWalletData: snakeWalletData.ok,
        },
        camelCaseFallbacks: {
            masterGetJettonData: camelData.ok,
            masterGetWalletAddress: camelWallet.ok,
            walletGetWalletData: camelWalletData.ok,
        },
        jettonData: {
            totalSupplyNano: totalSupply.toString(),
            totalSupplyVC: vc(totalSupply),
            mintable: mintable.toString(),
            admin: admin.toString({ bounceable: false }),
            adminRaw: admin.toRawString(),
            adminRevoked: admin.toRawString() === 'addr_none',
            metadataUri,
            walletCodeHashMatchesWallet: walletCode.hash().equals(walletCodeFromWallet.hash()),
        },
        walletData: {
            wallet: wallet.toString({ bounceable: false }),
            balanceNano: balance.toString(),
            balanceVC: vc(balance),
            owner: walletOwner.toString({ bounceable: false }),
            master: walletMaster.toString({ bounceable: false }),
            ownerMatches: walletOwner.equals(OWNER),
            masterMatches: walletMaster.equals(master),
        },
        metadata: metadata && {
            reachable: metadata.ok,
            status: metadata.status,
            name: metadata.json?.name,
            symbol: metadata.json?.symbol,
            decimals: metadata.json?.decimals,
            image: metadata.json?.image,
        },
        tonapi: {
            jettonEndpointOk: tonapiJetton.ok,
            jettonEndpointStatus: tonapiJetton.status,
            jettonEndpointError: tonapiJetton.ok ? undefined : tonapiJetton.json,
            accountBalancesEndpointOk: tonapiBalances.ok,
            accountBalancesEndpointStatus: tonapiBalances.status,
            accountBalancesContainsCurrentMaster: tonapiBalanceFound,
        },
    };

    console.log(JSON.stringify(report, null, 2));

    if (EXPECT_ADMIN_REVOKED && report.jettonData.adminRevoked !== true) {
        throw new Error('EXPECT_VC_ADMIN_REVOKED=1 but VC_JETTON admin is still set.');
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
