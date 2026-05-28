import "@stdlib/tvm-dicts"

const OP_SUB = 1;
const OP_WD_VC = 2;
const OP_WD_TON = 3;
const OP_RATE = 4;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global subRate: int;
global totalSub: int;
global subs: cell;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress();
    vcMaster = ds.loadAddress();
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress();
    subRate = ds.loadUint(32);
    totalSub = ds.loadCoins();
    subs = ds.loadDict();
    ds.assertEndOfSlice();
}
fun saveData() {
    setContractData(beginCell().storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode)
        .storeSlice(myWallet).storeUint(subRate, 32).storeCoins(totalSub).storeDict(subs).endCell());
}
fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8)
        .storeUint(cellHash(init), 256).endCell().beginParse();
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags())) { return; }
    val sender = cs.loadAddress();
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    val (_, sh) = parseStandardAddress(sender);
    if (op == OP_SUB) {
        val tonAmt = msgValue;
        assert(tonAmt > 0, 1001);
        val vcAmt = tonAmt * subRate;
        val maxSupply = 45000000000000000;
        assert(totalSub + vcAmt <= maxSupply, 1002);
        var (rs, found) = subs.uDictGet(256, sh);
        var prev = 0;
        if (found) { prev = rs.loadCoins(); }
        subs.uDictSetBuilder(256, sh, beginCell().storeCoins(prev + tonAmt));
        totalSub += vcAmt;
        val wa = calcWallet(sender);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(vcAmt)
            .storeSlice(wa).storeSlice(sender).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        saveData();
        return;
    }
    if (op == OP_WD_VC) {
        assert(isSliceBitsEqual(sender, adminAddr), 1003);
        val amt = msgBody.loadCoins();
        assert(amt > 0, 1004);
        val wa = calcWallet(adminAddr);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(wa).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        return;
    }
    if (op == OP_WD_TON) {
        assert(isSliceBitsEqual(sender, adminAddr), 1003);
        val amt = msgBody.loadCoins();
        assert(amt > 0 && amt <= myBalance - 10000000, 1004);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(adminAddr).storeCoins(amt)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        return;
    }
    if (op == OP_RATE) {
        assert(isSliceBitsEqual(sender, adminAddr), 1003);
        subRate = msgBody.loadUint(32);
        saveData();
        return;
    }
    throw 0xffff;
}
get getSubData(): (slice, slice, slice, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, subRate, totalSub);
}
get getSubscriberTon(sub: slice): int {
    loadData();
    val (_, h) = parseStandardAddress(sub);
    var (rs, found) = subs.uDictGet(256, h);
    if (found) { return rs.loadCoins(); }
    return 0;
}
