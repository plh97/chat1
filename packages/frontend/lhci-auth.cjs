module.exports = async (browser) => {
  const page = await browser.newPage();
  const baseUrl = "http://localhost:4173";
  const email = "admin@gmail.com";
  const password = "123456";

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });

  await page.click('input[name="username"]', { clickCount: 3 });
  await page.type('input[name="username"]', email);
  await page.click('input[name="current-password"]', { clickCount: 3 });
  await page.type('input[name="current-password"]', password);

  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => Boolean(localStorage.getItem("accessToken")),
    { timeout: 20000 }
  );

  await page.close();
};
