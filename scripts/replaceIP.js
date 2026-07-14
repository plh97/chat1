var fs = require("fs");

const filePath = process.argv[2];
const ip = process.argv[3];
const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

try {
  const data = fs.readFileSync(filePath, "utf8");
  const result = data.replace(ipRegex, ip);

  fs.writeFileSync(filePath, result, "utf8");
} catch (err) {
  console.log(err);
  process.exit(1);
}
