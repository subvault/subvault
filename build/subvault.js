"use strict";

var _yargsParser = _interopRequireDefault(require("yargs-parser"));

var _util = require("@polkadot/util");

var _keyring = _interopRequireDefault(require("@polkadot/keyring"));

var _bn = _interopRequireDefault(require("bn.js"));

var _db = require("./db");

var _serverline = _interopRequireDefault(require("./serverline"));

var _config = _interopRequireDefault(require("./api/config"));

var _api = require("./api");

var _console = require("console");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

_serverline["default"].init({});

function handleArgv(argv, handlers) {
  var _iterator = _createForOfIteratorHelper(handlers),
      _step;

  try {
    var _loop = function _loop() {
      var handler = _step.value;
      var matched = true;
      var matchArgIndex = 0;
      var matchedValue = {};
      var handlerCommand = handler.command;

      if (typeof handlerCommand === "string") {
        handlerCommand = handlerCommand.split(" ");
      }

      handlerCommand.forEach(function (commandItem) {
        if (!matched) {
          return;
        }

        if (commandItem.startsWith("<") && commandItem.endsWith(">")) {
          if (matchArgIndex >= argv["_"].length) {
            matched = false;
            return;
          }

          var commandName = commandItem.substring(1, commandItem.length - 1);
          matchedValue[commandName] = argv["_"][matchArgIndex];
          matchArgIndex += 1;
        } else if (commandItem.startsWith("[") && commandItem.endsWith("]")) {
          if (matchArgIndex >= argv["_"].length) {
            return;
          }

          var _commandName = commandItem.substring(1, commandItem.length - 1);

          matchedValue[_commandName] = argv["_"][matchArgIndex];
          matchArgIndex += 1;
        } else {
          if (matchArgIndex >= argv["_"].length) {
            matched = false;
            return;
          }

          if (commandItem !== argv["_"][matchArgIndex]) {
            matched = false;
            return;
          }

          matchArgIndex += 1;
        }
      });

      if (matchArgIndex !== argv["_"].length) {
        matched = false;
      }

      if (matched) {
        return {
          v: handler.handle(matchedValue)
        };
      }
    };

    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _ret = _loop();

      if (_typeof(_ret) === "object") return _ret.v;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  console.log("Invalid command");
}

;

function formatCall(indentation, call) {
  var indentString = " ".repeat(indentation);

  if (call.toRawType && call.toRawType() === "Extrinsic") {
    console.log(indentString + "".concat(call.method.method.toString(), ".").concat(call.method.section.toString()));

    var _iterator2 = _createForOfIteratorHelper(call.method.args),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var arg = _step2.value;
        formatCall(indentation + 2, arg);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  } else if (call.toRawType && call.toRawType() === "Call") {
    console.log(indentString + "".concat(call.method.toString(), ".").concat(call.section.toString()));

    var _iterator3 = _createForOfIteratorHelper(call.args),
        _step3;

    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _arg = _step3.value;
        formatCall(indentation + 2, _arg);
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
  } else if (call.toRawType && (call.toRawType() === "Balance" || call.toRawType() === "Compact<Balance>")) {
    console.log(indentString + (0, _util.formatBalance)(call));
  } else if (call.toRawType && call.toRawType().startsWith("Vec")) {
    console.log(indentString + "-");
    call.forEach(function (element) {
      formatCall(indentation + 2, element);
    });
  } else if (Array.isArray(call)) {
    console.log(indentString + "-");

    for (var _arg2 in call) {
      formatCall(indentation + 2, _arg2);
    }
  } else {
    console.log(indentString + call.toString());
  }
}

function signCallUsing(_x, _x2, _x3) {
  return _signCallUsing.apply(this, arguments);
}

function _signCallUsing() {
  _signCallUsing = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(control, call, accountName) {
    var api, db, keyring, wallet, pair, passphrase;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            api = control.api, db = control.db, keyring = control.keyring;
            wallet = db.accounts[accountName];
            (0, _console.assert)(wallet.type === "polkadotjs");
            pair = keyring.createFromJson(wallet.data);
            formatCall(0, call);
            console.log("Signing the above extrinsic using ".concat(accountName, " (").concat(wallet.address, ")."));
            _context.next = 8;
            return _serverline["default"].secret("Enter the passphrase: ");

          case 8:
            passphrase = _context.sent;
            pair.unlock(passphrase);
            _context.next = 12;
            return call.signAndSend(pair, {
              nonce: -1
            });

          case 12:
            pair.lock();

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _signCallUsing.apply(this, arguments);
}

function processCommand(_x4, _x5) {
  return _processCommand.apply(this, arguments);
}

function _processCommand() {
  _processCommand = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(control, argv) {
    var api, db, keyring;
    return regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            api = control.api, db = control.db, keyring = control.keyring;
            _context12.next = 3;
            return handleArgv(argv, [{
              command: "wallet add external <name> <address>",
              handle: function () {
                var _handle = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(matched) {
                  var address, name, data;
                  return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                      switch (_context2.prev = _context2.next) {
                        case 0:
                          address = matched.address;
                          name = matched.name;
                          data = {
                            address: matched.address
                          };
                          db.insertAccount(name, "external", data);
                          db.addTag(name, "owned");
                          console.log("Imported external wallet ".concat(address));

                        case 6:
                        case "end":
                          return _context2.stop();
                      }
                    }
                  }, _callee2);
                }));

                function handle(_x6) {
                  return _handle.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "wallet add polkadotjs <json>",
              handle: function () {
                var _handle2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(matched) {
                  var data, pair, passphrase, name, address;
                  return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          data = JSON.parse(matched.json);
                          pair = keyring.createFromJson(data);
                          _context3.next = 4;
                          return _serverline["default"].secret("Enter passphrase: ");

                        case 4:
                          passphrase = _context3.sent;
                          pair.unlock(passphrase);
                          name = pair.meta.name;
                          address = pair.address.toString();
                          db.insertAccount(name, "polkadotjs", data);
                          db.addTag(name, "owned");
                          console.log("Imported polkadotjs wallet ".concat(address));

                        case 11:
                        case "end":
                          return _context3.stop();
                      }
                    }
                  }, _callee3);
                }));

                function handle(_x7) {
                  return _handle2.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "wallet remove <name>",
              handle: function () {
                var _handle3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(matched) {
                  return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                      switch (_context4.prev = _context4.next) {
                        case 0:
                          db.deleteAccount(matched.name);
                          console.log("Deleted wallet ".concat(matched.name));

                        case 2:
                        case "end":
                          return _context4.stop();
                      }
                    }
                  }, _callee4);
                }));

                function handle(_x8) {
                  return _handle3.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "addressbook add <name> <address>",
              handle: function () {
                var _handle4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(matched) {
                  var address, name, data;
                  return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                      switch (_context5.prev = _context5.next) {
                        case 0:
                          address = matched.address;
                          name = matched.name;
                          data = {
                            address: matched.address
                          };
                          db.insertAccount(name, "external", data);
                          db.addTag(name, "addressbook");
                          console.log("Added addressbook ".concat(address));

                        case 6:
                        case "end":
                          return _context5.stop();
                      }
                    }
                  }, _callee5);
                }));

                function handle(_x9) {
                  return _handle4.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "addressbook remove <name>",
              handle: function () {
                var _handle5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(matched) {
                  return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          db.deleteAccount(matched.name);
                          console.log("Deleted addressbook ".concat(matched.name));

                        case 2:
                        case "end":
                          return _context6.stop();
                      }
                    }
                  }, _callee6);
                }));

                function handle(_x10) {
                  return _handle5.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "balance [address]",
              handle: function () {
                var _handle6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(matched) {
                  var wallet, account, balanceTotal, _account, _balanceTotal, wallets, _i, _Object$keys, walletName, _wallet, _account2, _balanceTotal2;

                  return regeneratorRuntime.wrap(function _callee7$(_context7) {
                    while (1) {
                      switch (_context7.prev = _context7.next) {
                        case 0:
                          if (!matched.address) {
                            _context7.next = 17;
                            break;
                          }

                          wallet = db.accounts[matched.address];

                          if (!wallet) {
                            _context7.next = 10;
                            break;
                          }

                          _context7.next = 5;
                          return api.derive.balances.all(wallet.address);

                        case 5:
                          account = _context7.sent;
                          balanceTotal = account.freeBalance.add(account.reservedBalance);
                          console.log("".concat(wallet.name, " (").concat(wallet.address, "): ").concat((0, _util.formatBalance)(balanceTotal)));
                          _context7.next = 15;
                          break;

                        case 10:
                          _context7.next = 12;
                          return api.derive.balances.all(matched.address);

                        case 12:
                          _account = _context7.sent;
                          _balanceTotal = _account.freeBalance.add(_account.reservedBalance);
                          console.log("".concat(matched.address, ": ").concat((0, _util.formatBalance)(_balanceTotal)));

                        case 15:
                          _context7.next = 30;
                          break;

                        case 17:
                          wallets = db.accountsByTag("owned");
                          _i = 0, _Object$keys = Object.keys(wallets);

                        case 19:
                          if (!(_i < _Object$keys.length)) {
                            _context7.next = 30;
                            break;
                          }

                          walletName = _Object$keys[_i];
                          _wallet = wallets[walletName];
                          _context7.next = 24;
                          return api.derive.balances.all(_wallet.address);

                        case 24:
                          _account2 = _context7.sent;
                          _balanceTotal2 = _account2.freeBalance.add(_account2.reservedBalance);
                          console.log("".concat(_wallet.name, " (").concat(_wallet.address, "): ").concat((0, _util.formatBalance)(_balanceTotal2)));

                        case 27:
                          _i++;
                          _context7.next = 19;
                          break;

                        case 30:
                        case "end":
                          return _context7.stop();
                      }
                    }
                  }, _callee7);
                }));

                function handle(_x11) {
                  return _handle6.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "payout list",
              handle: function () {
                var _handle7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(matched) {
                  var wallets, stashes, stashAddresses, _i2, _Object$keys2, walletName, allEras, stakerRewards, _iterator4, _step4, _step4$value, index, stakerReward, stash, _iterator5, _step5, reward;

                  return regeneratorRuntime.wrap(function _callee8$(_context8) {
                    while (1) {
                      switch (_context8.prev = _context8.next) {
                        case 0:
                          wallets = db.accountsByTag("owned");
                          stashes = [];
                          stashAddresses = [];

                          for (_i2 = 0, _Object$keys2 = Object.keys(wallets); _i2 < _Object$keys2.length; _i2++) {
                            walletName = _Object$keys2[_i2];
                            stashes.push(wallets[walletName]);
                            stashAddresses.push(wallets[walletName].address);
                          }

                          _context8.next = 6;
                          return api.derive.staking.erasHistoric(true);

                        case 6:
                          allEras = _context8.sent;
                          _context8.next = 9;
                          return api.derive.staking.stakerRewardsMulti(stashAddresses, false);

                        case 9:
                          stakerRewards = _context8.sent;
                          _iterator4 = _createForOfIteratorHelper(stakerRewards.entries());

                          try {
                            for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                              _step4$value = _slicedToArray(_step4.value, 2), index = _step4$value[0], stakerReward = _step4$value[1];
                              stash = stashes[index];
                              console.log("Staking rewards for stash ".concat(stash.name, " (").concat(stash.address, "):"));
                              _iterator5 = _createForOfIteratorHelper(stakerReward);

                              try {
                                for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
                                  reward = _step5.value;
                                  console.log("Era: ".concat(reward.era.toString(), ", Total reward: ").concat((0, _util.formatBalance)(reward.eraReward)));
                                }
                              } catch (err) {
                                _iterator5.e(err);
                              } finally {
                                _iterator5.f();
                              }

                              console.log();
                            }
                          } catch (err) {
                            _iterator4.e(err);
                          } finally {
                            _iterator4.f();
                          }

                        case 12:
                        case "end":
                          return _context8.stop();
                      }
                    }
                  }, _callee8);
                }));

                function handle(_x12) {
                  return _handle7.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "payout execute using <address>",
              handle: function () {
                var _handle8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(matched) {
                  var wallets, stashes, stashAddresses, _i3, _Object$keys3, walletName, allEras, stakerRewards, claims, _iterator6, _step6, _step6$value, index, stakerReward, stash, _iterator8, _step8, reward, calls, _i4, _Object$keys4, stashAddress, _iterator7, _step7, era, CHUNK, i, currentCalls, multiCall;

                  return regeneratorRuntime.wrap(function _callee9$(_context9) {
                    while (1) {
                      switch (_context9.prev = _context9.next) {
                        case 0:
                          wallets = db.accountsByTag("owned");
                          stashes = [];
                          stashAddresses = [];

                          for (_i3 = 0, _Object$keys3 = Object.keys(wallets); _i3 < _Object$keys3.length; _i3++) {
                            walletName = _Object$keys3[_i3];
                            stashes.push(wallets[walletName]);
                            stashAddresses.push(wallets[walletName].address);
                          }

                          _context9.next = 6;
                          return api.derive.staking.erasHistoric(true);

                        case 6:
                          allEras = _context9.sent;
                          _context9.next = 9;
                          return api.derive.staking.stakerRewardsMulti(stashAddresses, false);

                        case 9:
                          stakerRewards = _context9.sent;
                          claims = {};
                          _iterator6 = _createForOfIteratorHelper(stakerRewards.entries());

                          try {
                            for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
                              _step6$value = _slicedToArray(_step6.value, 2), index = _step6$value[0], stakerReward = _step6$value[1];
                              stash = stashes[index];
                              _iterator8 = _createForOfIteratorHelper(stakerReward);

                              try {
                                for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
                                  reward = _step8.value;
                                  claims[stash.address] = claims[stash.address] || [];
                                  claims[stash.address].push(reward.era);
                                }
                              } catch (err) {
                                _iterator8.e(err);
                              } finally {
                                _iterator8.f();
                              }
                            }
                          } catch (err) {
                            _iterator6.e(err);
                          } finally {
                            _iterator6.f();
                          }

                          calls = [];

                          for (_i4 = 0, _Object$keys4 = Object.keys(claims); _i4 < _Object$keys4.length; _i4++) {
                            stashAddress = _Object$keys4[_i4];
                            _iterator7 = _createForOfIteratorHelper(claims[stashAddress]);

                            try {
                              for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
                                era = _step7.value;
                                calls.push(api.tx.staking.payoutStakers(stashAddress, era));
                              }
                            } catch (err) {
                              _iterator7.e(err);
                            } finally {
                              _iterator7.f();
                            }
                          }

                          CHUNK = 5;
                          i = 0;

                        case 17:
                          if (!(i < calls.length)) {
                            _context9.next = 25;
                            break;
                          }

                          currentCalls = calls.slice(i, i + CHUNK);
                          multiCall = api.tx.utility.batch(currentCalls);
                          _context9.next = 22;
                          return signCallUsing(control, multiCall, matched.address);

                        case 22:
                          i += CHUNK;
                          _context9.next = 17;
                          break;

                        case 25:
                          console.log("Finished payout execution.");

                        case 26:
                        case "end":
                          return _context9.stop();
                      }
                    }
                  }, _callee9);
                }));

                function handle(_x13) {
                  return _handle8.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "transfer from <from> to <to> value <value>",
              handle: function () {
                var _handle9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(matched) {
                  var to, wallet, value, call;
                  return regeneratorRuntime.wrap(function _callee10$(_context10) {
                    while (1) {
                      switch (_context10.prev = _context10.next) {
                        case 0:
                          wallet = db.accounts[matched.to];

                          if (wallet) {
                            to = wallet.address;
                          } else {
                            to = matched.to;
                          }

                          value = new _bn["default"](matched.value).mul(new _bn["default"](10).pow(new _bn["default"](api.registry.chainDecimals[0])));
                          call = api.tx.balances.transferKeepAlive(to, value);
                          _context10.next = 6;
                          return signCallUsing(control, call, matched.from);

                        case 6:
                          console.log("Finished send");

                        case 7:
                        case "end":
                          return _context10.stop();
                      }
                    }
                  }, _callee10);
                }));

                function handle(_x14) {
                  return _handle9.apply(this, arguments);
                }

                return handle;
              }()
            }, {
              command: "exit",
              handle: function () {
                var _handle10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(matched) {
                  return regeneratorRuntime.wrap(function _callee11$(_context11) {
                    while (1) {
                      switch (_context11.prev = _context11.next) {
                        case 0:
                          console.log();
                          process.exit(0);

                        case 2:
                        case "end":
                          return _context11.stop();
                      }
                    }
                  }, _callee11);
                }));

                function handle(_x15) {
                  return _handle10.apply(this, arguments);
                }

                return handle;
              }()
            }]);

          case 3:
          case "end":
            return _context12.stop();
        }
      }
    }, _callee12);
  }));
  return _processCommand.apply(this, arguments);
}

