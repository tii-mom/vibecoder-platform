import "@stdlib/tvm-dicts"

const OP_MINT = 21;
const OP_BURN = 0x7bdd97de;
const OP_ADMIN = 3;
const OP_CONTENT = 4;

global totalSupply: int;
global adminAddr: slice;
global content: cell;
global walletCode: cell;

fun loadData() {
    var ds = getContractData().beginParse();
    totalSupply = ds.loadCoins();
    adminAddr = ds.loadAddress();
    content = ds.loadRef();
    walletCode = ds.loadRef();
    ds.assertEndOfSlice();
}
fun saveData() {
    setContractData(beginCell().storeCoins(totalSupply).storeSlice(adminAddr)
        .storeRef(content).storeRef(walletCode).endCell());
}
fun getWalletInit(owner: slice): cell {
    return beginCell().storeUint(6, 5).storeRef(walletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(getMyAddress()).storeRef(walletCode).endCell())
        .endCell();
}
fun getWalletAddr(owner: slice): slice {
    val init = getWalletInit(owner);
    return beginCell().storeUint(4, 3).storeInt(0, 8)
        .storeUint(cellHash(init), 256).endCell().beginParse();
}
fun mintTokens(qid: int, to: slice, amount: int, resp: slice, fwd: int, payload: slice) {
    val wa = getWalletAddr(to);
    val wi = getWalletInit(to);
    val body = beginCell().storeUint(0x178d4519, 32).storeUint(qid, 64).storeCoins(amount)
        .storeSlice(getMyAddress()).storeSlice(resp).storeCoins(fwd).storeSlice(payload).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(wa).storeCoins(0)
        .storeUint(1, 1+4+4+64+32+1+1).storeRef(wi).storeRef(body).endCell(), 64);
    totalSupply += amount;
    saveData();
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags())) { return; }
    val sender = cs.loadAddress();
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    if (op == OP_MINT) {
        assert(isSliceBitsEqual(sender, adminAddr), 701);
        val to = msgBody.loadAddress();
        val amount = msgBody.loadCoins();
        val resp = msgBody.loadAddress();
        val fwd = msgBody.loadCoins();
        val payload = msgBody;
        mintTokens(qid, to, amount, resp, fwd, payload);
        return;
    }
    if (op == OP_BURN) {
        val amt = msgBody.loadCoins();
        val fromAddr = msgBody.loadAddress();
        val respAddr = msgBody.loadAddress();
        assert(isSliceBitsEqual(sender, getWalletAddr(fromAddr)), 702);
        totalSupply -= amt;
        saveData();
        if (!addressIsNone(respAddr)) {
            sendMessage(beginCell().storeUint(0x10, 6).storeSlice(respAddr).storeCoins(0)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0xd53276db, 32).storeUint(qid, 64).endCell(), 64);
        }
        return;
    }
    if (op == OP_ADMIN) {
        assert(isSliceBitsEqual(sender, adminAddr), 701);
        adminAddr = msgBody.loadAddress();
        saveData();
        return;
    }
    if (op == OP_CONTENT) {
        assert(isSliceBitsEqual(sender, adminAddr), 701);
        content = msgBody.loadRef();
        saveData();
        return;
    }
    throw 0xffff;
}
get getJettonData(): (int, int, slice, cell, cell) {
    loadData();
    return (totalSupply, -1, adminAddr, content, walletCode);
}
get getWalletAddress(owner: slice): slice {
    loadData();
    return getWalletAddr(owner);
}
