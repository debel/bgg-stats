import process from 'process';

const commands = {};

function parseCommand(input) {
  const cmd = commands[input[2]];

  if (!cmd) {
    throw new Error(`Unknown command ${cmd}`);
  }

  return cmd;
}

function parseArgs(input) {
  return input.reduce((result, arg) => {
    const [argName, argValue] = arg.split('=');

    result[argName] = argValue;

    return result;
  }, {});
}

function ensureRequired(expected, args) {
  Object.entries(expected).forEach(([expName, expOptions]) => {
    if (expOptions.required === true && !Object.hasOwn(args, expName)) {
      throw new Error(`Argument ${expName} is required`);
    }
  });
}

function normalizeArgs(expected, args) {
  return Object.entries(args).reduce((result, [argName, argValue]) => {
    let value = argValue;

    if (Object.hasOwn(expected, argName)) {
      if (!argValue) {
        if (argValue !== undefined && expected[argName] && Object.hasOwn(expected[argName], 'default')) {
          value = expected[argName].default;
        } else {
          // bare argument e.g. --statsOnly
          value = true;
        }
      }

      result[expected[argName].name] = value;
    } else {
      console.warn(`Ignoring unexpected argument ${argName}`)
    }

    return result;
  }, {});
}

const commandPrototype = {
  description(desc) {
    this.description = desc;
    return this;
  },
  arg(options) {
    if (!this.args) {
      this.args = {};
    }

    this.args[`--${options.name}`] = options;
    return this;
  },
  do(action) {
    this.action = action;
    return this;
  },
}

export default {
  command(name) {
    const c = Object.create(commandPrototype);
    c.name = name;
    commands[name] = c;
    return c;
  },
  execute() {
    const cmd = parseCommand(process.argv);
    const passedArgs = parseArgs(process.argv.slice(3));

    ensureRequired(cmd.args, passedArgs);

    const args = normalizeArgs(cmd.args, passedArgs);

    (cmd.action || (() => { }))(args);
  }
};