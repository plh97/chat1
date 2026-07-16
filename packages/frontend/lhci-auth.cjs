module.exports = async (browser) => {
  const page = await browser.newPage();
  const baseUrl = "http://localhost:4173";
  const email = "admin@gmail.com";
  const password = "123456";

  console.log("Navigating to login...");
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  
  console.log("Waiting for username input...");
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });

  console.log("Typing credentials...");
  await page.click('input[name="username"]', { clickCount: 3 });
  await page.type('input[name="username"]', email);
  
  await page.click('input[name="current-password"]', { clickCount: 3 });
  await page.type('input[name="current-password"]', password);

  console.log("Submitting...");
  await Promise.all([
    page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/v1/login") &&
        (resp.status() === 200 || resp.status() === 304),
      { timeout: 30000 }
    ),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForFunction(
    () => Boolean(localStorage.getItem("accessToken")),
    { timeout: 45000 }
  );

  console.log("Success! Access token found.");
  await page.close();
};
