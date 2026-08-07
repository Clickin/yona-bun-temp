import base from "./web-test-runner.config.mjs";

export default {
  ...base,
  testFramework: { config: { timeout: 30000, grep: process.env.WTR_GREP ?? "" } },
};
