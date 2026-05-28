import "@stdlib/tvm-dicts"

global balance: int; global ownerAddr: slice; global masterAddr: slice; global walletCode: cell;

fun loadData() { var ds = getContractData().beginParse(); balance = ds.loadCoins(); ownerAddr = ds.loadAddress(); masterAddr = ds.loadAddress(); walletCode = ds.loadRef(); ds.assertEndOfSlice(); }
fun saveData() { setContractData(beginCell().storeCoins(balance).storeSlice(ownerAddr).storeSlice(masterAddr).storeRef(walletCode).endCell()); }
fun getWalletInit(owner: slice): cell { return beginCell().storeUint(6, 5).storeRef(walletCode).storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(masterAddr).storeRef(walletCode).endCell()).endCell(); }
fun getWalletAddr(owner: slice): slice { val i = getWalletInit(owner); return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(i), 256).endCell().beginParse(); }

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags())) { return; }
    val s = cs.loadAddress();
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == 0x0f8a7ea5) {
        val a = msgBody.loadCoins(); val d = msgBody.loadAddress(); val r = msgBody.loadAddress();
        msgBody.loadMaybeRef(); val f = msgBody.loadCoins(); val fp = msgBody;
        assert(isSliceBitsEqual(s, ownerAddr), 701); assert(balance >= a, 702);
        balance -= a; saveData();
        val wa = getWalletAddr(d); val wi = getWalletInit(d);
        val body = beginCell().storeUint(0x178d4519, 32).storeUint(qid, 64).storeCoins(a)
            .storeSlice(ownerAddr).storeSlice(r).storeCoins(f).storeSlice(fp).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(wa).storeCoins(0)
            .storeUint(1, 1+4+4+64+32+1+1).storeRef(wi).storeRef(body).endCell(), 64);
        return;
    }
    if (op == 0x178d4519) {
        val a = msgBody.loadCoins(); val fr = msgBody.loadAddress();
        val r = msgBody.loadAddress(); val f = msgBody.loadCoins(); val fp = msgBody;
        assert(isSliceBitsEqual(s, getWalletAddr(fr)) || isSliceBitsEqual(s, masterAddr), 705);
        balance += a; saveData();
        if (f > 0) {
            sendMessage(beginCell().storeUint(0x18, 6).storeSlice(ownerAddr).storeCoins(f)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0x7362d09c, 32).storeUint(qid, 64)
                .storeCoins(a).storeSlice(fr).storeSlice(fp).endCell(), 1);
        }
        val ex = msgValue - f - 10000000;
        if (ex > 0 && !addressIsNone(r)) {
            sendMessage(beginCell().storeUint(0x10, 6).storeSlice(r).storeCoins(ex)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0xd53276db, 32).storeUint(qid, 64).endCell(), 2);
        }
        return;
    }
    if (op == 0x595f07bc) {
        val a = msgBody.loadCoins(); val r = msgBody.loadAddress();
        assert(isSliceBitsEqual(s, ownerAddr), 706); assert(balance >= a, 707);
        balance -= a; saveData();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(masterAddr).storeCoins(0)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0x7bdd97de, 32).storeUint(qid, 64)
            .storeCoins(a).storeSlice(ownerAddr).storeSlice(r).endCell(), 64);
        return;
    }
    throw 0xffff;
}
get getWalletData(): (int, slice, slice, cell) {
    loadData(); return (balance, ownerAddr, masterAddr, walletCode);
}
