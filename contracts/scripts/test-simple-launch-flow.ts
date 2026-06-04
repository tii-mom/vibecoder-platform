import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { internal, TonClient, WalletContractV4 } from '@ton/ton';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

const DRY_RUN = !process.argv.includes('--execute');
const NETWORK = process.env.TON_NETWORK || 'testnet';

if (NETWORK === 'mainnet') throw new Error('Testnet only. Refusing TON_NETWORK=mainnet.');
if (NETWORK !== 'testnet') throw new Error('Set TON_NETWORK=testnet or leave it unset.');
if (!DRY_RUN && process.env.CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW !== 'YES') {
    throw new Error('Set CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES before executing SimpleLaunch testnet flow.');
}

const TONCENTER_KEY = process.env.TONCENTER_API_KEY || '';
const MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.simple-launch.json');
const PLAN_MANIFEST_PATH = resolve(process.cwd(), 'deployments', 'testnet.simple-launch.plan.json');
const OVERRIDE_MANIFEST_PATH = process.env.SIMPLE_LAUNCH_MANIFEST_PATH
    ? resolve(process.cwd(), process.env.SIMPLE_LAUNCH_MANIFEST_PATH)
    : '';
const ACTIVE_MANIFEST_PATH = OVERRIDE_MANIFEST_PATH || (existsSync(MANIFEST_PATH) ? MANIFEST_PATH : PLAN_MANIFEST_PATH);

if (!existsSync(ACTIVE_MANIFEST_PATH)) {
    throw new Error('SimpleLaunch manifest not found. Run deploy:simple-launch:testnet:plan first.');
}

function endpoint(): string {
    const base = 'https://testnet.toncenter.com';
    return TONCENTER_KEY ? base + '/api/v2/jsonRPC?api_key=' + TONCENTER_KEY : base + '/api/v2/jsonRPC';
}

function normalizeMnemonic(raw: string): string {
    return raw.replace(/"/g, '').replace(/\u00a0/g, ' ').trim();
}

function contributorMnemonics(): string[] {
    const raw = process.env.SIMPLE_LAUNCH_CONTRIBUTOR_MNEMONICS || '';
    return raw.split('|').map(normalizeMnemonic).filter(m => m.split(' ').length >= 12);
}

async function openWallet(client: TonClient, mnemonic: string) {
    const keyPair = await mnemonicToPrivateKey(normalizeMnemonic(mnemonic).split(' '));
    const wallet = client.open(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }));
    return { wallet, secretKey: keyPair.secretKey };
}

async function getCampaignData(client: TonClient, campaign: Address) {
    const { stack } = await client.runMethod(campaign, 'getSimpleLaunchCampaignData');
    return {
        projectOwner: stack.readAddress(),
        teamWallet: stack.readAddress(),
        platformFund: stack.readAddress(),
        escrowAddress: stack.readAddress(),
        tokenAddress: stack.readAddress(),
        targetRaiseTon: stack.readBigNumber(),
        hardCapTon: stack.readBigNumber(),
        minContributionTon: stack.readBigNumber(),
        minParticipants: stack.readNumber(),
        minTotalRaiseTon: stack.readBigNumber(),
        endTime: stack.readNumber(),
        platformFeeBps: stack.readNumber(),
        state: stack.readNumber(),
        participantCount: stack.readNumber(),
        totalRaisedTon: stack.readBigNumber(),
    };
}

async function getEscrowData(client: TonClient, escrow: Address) {
    const { stack } = await client.runMethod(escrow, 'getLaunchEscrowData');
    return {
        campaignAddress: stack.readAddress(),
        projectOwner: stack.readAddress(),
        targetRaiseTon: stack.readBigNumber(),
        hardCapTon: stack.readBigNumber(),
        minContributionTon: stack.readBigNumber(),
        minTotalRaiseTon: stack.readBigNumber(),
        endTime: stack.readNumber(),
        state: stack.readNumber(),
        totalRaisedTon: stack.readBigNumber(),
        withdrawnTon: stack.readBigNumber(),
    };
}

async function getEscrowContribution(client: TonClient, escrow: Address, user: Address) {
    const { stack } = await client.runMethod(escrow, 'getLaunchEscrowContribution', [
        { type: 'slice', cell: beginCell().storeAddress(user).endCell() },
    ]);
    return {
        contribution: stack.readBigNumber(),
        refunded: stack.readNumber(),
    };
}

