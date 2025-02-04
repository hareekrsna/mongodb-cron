"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const spec_1 = require("@hayspec/spec");
const es6_sleep_1 = require("es6-sleep");
const moment = require("moment");
const mongodb_1 = require("mongodb");
const __1 = require("..");
const spec = new spec_1.Spec();
spec.before((stage) => __awaiter(void 0, void 0, void 0, function* () {
    const mongo = yield mongodb_1.MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongo.db('test');
    const collection = db.collection('jobs');
    stage.set('mongo', mongo);
    stage.set('db', db);
    stage.set('collection', collection);
}));
spec.beforeEach((ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const collection = ctx.get('collection');
    yield collection.drop().catch(() => { });
}));
spec.after((stage) => __awaiter(void 0, void 0, void 0, function* () {
    const mongo = stage.get('mongo');
    yield mongo.close();
}));
spec.test('document with `sleepUntil` should be processed', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let times = 0;
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        onDocument: () => times++,
    });
    yield collection.insertMany([
        { sleepUntil: new Date() },
        { sleepUntil: new Date() },
        { sleepUntil: null },
        { sleepUntil: new Date() },
    ]);
    yield cron.start();
    yield es6_sleep_1.promise(3000);
    yield cron.stop();
    ctx.is(times, 3);
    ctx.is(yield collection.countDocuments({ sleepUntil: { $ne: null } }), 0);
}));
spec.test('cron should trigger event methods', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let onStart = false;
    let onStop = false;
    let onDocument = false;
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        onStart: () => __awaiter(void 0, void 0, void 0, function* () { return onStart = true; }),
        onStop: () => __awaiter(void 0, void 0, void 0, function* () { return onStop = true; }),
        onDocument: (doc) => __awaiter(void 0, void 0, void 0, function* () { return onDocument = true; }),
    });
    yield collection.insertOne({
        sleepUntil: new Date(),
    });
    yield cron.start();
    yield es6_sleep_1.promise(300);
    yield cron.stop();
    yield es6_sleep_1.promise(100);
    ctx.is(onStart, true);
    ctx.is(onStop, true);
    ctx.is(onDocument, true);
}));
spec.test('cron should trigger the `onIdle` handler only once', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let count = 0;
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        onIdle: () => count++,
    });
    yield cron.start();
    yield es6_sleep_1.promise(1000);
    yield cron.stop();
    ctx.is(count, 1);
}));
spec.test('locked documents should not be available for locking', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let processed = false;
    const future = moment().add(5000, 'milliseconds');
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 5000,
        onDocument: () => processed = true,
    });
    yield collection.insertOne({
        sleepUntil: future.toDate(),
    });
    yield cron.start();
    yield es6_sleep_1.promise(500);
    yield cron.stop();
    ctx.is(processed, false);
}));
spec.test('recurring documents should be unlocked when prossed', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let processed = 0;
    const now = moment();
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 60000,
        onDocument: () => {
            processed++;
            return es6_sleep_1.promise(2000);
        },
    });
    yield collection.insertOne({
        sleepUntil: now.toDate(),
        interval: '* * * * * *',
    });
    yield cron.start();
    yield es6_sleep_1.promise(6000);
    yield cron.stop();
    ctx.is(processed, 3);
}));
spec.test('recurring documents should process from current date', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let processed = 0;
    const past = moment().subtract(10, 'days');
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        onDocument: () => processed++,
    });
    yield collection.insertOne({
        sleepUntil: past.toDate(),
        interval: '* * * * * *',
    });
    yield cron.start();
    yield es6_sleep_1.promise(2000);
    yield cron.stop();
    ctx.true(processed <= 4);
}));
spec.test('condition should filter lockable documents', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let count = 0;
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        condition: { handle: true },
        onDocument: () => count++,
    });
    yield collection.insertOne({
        handle: true,
        sleepUntil: new Date(),
    });
    yield collection.insertOne({
        sleepUntil: new Date(),
    });
    yield cron.start();
    yield es6_sleep_1.promise(4000);
    yield cron.stop();
    ctx.is(count, 1);
}));
spec.test('document processing should not start before `sleepUntil`', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let ranInFuture = false;
    const future = moment().add(3000, 'milliseconds');
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        onDocument: (doc) => __awaiter(void 0, void 0, void 0, function* () { return ranInFuture = moment() >= future; }),
    });
    yield cron.start();
    yield collection.insertOne({
        sleepUntil: future.toDate(),
    });
    yield es6_sleep_1.promise(4000);
    yield cron.stop();
    ctx.is(ranInFuture, true);
}));
spec.test('document with `interval` should run repeatedly', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let repeated = 0;
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        onDocument: (doc) => __awaiter(void 0, void 0, void 0, function* () {
            repeated++;
        }),
    });
    yield cron.start();
    yield collection.insertOne({
        sleepUntil: new Date(),
        interval: '* * * * * *',
    });
    yield es6_sleep_1.promise(3100);
    yield cron.stop();
    ctx.is(repeated >= 3, true);
}));
spec.test('document should stop recurring at `repeatUntil`', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let repeated = moment();
    const stop = moment().add(2500, 'milliseconds');
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
        onDocument: (doc) => __awaiter(void 0, void 0, void 0, function* () { return repeated = moment(); }),
        reprocessDelay: 1000,
    });
    yield cron.start();
    yield collection.insertOne({
        sleepUntil: new Date(),
        interval: '* * * * * *',
        repeatUntil: stop.toDate(),
    });
    yield es6_sleep_1.promise(6000);
    yield cron.stop();
    ctx.is(repeated.isAfter(stop), false);
}));
spec.test('document with `autoRemove` should be deleted when completed', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const collection = ctx.get('collection');
    const cron = new __1.MongoCron({
        collection,
        lockDuration: 0,
    });
    yield cron.start();
    yield collection.insertOne({
        sleepUntil: new Date(),
        autoRemove: true,
    });
    yield es6_sleep_1.promise(2000);
    yield cron.stop();
    ctx.is(yield collection.countDocuments(), 0);
}));
exports.default = spec;
//# sourceMappingURL=cron.test.js.map