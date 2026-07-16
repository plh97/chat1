const puppeteer = require("puppeteer");

const func = require("./lhci-auth.cjs");

(async () => {
  const browser = await puppeteer.launch({ headless: true, slowMo: 50 });

  await func(browser);
})();