async function sendOne(
    wallet: any,
    secretKey: Buffer,
    to: Address,
    value: bigint,
    body: Cell,
) {
    let seqno = 0;
    try {
        seqno = await wallet.getSeqno();
    } catch {
        seqno = 0;
    }
    await wallet.sendTransfer({ seqno, secretKey, messages: [internal({ to, value, body })] });
    await new Promise(resolve => setTimeout(resolve, 12000));
}

async function main() {
    const manifest = JSON.parse(readFileSync(ACTIVE_MANIFEST_PATH, 'utf8'));
    const scenario = process.env.SIMPLE_LAUNCH_FLOW_SCENARIO || 'success';
    if (scenario !== 'success' && scenario !== 'failure') {
        throw new Error('SIMPLE_LAUNCH_FLOW_SCENARIO must be success or failure.');
    }

    const campaign = Address.parse(manifest.contracts.SIMPLE_LAUNCH_CAMPAIGN);
    const escrow = Address.parse(manifest.contracts.LAUNCH_ESCROW);
    const minParticipants = Number(manifest.config?.minParticipants || 5);
    const contributionTon = process.env.SIMPLE_LAUNCH_FLOW_CONTRIBUTION_TON || '10';
    const contribution = toNano(contributionTon);

    console.log('=== SimpleLaunch Testnet Flow ===');
    console.log('Mode: ' + (DRY_RUN ? 'DRY RUN' : 'EXECUTE'));
    console.log('Scenario: ' + scenario);
    console.log('Manifest: ' + ACTIVE_MANIFEST_PATH);
    console.log('Campaign: ' + campaign.toString({ bounceable: false }));
    console.log('Escrow: ' + escrow.toString({ bounceable: false }));
    console.log();

    if (DRY_RUN) {
        console.log('Planned success flow:');
        console.log('  1. ' + minParticipants + ' unique contributors send OP_CONTRIBUTE to escrow.');
        console.log('  2. project owner sends OP_ACTIVATE_TOKEN to campaign.');
        console.log('  3. project owner sends OP_FINALIZE to campaign.');
        console.log('  4. at least one contributor sends OP_CLAIM_TOKEN to campaign.');
        console.log('  5. project owner sends OP_WITHDRAW to escrow.');
        console.log();
        console.log('Planned failure/refund flow requires a separate deployed campaign:');
        console.log('  1. contributor sends OP_CONTRIBUTE to escrow.');
        console.log('  2. project owner marks campaign failed.');
        console.log('  3. contributor sends OP_REFUND to escrow.');
        console.log();
        console.log('Execute success: CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES SIMPLE_LAUNCH_FLOW_SCENARIO=success npm run test:simple-launch:flow');
        console.log('Execute failure: CONFIRM_SIMPLE_LAUNCH_TESTNET_FLOW=YES SIMPLE_LAUNCH_FLOW_SCENARIO=failure npm run test:simple-launch:flow');
        return;
    }

    if (manifest.status !== 'deployed') {
        throw new Error('Execute flow requires deployments/testnet.simple-launch.json with status=deployed.');
    }

    const ownerMnemonic = normalizeMnemonic(process.env.DEPLOYER_MNEMONIC || '');
    if (ownerMnemonic.split(' ').length < 12) throw new Error('Set DEPLOYER_MNEMONIC for project-owner flow actions.');
    const contributors = contributorMnemonics();
    if (contributors.length < (scenario === 'success' ? minParticipants : 1)) {
        throw new Error('Set SIMPLE_LAUNCH_CONTRIBUTOR_MNEMONICS to pipe-separated mnemonics for required contributors.');
    }

    const client = new TonClient({ endpoint: endpoint() });
    const owner = await openWallet(client, ownerMnemonic);
    const ownerAddress = owner.wallet.address.toString({ bounceable: false });
    if (ownerAddress !== manifest.config.projectOwner) {
        throw new Error('DEPLOYER_MNEMONIC wallet must match manifest.config.projectOwner.');
    }

    if (scenario === 'failure') {
        const contributor = await openWallet(client, contributors[0]);
        const contributorAddress = contributor.wallet.address;
        console.log('Contribute for failure scenario...');
        await sendOne(
            contributor.wallet,
            contributor.secretKey,
            escrow,
            contribution + toNano('0.2'),
            beginCell().storeUint(1, 32).storeUint(0, 64).storeCoins(contribution).endCell(),
        );
        console.log('Mark campaign failed...');
        await sendOne(owner.wallet, owner.secretKey, campaign, toNano('0.1'), beginCell().storeUint(7, 32).storeUint(0, 64).endCell());
        const campaignData = await getCampaignData(client, campaign);
        const escrowData = await getEscrowData(client, escrow);
        if (campaignData.state !== 4 || escrowData.state !== 3) {
            throw new Error('Expected campaign failed state=4 and escrow failed state=3; got campaign=' + campaignData.state + ', escrow=' + escrowData.state);
        }
        console.log('Refund contributor...');
        await sendOne(contributor.wallet, contributor.secretKey, escrow, toNano('0.05'), beginCell().storeUint(5, 32).storeUint(0, 64).endCell());
        const refunded = await getEscrowContribution(client, escrow, contributorAddress);
        if (refunded.refunded !== 1) {
            throw new Error('Expected refunded=1 after refund; got ' + refunded.refunded);
        }
        console.log('Verify duplicate refund rejection...');
        await sendOne(contributor.wallet, contributor.secretKey, escrow, toNano('0.05'), beginCell().storeUint(5, 32).storeUint(0, 64).endCell());
        const duplicateRefund = await getEscrowContribution(client, escrow, contributorAddress);
        if (duplicateRefund.refunded !== 1) {
            throw new Error('Duplicate refund changed refunded flag to ' + duplicateRefund.refunded);
        }
        console.log('Verify claim after failure rejection...');
        await sendOne(contributor.wallet, contributor.secretKey, campaign, toNano('0.05'), beginCell().storeUint(4, 32).storeUint(0, 64).endCell());
        const afterClaimAttempt = await getCampaignData(client, campaign);
        if (afterClaimAttempt.state !== 4) {
            throw new Error('Claim after failure changed campaign state to ' + afterClaimAttempt.state);
        }
        manifest.flow.refund = 'complete';
        manifest.flow.duplicateRefund = 'rejected';
        manifest.flow.claimAfterFailure = 'rejected';
        manifest.flow.failureScenarioAt = new Date().toISOString();
        writeFileSync(ACTIVE_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
        console.log('Failure/refund flow complete.');
        return;
    }

    for (let i = 0; i < minParticipants; i += 1) {
        const contributor = await openWallet(client, contributors[i]);
        console.log('Contribute #' + (i + 1) + '...');
        await sendOne(
            contributor.wallet,
            contributor.secretKey,
            escrow,
            contribution + toNano('0.2'),
            beginCell().storeUint(1, 32).storeUint(0, 64).storeCoins(contribution).endCell(),
        );
    }

    console.log('Activate project token...');
    await sendOne(owner.wallet, owner.secretKey, campaign, toNano('0.2'), beginCell().storeUint(2, 32).storeUint(0, 64).endCell());
    manifest.flow.activation = 'complete';

    console.log('Finalize campaign...');
    await sendOne(owner.wallet, owner.secretKey, campaign, toNano('0.3'), beginCell().storeUint(3, 32).storeUint(0, 64).endCell());
    manifest.flow.finalize = 'complete';

    const firstContributor = await openWallet(client, contributors[0]);
    console.log('Claim contributor token allocation...');
    await sendOne(firstContributor.wallet, firstContributor.secretKey, campaign, toNano('0.2'), beginCell().storeUint(4, 32).storeUint(0, 64).endCell());
    manifest.flow.claim = 'complete';

    const withdrawTon = process.env.SIMPLE_LAUNCH_FLOW_WITHDRAW_TON || manifest.config.hardCapTon || '50';
    console.log('Withdraw successful raise...');
    await sendOne(
        owner.wallet,
        owner.secretKey,
        escrow,
        toNano('0.1'),
        beginCell().storeUint(4, 32).storeUint(0, 64).storeCoins(toNano(withdrawTon)).endCell(),
    );
    manifest.flow.withdraw = 'complete';
    manifest.flow.successScenarioAt = new Date().toISOString();
    writeFileSync(ACTIVE_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Success flow complete.');
}

main().catch(e => {
    console.error('SimpleLaunch flow failed: ' + String(e.message || e));
    process.exit(1);
});
