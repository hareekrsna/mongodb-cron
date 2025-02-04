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
const es6_sleep_1 = require("es6-sleep");
const moment = require("moment");
const mongodb_1 = require("mongodb");
const __1 = require("..");
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const mongo = yield mongodb_1.MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true });
        const db = mongo.db('test');
        const collection = db.collection('jobs');
        const cron = new __1.MongoCron({
            collection,
            onDocument: (doc) => console.log('onDocument', doc),
            onError: (err) => console.log(err),
            onStart: () => console.log('started ...'),
            onStop: () => console.log('stopped'),
            nextDelay: 1000,
            reprocessDelay: 1000,
            idleDelay: 10000,
            lockDuration: 600000,
        });
        yield collection.insertMany([
            { name: 'Job #3',
                sleepUntil: moment().add(3, 'seconds').toDate(),
            },
            { name: 'Job #1',
                sleepUntil: null,
            },
            { name: 'Job #2',
                sleepUntil: moment().add(2, 'seconds').toDate(),
            },
            { name: 'Job #4',
                sleepUntil: moment().add(8, 'seconds').toDate(),
            },
        ]);
        cron.start();
        yield es6_sleep_1.promise(30000);
        cron.stop();
        process.exit(0);
    });
})().catch(console.error);
//# sourceMappingURL=example.js.map