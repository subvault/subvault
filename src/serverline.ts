// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang
// Copyright (c) 2020 A-312

import EventEmitter from "events";
import readline from "readline";
import stream from "stream";
import util from "util";

const myEmitter = new EventEmitter();

let rl: any;
let stdoutMuted = false;
let myPrompt = "> ";
let completions: string[] = [];
let promptResolves: any = [];

const collection = {
  stdout: new stream.Writable(),
  stderr: new stream.Writable()
};

function Serverline() {
  return {
    init: init,
    secret: secret,
    prompt: prompt,
    question: question,
    getPrompt: function() {
      return myPrompt;
    },
    setPrompt: function(strPrompt: string) {
      myPrompt = strPrompt;
      rl.setPrompt(myPrompt);
    },
    isMuted: function() {
      return stdoutMuted;
    },
    setMuted: setMuted,
    setCompletion: function(obj: any) {
      completions = (typeof obj === "object") ? obj : completions;
    },
    getHistory: function() {
      return (rl.terminal) ? rl.history : [];
    },
    setHistory: function(history: any) {
      if (rl.terminal && Array.isArray(history)) {
        rl.history = history;
        return true;
      }
      return !!rl.terminal;
    },
    getCollection: function() {
      return {
        stdout: collection.stdout,
        stderr: collection.stderr
      };
    },
    getRL: function() {
      return rl;
    },
    close: function() {
      rl.close();
    },
    pause: function() {
      rl.pause();
    },
    resume: function() {
      rl.resume();
    },
    on: function(eventName: string, listener: (...args: any[]) => void) {
      switch (eventName) {
      case "line":
      case "SIGINT":
      case "completer":
        return myEmitter.on(eventName, listener);
      }

      rl.on(eventName, listener);
    },
    _debugModuleSupport: function(debug: any, ...args: any[]) {
      debug.log = function log() {
        console.log(util.format(...args).toString());
      };
    }
  };
}

export default Serverline();

let fixSIGINTonQuestion = false;

function beforeTheLastLine(chunk: any) {
  const nbline = Math.ceil((rl.line.length + rl._prompt.length + 1) / rl.columns);

  let text = "";
  text += "\n\r\x1B[" + nbline + "A\x1B[0J";
  text += chunk.toString();
  text += Array(nbline).join("\n");

  return Buffer.from(text, "utf8");
}

function init(options: any) {
  if (typeof options === "string") {
    options = { prompt: options }; // eslint-disable-line no-param-reassign
  }

  const slOptions = Object.assign({}, {
    prompt: "> "
  }, options);

  if (slOptions.forceTerminalContext) {
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;
  }

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: completer,
    prompt: slOptions.prompt
  });

  if (!rl.terminal) {
    console.warn("WARN: Compatibility mode! The current context is not a terminal. This may " +
      "occur when you redirect terminal output into a file.");
    console.warn("You can try to define `options.forceTerminalContext = true`.");
  }

  const consoleOptions: any = {};

  (["colorMode", "inspectOptions", "ignoreErrors"]).forEach((val) => {
    if (typeof slOptions[val] !== "undefined") {
      consoleOptions[val] = slOptions[val];
    }
  });

  consoleOverwrite(consoleOptions);
  hiddenOverwrite();

  rl.on("line", function(line: any) {
    if (!stdoutMuted && rl.history && rl.terminal) {
      rl.history.push(line);
    }
    myEmitter.emit("line", line);
    for (const resolve of promptResolves) {
      resolve(line);
    }
    promptResolves = [];
    if (rl.terminal) {
      rl.prompt();
    }
  });
  rl.on("SIGINT", function() {
    fixSIGINTonQuestion = !!rl._questionCallback;
    if (rl.terminal) {
      rl.line = "";
    }
    if (!myEmitter.emit("SIGINT", rl)) {
      console.log();
      process.exit(0);
    }
  });
  rl.prompt();

  rl.input.on("data", function(char: any) { // fix CTRL+C on question
    if (char === "\u0003" && fixSIGINTonQuestion) {
      rl._onLine("");
      rl._refreshLine();
    }
    fixSIGINTonQuestion = false;
  });

  setMuted(true, null);
}

