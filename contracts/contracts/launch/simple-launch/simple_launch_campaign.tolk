fun getContractData(): cell { return contract.getData(); }
fun setContractData(data: cell): void { contract.setData(data); }
fun sendMessage(message: cell, mode: int): void asm "SENDRAWMSG";
fun getMyAddress(): slice asm "MYADDR";
fun cellHash(data: cell): int asm "HASHCU";
fun isMessageBounced(flags: int): int { return flags & 1; }
fun isSliceBitsEqual(a: slice, b: slice): int asm "SDEQ";
fun parseStandardAddress(addr: slice): (int, int) asm "REWRITESTDADDR";
fun now(): int asm "NOW";
fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; }
    return 0;
}

import "@stdlib/tvm-dicts"

const STATE_DRAFT = 0;
const STATE_FUNDING = 1;
const STATE_ACTIVATED = 2;
const STATE_FINALIZED = 3;
const STATE_FAILED = 4;
const STATE_CANCELLED = 5;
const STATE_REFUNDING = 6;

const OP_PARTICIPATION_NOTIFY = 1;
const OP_ACTIVATE_TOKEN = 2;
const OP_FINALIZE = 3;
const OP_CLAIM_TOKEN = 4;
const OP_CANCEL = 5;
const OP_SET_METADATA = 6;
const OP_MARK_FAILED = 7;

const PROJECT_TOKEN_TOTAL_SUPPLY = 100000000000000000;
const PLATFORM_TOKEN_SHARE = 15000000000000000;
const BASE_TEAM_SHARE = 35000000000000000;
const MAX_USER_SHARE = 50000000000000000;

global projectOwner: slice;
global teamWallet: slice;
global platformFund: slice;
global escrowAddr: slice;
global tokenAddr: slice;
global targetRaiseTon: int;
global hardCapTon: int;
global minContributionTon: int;
global minParticipants: int;
global minTotalRaiseTon: int;
global endTime: int;
global platformFeeBps: int;
global state: int;
global tokenDeployed: int;
global participantCount: int;
global totalRaisedTon: int;
global actualUserShare: int;
global actualTeamShare: int;
global platformShare: int;
global tokenCode: cell;
global walletCode: cell;
global metadata: cell;
global users: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    var addrs1 = ds.loadRef().beginParse();
    projectOwner = addrs1.loadAddress() as slice;
    teamWallet = addrs1.loadAddress() as slice;
    platformFund = addrs1.loadAddress() as slice;
    addrs1.assertEnd();
    var addrs2 = ds.loadRef().beginParse();
    escrowAddr = addrs2.loadAddress() as slice;
    tokenAddr = addrs2.loadAddress() as slice;
    addrs2.assertEnd();
    var params = ds.loadRef().beginParse();
    targetRaiseTon = params.loadCoins();
    hardCapTon = params.loadCoins();
    minContributionTon = params.loadCoins();
    minParticipants = params.loadUint(32);
    minTotalRaiseTon = params.loadCoins();
    endTime = params.loadUint(32);
    platformFeeBps = params.loadUint(16);
    params.assertEnd();
    state = ds.loadUint(8);
    tokenDeployed = ds.loadBool() ? 1 : 0;
    participantCount = ds.loadUint(32);
    totalRaisedTon = ds.loadCoins();
    actualUserShare = ds.loadCoins();
    actualTeamShare = ds.loadCoins();
    platformShare = ds.loadCoins();
    var refs = ds.loadRef().beginParse();
    tokenCode = refs.loadRef();
    walletCode = refs.loadRef();
    metadata = refs.loadRef();
    users = refs.loadDict();
    refs.assertEnd();
    ds.assertEnd();
}

fun saveData() {
    val addrs1 = beginCell()
        .storeSlice(projectOwner).storeSlice(teamWallet).storeSlice(platformFund)
        .endCell();
    val addrs2 = beginCell()
        .storeSlice(escrowAddr).storeSlice(tokenAddr)
        .endCell();
    val params = beginCell()
        .storeCoins(targetRaiseTon).storeCoins(hardCapTon).storeCoins(minContributionTon)
        .storeUint(minParticipants, 32).storeCoins(minTotalRaiseTon)
        .storeUint(endTime, 32).storeUint(platformFeeBps, 16)
        .endCell();
    val refs = beginCell()
        .storeRef(tokenCode).storeRef(walletCode).storeRef(metadata)
        .storeDict(users)
        .endCell();
    setContractData(beginCell()
        .storeRef(addrs1).storeRef(addrs2).storeRef(params)
        .storeUint(state, 8).storeBool(tokenDeployed != 0)
        .storeUint(participantCount, 32).storeCoins(totalRaisedTon)
        .storeCoins(actualUserShare).storeCoins(actualTeamShare).storeCoins(platformShare)
        .storeRef(refs)
        .endCell());
}

fun tokenInit(): cell {
    val data = beginCell()
        .storeCoins(0)
        .storeCoins(PROJECT_TOKEN_TOTAL_SUPPLY)
        .storeSlice(getMyAddress())
        .storeBool(false)
        .storeRef(metadata)
        .storeRef(walletCode)
        .endCell();
    return beginCell().storeUint(6, 5).storeRef(tokenCode).storeRef(data).endCell();
}

fun computeTokenAddr(): slice {
    val init = tokenInit();
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
}

fun sendTokenDeploy() {
    val init = tokenInit();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(true).storeBool(true).storeRef(init)
        .storeBool(false).endCell(), 1);
}

