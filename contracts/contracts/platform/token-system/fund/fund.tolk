import "@stdlib/tvm-dicts"

const OP_INVEST = 1;
const OP_ADD = 2;
const OP_REMOVE = 3;
const OP_WITHDRAW_TON = 4;
const OP_WITHDRAW_TOKEN = 5;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global allowedProjects: cell;
global projectTokens: cell;
global accumulatedTon: int;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress();
    vcMaster = ds.loadAddress();
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress();
    allowedProjects = ds.loadDict();
    projectTokens = ds.loadDict();
    accumulatedTon = ds.loadCoins();
    ds.assertEndOfSlice();
}
fun saveData() {
    setContractData(beginCell().storeSlice(adminAddr).storeSlice(vcMaster)
        .storeRef(vcWalletCode).storeSlice(myWallet).storeDict(allowedProjects)
        .storeDict(projectTokens).storeCoins(accumulatedTon).endCell());
}
fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8)
        .storeUint(cellHash(init), 256).endCell().beginParse();
}
fun hashToSlice(h: int): slice {
    return beginCell().storeUint(h, 256).endCell().beginParse();
}
fun isAllowed(hash: int): int {
    var (_, found) = allowedProjects.sDictGet(256, hashToSlice(hash));
    return found;
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) {
        accumulatedTon += msgValue;
        saveData();
        return;
    }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags())) { return; }
    val sender = cs.loadAddress();
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    if (op == 0) {
        val amt = msgBody.loadCoins();
        val (_, th) = parseStandardAddress(sender);
        var (rs, found) = projectTokens.uDictGet(256, th);
        var bal = 0;
        if (found) { bal = rs.loadCoins(); }
        projectTokens.uDictSetBuilder(256, th, beginCell().storeCoins(bal + amt));
        saveData();
        return;
    }
    if (op == OP_ADD) {
        assert(isSliceBitsEqual(sender, adminAddr), 801);
        val (_, ph) = parseStandardAddress(msgBody.loadAddress());
        allowedProjects.sDictSet(256, hashToSlice(ph), beginCell().endCell().beginParse());
        saveData();
        return;
    }
    if (op == OP_REMOVE) {
        assert(isSliceBitsEqual(sender, adminAddr), 801);
        val (_, ph) = parseStandardAddress(msgBody.loadAddress());
        allowedProjects.sDictDelete(256, hashToSlice(ph));
        saveData();
        return;
    }
    if (op == OP_INVEST) {
        assert(isSliceBitsEqual(sender, adminAddr), 801);
        val dest = msgBody.loadAddress();
        val amt = msgBody.loadCoins();
        assert(amt > 0, 803);
        val (_, dh) = parseStandardAddress(dest);
        assert(isAllowed(dh), 802);
        val wa = calcWallet(dest);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(wa).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        return;
    }
    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr), 801);
        val amt = msgBody.loadCoins();
        val dest = msgBody.loadAddress();
        assert(amt > 0 && amt <= myBalance - 10000000, 804);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amt)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        accumulatedTon -= amt;
        saveData();
        return;
    }
    if (op == OP_WITHDRAW_TOKEN) {
        assert(isSliceBitsEqual(sender, adminAddr), 801);
        val tokenMaster = msgBody.loadAddress();
        val amt = msgBody.loadCoins();
        val dest = msgBody.loadAddress();
        val (_, th) = parseStandardAddress(tokenMaster);
        var (rs, found) = projectTokens.uDictGet(256, th);
        assert(found, 805);
        val bal = rs.loadCoins();
        assert(amt > 0 && amt <= bal, 806);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(dest).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(dest).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        val nb = bal - amt;
        if (nb > 0) {
            projectTokens.uDictSetBuilder(256, th, beginCell().storeCoins(nb));
        } else {
            projectTokens.uDictDelete(256, th);
        }
        saveData();
        return;
    }
    throw 0xffff;
}
get getFundData(): (slice, slice, slice, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, accumulatedTon);
}
get isProjectWhitelisted(project: slice): int {
    loadData();
    val (_, ph) = parseStandardAddress(project);
    return isAllowed(ph);
}
get getProjectTokenBalance(tokenMaster: slice): int {
    loadData();
    val (_, th) = parseStandardAddress(tokenMaster);
    var (rs, found) = projectTokens.uDictGet(256, th);
    if (found) { return rs.loadCoins(); }
    return 0;
}