;

function main() {
  return _main.apply(this, arguments);
}

function _main() {
  _main = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13() {
    var argv, db, _config$networkName, networkName, networkId, api, keyring, control, input, _argv;

    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            argv = (0, _yargsParser["default"])(process.argv.slice(2));

            if (!(argv["_"][0] === "create")) {
              _context13.next = 12;
              break;
            }

            console.log("Creating a new vault.");
            _context13.next = 5;
            return _serverline["default"].question("Enter the network name: ");

          case 5:
            networkName = _context13.sent;
            networkId = (_config$networkName = _config["default"][networkName]) === null || _config$networkName === void 0 ? void 0 : _config$networkName.networkId;

            if (networkId) {
              _context13.next = 9;
              break;
            }

            throw new Error("Unknown network");

          case 9:
            db = _db.Db.create(argv["_"][1], {
              networkId: networkId,
              networkName: networkName
            });
            _context13.next = 13;
            break;

          case 12:
            if (argv["_"][0] === "open") {
              db = _db.Db.open(argv["_"][1]);
            }

          case 13:
            _context13.next = 15;
            return (0, _api.create)(db.networkName);

          case 15:
            api = _context13.sent;
            keyring = new _keyring["default"]();
            control = {
              api: api,
              keyring: keyring,
              db: db
            };

          case 18:
            if (!true) {
              _context13.next = 33;
              break;
            }

            _context13.next = 21;
            return _serverline["default"].prompt();

          case 21:
            input = _context13.sent;
            _argv = (0, _yargsParser["default"])(input);
            _context13.prev = 23;
            _context13.next = 26;
            return processCommand(control, _argv);

          case 26:
            _context13.next = 31;
            break;

          case 28:
            _context13.prev = 28;
            _context13.t0 = _context13["catch"](23);
            console.log(_context13.t0.message);

          case 31:
            _context13.next = 18;
            break;

          case 33:
          case "end":
            return _context13.stop();
        }
      }
    }, _callee13, null, [[23, 28]]);
  }));
  return _main.apply(this, arguments);
}

;
main();
