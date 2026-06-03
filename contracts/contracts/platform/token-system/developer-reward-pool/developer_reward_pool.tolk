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

const OP_REGISTER_PROJECT = 1;
const OP_CLAIM = 2;
const OP_WITHDRAW_VC = 3;

const DEV_REWARD = 5000000000000;       // 5,000 VC
const POOL_CAP = 100000000000000000;    // 100,000,000 VC

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global remaining: int;
global totalClaimed: int;
global projectCount: int;
global projects: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    remaining = ds.loadCoins();
    totalClaimed = ds.loadCoins();
    projectCount = ds.loadUint(32);
    projects = ds.loadDict();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode).storeSlice(myWallet)
        .storeCoins(remaining).storeCoins(totalClaimed).storeUint(projectCount, 32)
        .storeDict(projects)
        .endCell());
}

fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
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

    if (op == OP_REGISTER_PROJECT) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3101);
        val project = msgBody.loadAddress() as slice;
        val creator = msgBody.loadAddress() as slice;
        val participants = msgBody.loadUint(32);
        assert(participants >= 5, 3102);
        val (_, ph) = parseStandardAddress(project);
        var (_, exists) = projects.uDictGet(256, ph);
        assert(!exists, 3103);
        projects.uDictSetBuilder(256, ph, beginCell()
            .storeUint(parseStandardAddress(creator).1, 256)
            .storeUint(participants, 32)
            .storeUint(0, 8)
            .storeCoins(DEV_REWARD)
            .storeUint(0, 64));
        projectCount += 1;
        saveData();
        return;
    }

    if (op == OP_CLAIM) {
        val project = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(project);
        var (ps, found) = projects.uDictGet(256, ph);
        assert(found, 3104);
        var p = ps!;
        val creatorHash = p.loadUint(256);
        val participants = p.loadUint(32);
        val claimed = p.loadUint(8);
        val amount = p.loadCoins();
        assert(participants >= 5 && claimed == 0, 3105);
        assert(parseStandardAddress(sender).1 == creatorHash, 3106);
        assert(remaining >= amount && totalClaimed + amount <= POOL_CAP, 3107);
        remaining -= amount;
        totalClaimed += amount;
        projects.uDictSetBuilder(256, ph, beginCell()
            .storeUint(creatorHash, 256).storeUint(participants, 32).storeUint(1, 8)
            .storeCoins(amount).storeUint(now(), 64));
        sendVc(sender, amount, qid);
        saveData();
        return;
    }

    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3101);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        sendVc(dest, amount, qid);
        return;
    }

    throw 0xffff;
}

get fun getDeveloperPoolData(): (slice, slice, slice, int, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, remaining, totalClaimed, projectCount);
}

get fun getProjectDeveloperReward(project: slice): (int, int, int, int) {
    loadData();
    val (_, ph) = parseStandardAddress(project);
    var (ps, found) = projects.uDictGet(256, ph);
    if (!found) { return (0, 0, 0, 0); }
    var p = ps!;
    p.loadUint(256);
    return (p.loadUint(32), p.loadUint(8), p.loadCoins(), p.loadUint(64));
}

get fun hasDeveloperClaimed(project: slice): int {
    loadData();
    val (_, ph) = parseStandardAddress(project);
    var (ps, found) = projects.uDictGet(256, ph);
    if (!found) { return 0; }
    var p = ps!;
    p.loadUint(256);
    p.loadUint(32);
    return p.loadUint(8);
}
