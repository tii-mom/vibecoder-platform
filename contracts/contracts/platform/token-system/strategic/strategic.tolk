import "@stdlib/tvm-dicts"

const OP_TRANSFER = 1;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;

fun loadData() {
    var ds = contract.getData().beginParse();
    adminAddr = ds.loadAddress();
    vcMaster = ds.loadAddress();
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress();
    ds.assertEndOfSlice();
}
fun saveData() {
    contract.setData(beginCell().storeSlice(adminAddr).storeSlice(vcMaster)
        .storeRef(vcWalletCode).storeSlice(myWallet).endCell());
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
    if (op == OP_TRANSFER) {
        assert(isSliceBitsEqual(sender, adminAddr), 901);
        val dest = msgBody.loadAddress();
        val amt = msgBody.loadCoins();
        assert(amt > 0, 902);
        val wa = calcWallet(dest);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(wa).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        return;
    }
    throw 0xffff;
}
get getStrategicData(): (slice, slice, slice) {
    loadData();
    return (adminAddr, vcMaster, myWallet);
}
