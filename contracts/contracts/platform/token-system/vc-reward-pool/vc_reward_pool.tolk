fun getContractData(): cell { return contract.getData(); }
fun setContractData(data: cell): void { contract.setData(data); }
fun sendMessage(message: cell, mode: int): void asm "SENDRAWMSG";
fun getMyAddress(): slice asm "MYADDR";
fun cellHash(data: cell): int asm "HASHCU";
fun isMessageBounced(flags: int): int { return flags & 1; }
fun isSliceBitsEqual(a: slice, b: slice): int asm "SDEQ";
fun parseStandardAddress(addr: slice): (int, int) asm "REWRITESTDADDR";
fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; }
    return 0;
}

import "@stdlib/tvm-dicts"

const OP_NOOP = 0x7fffffff;
const OP_SET_PROJECT = 1;
const OP_RECORD_USER = 2;
const OP_CLAIM_DEVELOPER = 3;
const OP_CLAIM_USER = 4;
const OP_WITHDRAW_TON = 5;
const OP_WITHDRAW_VC = 6;

const DEV_REWARD = 10000000000000;          // 10,000 VC
const USER_REWARD_PER_TON = 1000000000000;  // 1,000 VC
const USER_MAX_REWARD = 10000000000000;     // 10,000 VC
const PROJECT_USER_CAP = 100000000000000;   // 100,000 VC

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global developerRemaining: int;
global ecosystemRemaining: int;
global projects: dict;
global userContributions: dict;
global claimedUsers: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    developerRemaining = ds.loadCoins();
    ecosystemRemaining = ds.loadCoins();
    projects = ds.loadDict();
    userContributions = ds.loadDict();
    claimedUsers = ds.loadDict();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode).storeSlice(myWallet)
        .storeCoins(developerRemaining).storeCoins(ecosystemRemaining)
        .storeDict(projects).storeDict(userContributions).storeDict(claimedUsers)
        .endCell());
}

fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
}

fun keyFor(project: slice, user: slice): slice {
    val (_, ph) = parseStandardAddress(project);
    val (_, uh) = parseStandardAddress(user);
    return beginCell().storeUint(ph, 256).storeUint(uh, 256).endCell().beginParse();
}

fun sendVc(to: slice, amount: int, qid: int) {
    val toWallet = calcWallet(to);
    val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amount)
        .storeSlice(toWallet).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    if (op == OP_NOOP) { return; }

    if (op == OP_SET_PROJECT) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 2101);
        val project = msgBody.loadAddress() as slice;
        val creator = msgBody.loadAddress() as slice;
        val participants = msgBody.loadUint(32);
        val success = msgBody.loadUint(8);
        val (_, ph) = parseStandardAddress(project);
        var existingUserRewards = 0;
        var existingDevClaimed = 0;
        var (old, found) = projects.uDictGet(256, ph);
        if (found) {
            var oldSlice = old!;
            oldSlice.loadUint(256);
            oldSlice.loadUint(32);
            oldSlice.loadUint(8);
            existingDevClaimed = oldSlice.loadUint(8);
            existingUserRewards = oldSlice.loadCoins();
        }
        projects.uDictSetBuilder(256, ph, beginCell()
            .storeUint(parseStandardAddress(creator).1, 256)
            .storeUint(participants, 32)
            .storeUint(success, 8)
            .storeUint(existingDevClaimed, 8)
            .storeCoins(existingUserRewards));
        saveData();
        return;
    }

    if (op == OP_RECORD_USER) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 2101);
        val project = msgBody.loadAddress() as slice;
        val user = msgBody.loadAddress() as slice;
        val tonAmount = msgBody.loadCoins();
        val key = keyFor(project, user);
        userContributions.sDictSet(512, key, beginCell().storeCoins(tonAmount).endCell().beginParse());
        saveData();
        return;
    }

    if (op == OP_CLAIM_DEVELOPER) {
        val project = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(project);
        var (ps, found) = projects.uDictGet(256, ph);
        assert(found, 2102);
        var p = ps!;
        val creatorHash = p.loadUint(256);
        val participants = p.loadUint(32);
        val success = p.loadUint(8);
        val devClaimed = p.loadUint(8);
        val userRewards = p.loadCoins();
        assert(success != 0 && participants >= 10 && devClaimed == 0, 2103);
        assert(parseStandardAddress(sender).1 == creatorHash, 2104);
        assert(developerRemaining >= DEV_REWARD, 2105);
        developerRemaining -= DEV_REWARD;
        projects.uDictSetBuilder(256, ph, beginCell()
            .storeUint(creatorHash, 256).storeUint(participants, 32).storeUint(success, 8)
            .storeUint(1, 8).storeCoins(userRewards));
        sendVc(sender, DEV_REWARD, qid);
        saveData();
        return;
    }

    if (op == OP_CLAIM_USER) {
        val project = msgBody.loadAddress() as slice;
        val key = keyFor(project, sender);
        var (_, alreadyClaimed) = claimedUsers.sDictGet(512, key);
        assert(!alreadyClaimed, 2110);
        var (cslice, hasContribution) = userContributions.sDictGet(512, key);
        assert(hasContribution, 2111);
        var contribution = cslice!;
        var tonAmount = contribution.loadCoins();
        val maxTon = 10000000000; // 10 TON
        if (tonAmount > maxTon) { tonAmount = maxTon; }
        val reward = tonAmount * 1000;
        val (_, ph) = parseStandardAddress(project);
        var (ps, found) = projects.uDictGet(256, ph);
        assert(found, 2112);
        var p = ps!;
        val creatorHash = p.loadUint(256);
        val participants = p.loadUint(32);
        val success = p.loadUint(8);
        val devClaimed = p.loadUint(8);
        val userRewards = p.loadCoins();
        assert(userRewards + reward <= PROJECT_USER_CAP, 2113);
        assert(ecosystemRemaining >= reward, 2114);
        ecosystemRemaining -= reward;
        claimedUsers.sDictSet(512, key, beginCell().storeUint(1, 8).endCell().beginParse());
        projects.uDictSetBuilder(256, ph, beginCell()
            .storeUint(creatorHash, 256).storeUint(participants, 32).storeUint(success, 8)
            .storeUint(devClaimed, 8).storeCoins(userRewards + reward));
        sendVc(sender, reward, qid);
        saveData();
        return;
    }

    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 2101);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        assert(amount > 0 && amount <= myBalance - 10000000, 2120);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amount)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        return;
    }

    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 2101);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        sendVc(dest, amount, qid);
        return;
    }

    throw 0xffff;
}

get fun getRewardPoolData(): (slice, slice, slice, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, developerRemaining, ecosystemRemaining);
}

get fun getProjectRewardState(project: slice): (int, int, int, int) {
    loadData();
    val (_, ph) = parseStandardAddress(project);
    var (ps, found) = projects.uDictGet(256, ph);
    if (!found) { return (0, 0, 0, 0); }
    var p = ps!;
    p.loadUint(256);
    return (p.loadUint(32), p.loadUint(8), p.loadUint(8), p.loadCoins());
}
