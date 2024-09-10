var fs = require("fs");

const filePath = process.argv[2];
const ip = process.argv[3];
const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

fs.readFile(filePath, "utf8", function (err, data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(ipRegex, ip);

  fs.writeFile(filePath, result, "utf8", function (err) {
    if (err) return console.log(err);
  });
});