fun recomputeAllocations() {
    actualUserShare = MAX_USER_SHARE;
    if (totalRaisedTon < targetRaiseTon) {
        actualUserShare = MAX_USER_SHARE * totalRaisedTon / targetRaiseTon;
    }
    actualTeamShare = BASE_TEAM_SHARE + (MAX_USER_SHARE - actualUserShare);
    platformShare = PLATFORM_TOKEN_SHARE;

    var (key, valSlice, ok) = users.uDictGetFirst(256);
    while (ok) {
        var userRecord = valSlice!;
        val contribution = userRecord.loadCoins();
        userRecord.loadCoins();
        val claimed = userRecord.loadUint(8);
        var allocation = 0;
        if (totalRaisedTon > 0) {
            allocation = actualUserShare * contribution / totalRaisedTon;
        }
        users.uDictSetBuilder(256, key!, beginCell()
            .storeCoins(contribution).storeCoins(allocation).storeUint(claimed, 8));
        var (nk, nvs, ns) = users.uDictGetNext(256, key!);
        key = nk; valSlice = nvs; ok = ns;
    }
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_PARTICIPATION_NOTIFY) {
        assert(isSliceBitsEqual(sender, escrowAddr) != 0, 5101);
        assert(state == STATE_FUNDING || state == STATE_ACTIVATED, 5102);
        val user = msgBody.loadAddress() as slice;
        val contribution = msgBody.loadCoins();
        assert(contribution >= minContributionTon, 5103);
        assert(totalRaisedTon + contribution <= hardCapTon, 5104);
        val (_, uh) = parseStandardAddress(user);
        var (us, found) = users.uDictGet(256, uh);
        var previous = 0;
        var allocation = 0;
        var claimed = 0;
        if (found) {
            var existing = us!;
            previous = existing.loadCoins();
            allocation = existing.loadCoins();
            claimed = existing.loadUint(8);
        } else {
            participantCount += 1;
        }
        users.uDictSetBuilder(256, uh, beginCell()
            .storeCoins(previous + contribution).storeCoins(allocation).storeUint(claimed, 8));
        totalRaisedTon += contribution;
        saveData();
        return;
    }

    if (op == OP_ACTIVATE_TOKEN) {
        assert(isSliceBitsEqual(sender, projectOwner) != 0, 5105);
        assert(state == STATE_FUNDING, 5106);
        assert(participantCount >= minParticipants, 5107);
        assert(minTotalRaiseTon == 0 || totalRaisedTon >= minTotalRaiseTon, 5108);
        tokenAddr = computeTokenAddr();
        tokenDeployed = 1;
        state = STATE_ACTIVATED;
        sendTokenDeploy();
        saveData();
        return;
    }

    if (op == OP_FINALIZE) {
        assert(isSliceBitsEqual(sender, projectOwner) != 0, 5105);
        assert(state == STATE_ACTIVATED, 5109);
        assert(now() >= endTime || totalRaisedTon >= hardCapTon, 5110);
        recomputeAllocations();
        state = STATE_FINALIZED;
        saveData();
        return;
    }

    if (op == OP_CLAIM_TOKEN) {
        assert(state == STATE_FINALIZED, 5111);
        val (_, uh) = parseStandardAddress(sender);
        var (us, found) = users.uDictGet(256, uh);
        assert(found, 5112);
        var userSlice = us!;
        val contribution = userSlice.loadCoins();
        val allocation = userSlice.loadCoins();
        val claimed = userSlice.loadUint(8);
        assert(allocation > 0 && claimed == 0, 5113);
        users.uDictSetBuilder(256, uh, beginCell()
            .storeCoins(contribution).storeCoins(allocation).storeUint(1, 8));
        saveData();
        return;
    }

    if (op == OP_CANCEL) {
        assert(isSliceBitsEqual(sender, projectOwner) != 0, 5105);
        assert(state == STATE_DRAFT || state == STATE_FUNDING, 5114);
        state = STATE_CANCELLED;
        saveData();
        return;
    }

    if (op == OP_SET_METADATA) {
        assert(isSliceBitsEqual(sender, projectOwner) != 0, 5105);
        assert(tokenDeployed == 0, 5115);
        metadata = msgBody.loadRef();
        saveData();
        return;
    }

    if (op == OP_MARK_FAILED) {
        assert(isSliceBitsEqual(sender, projectOwner) != 0, 5105);
        assert(state == STATE_FUNDING || state == STATE_ACTIVATED, 5116);
        state = STATE_FAILED;
        saveData();
        return;
    }

    throw 0xffff;
}

get fun getSimpleLaunchCampaignData(): (slice, slice, slice, slice, slice, int, int, int, int, int, int, int, int, int, int) {
    loadData();
    return (projectOwner, teamWallet, platformFund, escrowAddr, tokenAddr,
        targetRaiseTon, hardCapTon, minContributionTon, minParticipants, minTotalRaiseTon,
        endTime, platformFeeBps, state, participantCount, totalRaisedTon);
}

get fun getSimpleLaunchDistribution(): (int, int, int) {
    loadData();
    return (actualUserShare, actualTeamShare, platformShare);
}

get fun getSimpleLaunchTokenState(): (int, slice, int) {
    loadData();
    return (tokenDeployed, tokenAddr, state);
}

get fun getSimpleLaunchUser(user: slice): (int, int, int) {
    loadData();
    val (_, uh) = parseStandardAddress(user);
    var (us, found) = users.uDictGet(256, uh);
    if (!found) { return (0, 0, 0); }
    var u = us!;
    return (u.loadCoins(), u.loadCoins(), u.loadUint(8));
}
