fun getContractData(): cell
    asm "c4 PUSH";

fun setContractData(data: cell): void
    asm "c4 POP";

fun getMyAddress(): slice
    asm "MYADDR";

fun sendMessage(message: cell, mode: int): void
    asm "SENDRAWMSG";

fun addressIsNone(addr: slice): int
    asm "ISNULL";

fun cellHash(data: cell): int
    asm "HASHCU";

fun isMessageBounced(flags: int): int {
    return flags & 1;
}

fun isSliceBitsEqual(a: slice, b: slice): int
    asm "SDEQ";

fun parseStandardAddress(addr: slice): (int, int)
    asm "REWRITESTDADDR";

fun now(): int
    asm "NOW";

fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; } return 0;
}

import "@stdlib/tvm-dicts"

global adminAddr: slice; global masterCode: cell; global walletCode: cell;

fun loadData() { var ds=getContractData().beginParse(); adminAddr=ds.loadAddress() as slice; masterCode=ds.loadRef(); walletCode=ds.loadRef(); ds.assertEnd(); }
fun saveData() { setContractData(beginCell().storeSlice(adminAddr).storeRef(masterCode).storeRef(walletCode).endCell()); }

fun onInternalMessage(myBalance:int,msgValue:int,msgFull:cell,msgBody:slice) {
    if(isEndOfSlice(msgBody) != 0){return;} var cs=msgFull.beginParse(); if(isMessageBounced(cs.loadMessageFlags()) != 0){return;}
    val s=cs.loadAddress() as slice; loadData(); val op=msgBody.loadMessageOp(); val qid=msgBody.loadMessageQueryId();
    if(op==1){ val admin=msgBody.loadAddress() as slice; val content=msgBody.loadRef(); val md=beginCell().storeCoins(0).storeSlice(admin).storeRef(content).storeRef(walletCode).endCell(); val si=beginCell().storeUint(6,5).storeRef(masterCode).storeRef(md).endCell(); val ma=beginCell().storeUint(4,3).storeInt(0,8).storeUint(cellHash(si),256).endCell().beginParse(); sendMessage(beginCell().storeUint(0x18,6).storeSlice(ma).storeCoins(50000000).storeUint(0,1+4+4+64+32).storeBool(true).storeBool(true).storeRef(si).storeBool(false).endCell(),1); sendMessage(beginCell().storeUint(0x18,6).storeSlice(s).storeCoins(0).storeUint(0,1+4+4+64+32+1+1).storeUint(1,32).storeUint(qid,64).storeSlice(ma).endCell(),64); return; }
    if(op==2){ assert(isSliceBitsEqual(s, adminAddr) != 0, 1201); val dest=msgBody.loadAddress() as slice; val amt=msgBody.loadCoins(); assert(amt>0 && amt<=myBalance-10000000,1202); sendMessage(beginCell().storeUint(0x10,6).storeSlice(dest).storeCoins(amt).storeUint(0,1+4+4+64+32+1+1).storeUint(0,32).endCell(),1); return; }
    throw 0xffff;
}
get fun getLauncherData():(slice,cell,cell){loadData();return(adminAddr,masterCode,walletCode);}
