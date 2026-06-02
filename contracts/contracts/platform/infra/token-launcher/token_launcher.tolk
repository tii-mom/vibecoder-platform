import "@stdlib/tvm-dicts"

global masterCode: cell; global walletCode: cell;

fun loadData() { var ds=contract.getData().beginParse(); masterCode=ds.loadRef(); walletCode=ds.loadRef(); ds.assertEndOfSlice(); }
fun saveData() { contract.setData(beginCell().storeRef(masterCode).storeRef(walletCode).endCell()); }

fun onInternalMessage(myBalance:int,msgValue:int,msgFull:cell,msgBody:slice) {
    if(msgBody.isEndOfSlice()){return;} var cs=msgFull.beginParse(); if(isMessageBounced(cs.loadMessageFlags())){return;}
    val s=cs.loadAddress(); loadData(); val op=msgBody.loadMessageOp(); val qid=msgBody.loadMessageQueryId();
    if(op==1){ val admin=msgBody.loadAddress(); val content=msgBody.loadRef(); val md=beginCell().storeCoins(0).storeSlice(admin).storeRef(content).storeRef(walletCode).endCell(); val si=beginCell().storeUint(6,5).storeRef(masterCode).storeRef(md).endCell(); val ma=beginCell().storeUint(4,3).storeInt(0,8).storeUint(cellHash(si),256).endCell().beginParse(); sendRawMessage(beginCell().storeUint(0x18,6).storeSlice(ma).storeCoins(50000000).storeUint(1,1+4+4+64+32+1+1).storeRef(si).storeUint(0,32).endCell(),1); sendRawMessage(beginCell().storeUint(0x18,6).storeSlice(s).storeCoins(0).storeUint(0,1+4+4+64+32+1+1).storeUint(1,32).storeUint(qid,64).storeSlice(ma).endCell(),64); return; }
    throw 0xffff;
}
get getLauncherData():(cell,cell){loadData();return(masterCode,walletCode);}