function setMuted(enabled: boolean, msg: any) {
  stdoutMuted = !!enabled;

  const message = (msg && typeof msg === "string") ? msg : "";
  rl.setPrompt((!stdoutMuted) ? myPrompt : message);
  return stdoutMuted;
}

function secret(query: any): Promise<string> {
  const toggleAfterAnswer = !stdoutMuted;
  stdoutMuted = true;
  const promise = new Promise((resolve, reject) => {
    rl.question(query, (value: any) => {
      if (rl.terminal) {
        rl.history = rl.history.slice(1);
      }
  
      if (toggleAfterAnswer) {
        stdoutMuted = false;
      }
  
      resolve(value);
    });
  });

  return promise as Promise<string>;
}

function prompt(): Promise<string> {
  let promise = new Promise((resolve, reject) => {
    setMuted(false, null);
    promptResolves.push((input: any) => {
      setMuted(true, null);
      resolve(input);
    });
  });

  return promise as Promise<string>;
}

function question(query: any): Promise<string> {
  const promise = new Promise((resolve, reject) => {
    setMuted(false, null);
    rl.question(query, (value: any) => {
      setMuted(true, null);
      resolve(value);
    });
  });

  return promise as Promise<string>;
}

function hiddenOverwrite() {
  rl._refreshLine = (function(refresh) {
    // https://github.com/nodejs/node/blob/v10.0.0/lib/readline.js#L326 && ./v9.5.0/lib/readline.js#L335
    return function _refreshLine() {
      let abc;
      if (stdoutMuted && rl.line) {
        abc = rl.line;
        rl.line = "";
      }

      refresh.call(rl);

      if (stdoutMuted && rl.line) {
        rl.line = abc;
      }
    };
  })(rl._refreshLine);

  rl._writeToOutput = (function(write) {
    // https://github.com/nodejs/node/blob/v10.0.0/lib/readline.js#L289 && ./v9.5.0/lib/readline.js#L442
    return function _writeToOutput(argStringToWrite: any) {
      let stringToWrite = argStringToWrite;

      if (!stdoutMuted) {
        stringToWrite = argStringToWrite;
      } else if (rl.terminal) { // muted && terminal
        stringToWrite = "\x1B[2K\x1B[200D" + rl._prompt + "[" + ((rl.line.length % 2 === 1) ? "=-" : "-=") + "]";
      } else { // muted && terminal == false
        stringToWrite = "";
      }

      write.call(rl, stringToWrite);
    };
  })(rl._writeToOutput);
}

function consoleOverwrite(options: any) {
  const original = {
    stdout: process.stdout,
    stderr: process.stderr
  };

  (Object.keys(collection) as ("stdout" | "stderr")[]).forEach((name: "stdout" | "stderr") => {
    collection[name]._write = function(chunk: any, encoding: any, callback: any) {
      // https://github.com/nodejs/node/blob/v10.0.0/lib/readline.js#L178
      if (rl.terminal) {
        original[name].write(beforeTheLastLine(chunk), encoding, () => {
          rl._refreshLine();
          callback();
        });
      } else {
        original[name].write(chunk, encoding, callback);
      }
    };
  });

  const Console = console.Console;
  const consoleOptions = Object.assign({}, {
    stdout: collection.stdout,
    stderr: collection.stderr
  }, options);
  console = new Console(consoleOptions); // eslint-disable-line no-global-assign
  console.Console = Console;
}

function completer(line: any) {
  let hits = completions.filter(function(c) {
    return c.indexOf(line) === 0;
  });

  const arg = {
    line: line,
    hits: hits
  };

  myEmitter.emit("completer", arg);

  hits = arg.hits;
  if (hits.length === 1) {
    return [hits, line];
  } else {
    console.log("\x1B[96mSuggest:\x1B[00m");

    let list = "";
    let l = 0;
    let c = "";
    const t = hits.length ? hits : completions;

    for (let i = 0; i < t.length; i++) {
      c = t[i].replace(/(\s*)$/g, "");

      if (list !== "") {
        list += ", ";
      }

      if (((list + c).length + 4 - l) > process.stdout.columns) {
        list += "\n";
        l = list.length;
      }
      list += c;
    }
    console.log("\x1B[96m" + list + "\x1B[00m");
    return [(line !== arg.line) ? [arg.line] : [], line];
  }
}
