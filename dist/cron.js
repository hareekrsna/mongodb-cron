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
exports.MongoCron = void 0;
const parser = require("cron-parser");
const dot = require("dot-object");
const es6_sleep_1 = require("es6-sleep");
const moment = require("moment-timezone");
moment.tz.setDefault('Asia/Kolkata');
class MongoCron {
    constructor(config) {
        this.running = false;
        this.processing = false;
        this.idle = false;
        this.config = Object.assign({ onDocument: (doc) => doc, onError: console.error, nextDelay: 0, reprocessDelay: 0, idleDelay: 0, lockDuration: 600000, sleepUntilFieldPath: 'sleepUntil', intervalFieldPath: 'interval', repeatUntilFieldPath: 'repeatUntil', autoRemoveFieldPath: 'autoRemove' }, config);
        if (!this.config.timezone) {
            this.parserOptions = {
                utc: true,
            };
        }
        else {
            this.parserOptions = {
                utc: false,
                tz: this.config.timezone,
            };
        }
    }
    getCollection() {
        return typeof this.config.collection === 'function'
            ? this.config.collection()
            : this.config.collection;
    }
    isRunning() {
        return this.running;
    }
    isProcessing() {
        return this.processing;
    }
    isIdle() {
        return this.idle;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.running) {
                this.running = true;
                if (this.config.onStart) {
                    yield this.config.onStart.call(this, this);
                }
                process.nextTick(this.tick.bind(this));
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            this.running = false;
            if (this.processing) {
                yield es6_sleep_1.promise(300);
                return process.nextTick(this.stop.bind(this));
            }
            if (this.config.onStop) {
                yield this.config.onStop.call(this, this);
            }
        });
    }
    tick() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.running) {
                return;
            }
            yield es6_sleep_1.promise(this.config.nextDelay);
            if (!this.running) {
                return;
            }
            this.processing = true;
            try {
                const doc = yield this.lockNext();
                if (!doc) {
                    this.processing = false;
                    if (!this.idle) {
                        this.idle = true;
                        if (this.config.onIdle) {
                            yield this.config.onIdle.call(this, this);
                        }
                    }
                    yield es6_sleep_1.promise(this.config.idleDelay);
                }
                else {
                    this.idle = false;
                    if (this.config.onDocument) {
                        yield this.config.onDocument.call(this, doc, this);
                    }
                    yield this.reschedule(doc);
                    this.processing = false;
                }
            }
            catch (err) {
                yield this.config.onError.call(this, err, this);
            }
            process.nextTick(() => this.tick());
        });
    }
    lockNext() {
        return __awaiter(this, void 0, void 0, function* () {
            const sleepUntil = moment().add(this.config.lockDuration, 'milliseconds').toDate();
            const currentDate = moment().toDate();
            const res = yield this.getCollection().findOneAndUpdate({
                $and: [
                    { [this.config.sleepUntilFieldPath]: { $exists: true, $ne: null } },
                    { [this.config.sleepUntilFieldPath]: { $not: { $gt: currentDate } } },
                    this.config.condition,
                ].filter((c) => !!c),
            }, {
                $set: { [this.config.sleepUntilFieldPath]: sleepUntil },
            }, {
                returnOriginal: true,
            });
            return res.value;
        });
    }
    getNextStart(doc) {
        if (!dot.pick(this.config.intervalFieldPath, doc)) {
            return null;
        }
        const available = moment(dot.pick(this.config.sleepUntilFieldPath, doc));
        const future = moment(available).add(this.config.reprocessDelay, 'milliseconds');
        try {
            const interval = parser.parseExpression(dot.pick(this.config.intervalFieldPath, doc), Object.assign(Object.assign({}, this.parserOptions), { currentDate: future.toDate(), endDate: dot.pick(this.config.repeatUntilFieldPath, doc), iterator: true }));
            const next = interval.next().value.toDate();
            const now = moment().toDate();
            return next < now ? now : next;
        }
        catch (err) {
            return null;
        }
    }
    reschedule(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const nextStart = this.getNextStart(doc);
            const _id = doc._id;
            if (!nextStart && dot.pick(this.config.autoRemoveFieldPath, doc)) {
                yield this.getCollection().deleteOne({ _id });
            }
            else if (!nextStart) {
                yield this.getCollection().updateOne({ _id }, {
                    $set: { [this.config.sleepUntilFieldPath]: null },
                });
            }
            else {
                yield this.getCollection().updateOne({ _id }, {
                    $set: { [this.config.sleepUntilFieldPath]: nextStart },
                });
            }
        });
    }
}
exports.MongoCron = MongoCron;
//# sourceMappingURL=cron.js.map