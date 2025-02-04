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
const mongodb_1 = require("mongodb");
const __1 = require("..");
const SAMPLE_SIZE = process.argv[2] ? parseInt(process.argv[2]) : 1000;
function testOneTimeJobs(mongo) {
    return __awaiter(this, void 0, void 0, function* () {
        let time = 0;
        const collection = mongo.collection('jobs');
        try {
            yield collection.drop();
        }
        catch (e) { }
        console.log(`> Creating ${SAMPLE_SIZE} documents ...`);
        time = Date.now();
        for (let i = 0; i < SAMPLE_SIZE; i++) {
            yield collection.insertOne({
                sleepUntil: null,
            });
        }
        console.log(`> Done (${Date.now() - time}ms)`);
        console.log('> Processing ...');
        time = Date.now();
        yield new Promise((resolve, reject) => {
            const cron = new __1.MongoCron({
                collection,
                onError: (err) => console.log(err),
                onIdle: () => {
                    cron.stop().then(() => {
                        console.log(`> Done (${Date.now() - time}ms)`);
                        resolve(null);
                    });
                },
                nextDelay: 0,
                reprocessDelay: 0,
                idleDelay: 0,
                lockDuration: 600000,
            });
            cron.start();
        });
    });
}
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const mongo = yield mongodb_1.MongoClient.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });
        yield testOneTimeJobs(mongo.db('test'));
        yield mongo.close();
    });
})().catch(console.error);
//# sourceMappingURL=speedtest.js.map