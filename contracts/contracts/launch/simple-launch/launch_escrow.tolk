fun getContractData(): cell { return contract.getData(); }
fun setContractData(data: cell): void { contract.setData(data); }
fun sendMessage(message: cell, mode: int): void asm "SENDRAWMSG";
fun isMessageBounced(flags: int): int { return flags & 1; }
fun isSliceBitsEqual(a: slice, b: slice): int asm "SDEQ";
fun parseStandardAddress(addr: slice): (int, int) asm "REWRITESTDADDR";
fun now(): int asm "NOW";
fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; }
    return 0;
}

import "@stdlib/tvm-dicts"

const STATE_FUNDING = 1;
const STATE_SUCCESS = 2;
const STATE_FAILED = 3;

const OP_CONTRIBUTE = 1;
const OP_MARK_SUCCESS = 2;
const OP_MARK_FAILED = 3;
const OP_WITHDRAW = 4;
const OP_REFUND = 5;
const OP_PARTICIPATION_NOTIFY = 1;

global campaignAddr: slice;
global projectOwner: slice;
global targetRaiseTon: int;
global hardCapTon: int;
global minContributionTon: int;
global minTotalRaiseTon: int;
global endTime: int;
global state: int;
global totalRaisedTon: int;
global withdrawnTon: int;
global contributions: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    campaignAddr = ds.loadAddress() as slice;
    projectOwner = ds.loadAddress() as slice;
    var params = ds.loadRef().beginParse();
    targetRaiseTon = params.loadCoins();
    hardCapTon = params.loadCoins();
    minContributionTon = params.loadCoins();
    minTotalRaiseTon = params.loadCoins();
    endTime = params.loadUint(32);
    params.assertEnd();
    state = ds.loadUint(8);
    totalRaisedTon = ds.loadCoins();
    withdrawnTon = ds.loadCoins();
    contributions = ds.loadDict();
    ds.assertEnd();
}

fun saveData() {
    val params = beginCell()
        .storeCoins(targetRaiseTon).storeCoins(hardCapTon).storeCoins(minContributionTon)
        .storeCoins(minTotalRaiseTon).storeUint(endTime, 32)
        .endCell();
    setContractData(beginCell()
        .storeSlice(campaignAddr).storeSlice(projectOwner)
        .storeRef(params)
        .storeUint(state, 8).storeCoins(totalRaisedTon).storeCoins(withdrawnTon)
        .storeDict(contributions)
        .endCell());
}

fun sendParticipationNotify(user: slice, contribution: int, qid: int) {
    val body = beginCell()
        .storeUint(OP_PARTICIPATION_NOTIFY, 32).storeUint(qid, 64)
        .storeSlice(user).storeCoins(contribution)
        .endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(campaignAddr).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
}

fun sendTon(to: slice, amount: int) {
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(to).storeCoins(amount)
        .storeUint(0, 1+4+4+64+32+1+1).endCell(), 1);
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_CONTRIBUTE) {
        assert(state == STATE_FUNDING, 6101);
        assert(now() < endTime, 6102);
        val contribution = msgBody.loadCoins();
        assert(contribution >= minContributionTon, 6103);
        assert(msgValue >= contribution, 6104);
        assert(totalRaisedTon + contribution <= hardCapTon, 6105);
        val (_, userHash) = parseStandardAddress(sender);
        var (record, found) = contributions.uDictGet(256, userHash);
        var previous = 0;
        var refunded = 0;
        if (found) {
            var existing = record!;
            previous = existing.loadCoins();
            refunded = existing.loadUint(8);
            assert(refunded == 0, 6106);
        }
        contributions.uDictSetBuilder(256, userHash, beginCell()
            .storeCoins(previous + contribution).storeUint(0, 8));
        totalRaisedTon += contribution;
        sendParticipationNotify(sender, contribution, qid);
        saveData();
        return;
    }

    if (op == OP_MARK_SUCCESS) {
        assert(isSliceBitsEqual(sender, campaignAddr) != 0, 6107);
        assert(state == STATE_FUNDING, 6101);
        state = STATE_SUCCESS;
        saveData();
        return;
    }

    if (op == OP_MARK_FAILED) {
        assert(isSliceBitsEqual(sender, campaignAddr) != 0, 6107);
        assert(state == STATE_FUNDING || state == STATE_SUCCESS, 6101);
        state = STATE_FAILED;
        saveData();
        return;
    }

    if (op == OP_WITHDRAW) {
        assert(isSliceBitsEqual(sender, projectOwner) != 0, 6108);
        assert(state == STATE_SUCCESS, 6109);
        val amount = msgBody.loadCoins();
        assert(amount > 0 && amount <= totalRaisedTon - withdrawnTon, 6110);
        withdrawnTon += amount;
        sendTon(projectOwner, amount);
        saveData();
        return;
    }

    if (op == OP_REFUND) {
        assert(state == STATE_FAILED || (state == STATE_FUNDING && now() >= endTime && totalRaisedTon < minTotalRaiseTon), 6111);
        val (_, userHash) = parseStandardAddress(sender);
        var (record, found) = contributions.uDictGet(256, userHash);
        assert(found, 6112);
        var existing = record!;
        val contribution = existing.loadCoins();
        val refunded = existing.loadUint(8);
        assert(contribution > 0 && refunded == 0, 6113);
        contributions.uDictSetBuilder(256, userHash, beginCell()
            .storeCoins(contribution).storeUint(1, 8));
        sendTon(sender, contribution);
        saveData();
        return;
    }

    throw 0xffff;
}

get fun getLaunchEscrowData(): (slice, slice, int, int, int, int, int, int, int, int) {
    loadData();
    return (campaignAddr, projectOwner, targetRaiseTon, hardCapTon, minContributionTon,
        minTotalRaiseTon, endTime, state, totalRaisedTon, withdrawnTon);
}

get fun getLaunchEscrowContribution(user: slice): (int, int) {
    loadData();
    val (_, userHash) = parseStandardAddress(user);
    var (record, found) = contributions.uDictGet(256, userHash);
    if (!found) { return (0, 0); }
    var existing = record!;
    return (existing.loadCoins(), existing.loadUint(8));
}
