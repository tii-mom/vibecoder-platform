import "@stdlib/tvm-dicts"

const OP_MINT = 21; const OP_BURN = 0x7bdd97de; const OP_ADMIN = 3; const OP_CONTENT = 4;

global totalSupply: int; global adminAddr: slice; global content: cell; global walletCode: cell;

fun loadData() { var ds = contract.getData().beginParse(); totalSupply = ds.loadCoins(); adminAddr = ds.loadAddress(); content = ds.loadRef(); walletCode = ds.loadRef(); ds.assertEndOfSlice(); }
fun saveData() { contract.setData(beginCell().storeCoins(totalSupply).storeSlice(adminAddr).storeRef(content).storeRef(walletCode).endCell()); }
fun getWalletInit(owner: slice): cell { return beginCell().storeUint(6,5).storeRef(walletCode).storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(contract.getAddress()).storeRef(walletCode).endCell()).endCell(); }
fun getWalletAddr(owner: slice): slice { val i = getWalletInit(owner); return beginCell().storeUint(4,3).storeInt(0,8).storeUint(cellHash(i),256).endCell().beginParse(); }

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags())) { return; }
    val s = cs.loadAddress();
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_MINT) {
        assert(isSliceBitsEqual(s, adminAddr), 701);
        val to = msgBody.loadAddress(); val amt = msgBody.loadCoins();
        val resp = msgBody.loadAddress(); val fwd = msgBody.loadCoins(); val pl = msgBody;
        val wa = getWalletAddr(to); val wi = getWalletInit(to);
        val body = beginCell().storeUint(0x178d4519, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(contract.getAddress()).storeSlice(resp).storeCoins(fwd).storeSlice(pl).endCell();
        sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(wa).storeCoins(0)
            .storeUint(1, 1+4+4+64+32+1+1).storeRef(wi).storeRef(body).endCell(), 64);
        totalSupply += amt; saveData();
        return;
    }
    if (op == OP_BURN) {
        val a = msgBody.loadCoins(); val f = msgBody.loadAddress(); val r = msgBody.loadAddress();
        assert(isSliceBitsEqual(s, getWalletAddr(f)), 702);
        totalSupply -= a; saveData();
        if (!addressIsNone(r)) {
            sendRawMessage(beginCell().storeUint(0x10, 6).storeSlice(r).storeCoins(0)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0xd53276db, 32).storeUint(qid, 64).endCell(), 64);
        }
        return;
    }
    if (op == OP_ADMIN) {
        assert(isSliceBitsEqual(s, adminAddr), 701);
        adminAddr = msgBody.loadAddress(); saveData(); return;
    }
    if (op == OP_CONTENT) {
        assert(isSliceBitsEqual(s, adminAddr), 701);
        content = msgBody.loadRef(); saveData(); return;
    }
    throw 0xffff;
}
get getJettonData(): (int, int, slice, cell, cell) {
    loadData(); return (totalSupply, -1, adminAddr, content, walletCode);
}
get getWalletAddress(o: slice): slice {
    loadData(); return getWalletAddr(o);
}
