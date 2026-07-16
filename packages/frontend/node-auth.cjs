const puppeteer = require("puppeteer");

const func = require("./lhci-auth.cjs");

(async () => {
  const browser = await puppeteer.launch();

  await func(browser);
  await browser.close();
})();
